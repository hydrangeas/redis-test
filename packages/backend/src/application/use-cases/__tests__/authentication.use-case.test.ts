import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthenticationUseCase } from '../authentication.use-case';
import { IAuthAdapter } from '@/infrastructure/auth/interfaces/auth-adapter.interface';
import { AuthenticationService } from '@/domain/auth/services/authentication.service';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { Result as DomainResult } from '@/domain/shared/result';
import { TokenPayload } from '@/domain/auth/types/token-payload';
import { Session } from '@/infrastructure/auth/interfaces/auth-adapter.interface';
import type { Logger } from 'pino';

describe('AuthenticationUseCase', () => {
  let useCase: AuthenticationUseCase;
  let mockAuthAdapter: IAuthAdapter;
  let mockJWTValidator: any;
  let mockAuthService: AuthenticationService;
  let mockEventBus: IEventBus;
  let mockLogger: Logger;

  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockAuthAdapter = {
      verifyToken: vi.fn(),
      refreshAccessToken: vi.fn(),
      signOut: vi.fn(),
    };

    mockJWTValidator = {
      validateToken: vi.fn(),
    };

    mockAuthService = {
      validateToken: vi.fn(),
    } as any;

    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as any;

    useCase = new AuthenticationUseCase(
      mockAuthAdapter,
      mockJWTValidator,
      mockAuthService,
      mockEventBus,
      mockLogger,
    );
  });

  describe('validateToken', () => {
    it('should successfully validate a valid token', async () => {
      const token = 'valid.jwt.token';
      const tokenPayload: TokenPayload = {
        sub: validUuid,
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        app_metadata: { tier: 'tier2' },
        user_metadata: {},
        jti: 'token-id-123',
      };

      const authenticatedUser = new AuthenticatedUser(
        UserId.fromString(validUuid),
        UserTier.createDefault(TierLevel.TIER2),
      );

      vi.mocked(mockJWTValidator.validateToken).mockResolvedValue(
        DomainResult.ok({ sub: validUuid }),
      );
      vi.mocked(mockAuthAdapter.verifyToken).mockResolvedValue(tokenPayload);
      vi.mocked(mockAuthService.validateToken).mockReturnValue(DomainResult.ok(authenticatedUser));

      const result = await useCase.validateToken(token);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user).toBe(authenticatedUser);
        expect(result.data.tokenId).toBe('token-id-123');
      }
      expect(mockAuthAdapter.verifyToken).toHaveBeenCalledWith(token);
      expect(mockAuthService.validateToken).toHaveBeenCalledWith(tokenPayload);
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should fail for empty token', async () => {
      vi.mocked(mockJWTValidator.validateToken).mockResolvedValue(
        DomainResult.fail(new Error('Invalid token format')),
      );

      const result = await useCase.validateToken('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_TOKEN_FORMAT');
        expect(result.error.type).toBe('VALIDATION');
      }
      expect(mockAuthAdapter.verifyToken).not.toHaveBeenCalled();
    });

    it('should fail when token verification fails', async () => {
      const token = 'invalid.jwt.token';

      vi.mocked(mockJWTValidator.validateToken).mockResolvedValue(DomainResult.ok({ sub: 'test' }));
      vi.mocked(mockAuthAdapter.verifyToken).mockResolvedValue(null);

      const result = await useCase.validateToken(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TOKEN_VERIFICATION_FAILED');
        expect(result.error.type).toBe('UNAUTHORIZED');
      }
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'JWT_VERIFICATION_FAILED',
        }),
      );
    });

    it('should fail when domain validation fails', async () => {
      const token = 'valid.jwt.token';
      const tokenPayload: TokenPayload = {
        sub: validUuid,
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired
        app_metadata: { tier: 'tier1' },
        user_metadata: {},
      };

      vi.mocked(mockJWTValidator.validateToken).mockResolvedValue(
        DomainResult.ok({ sub: validUuid }),
      );
      vi.mocked(mockAuthAdapter.verifyToken).mockResolvedValue(tokenPayload);
      vi.mocked(mockAuthService.validateToken).mockReturnValue(
        DomainResult.fail(new Error('Token expired')),
      );

      const result = await useCase.validateToken(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TOKEN_VALIDATION_FAILED');
        expect(result.error.type).toBe('UNAUTHORIZED');
      }
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateId: validUuid,
          provider: validUuid,
          reason: 'Token expired',
        }),
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh a valid token', async () => {
      const refreshToken = 'valid.refresh.token';
      const session: Session = {
        access_token: 'new.access.token',
        refresh_token: 'new.refresh.token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: validUuid,
          email: 'test@example.com',
          app_metadata: { tier: 'tier2' },
          user_metadata: {},
        },
      };

      vi.mocked(mockAuthAdapter.refreshAccessToken).mockResolvedValue(session);

      const result = await useCase.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessToken).toBe('new.access.token');
        expect(result.data.refreshToken).toBe('new.refresh.token');
        expect(result.data.expiresIn).toBe(3600);
        expect(result.data.userId).toBe(validUuid);
        expect(result.data.tier).toBe('tier2');
      }
      expect(mockAuthAdapter.refreshAccessToken).toHaveBeenCalledWith(refreshToken);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateId: validUuid,
          userId: validUuid,
        }),
      );
    });

    it('should fail for empty refresh token', async () => {
      const result = await useCase.refreshToken('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_REFRESH_TOKEN_FORMAT');
        expect(result.error.type).toBe('VALIDATION');
      }
      expect(mockAuthAdapter.refreshAccessToken).not.toHaveBeenCalled();
    });

    it('should fail when refresh token is invalid', async () => {
      const refreshToken = 'invalid.refresh.token';

      vi.mocked(mockAuthAdapter.refreshAccessToken).mockResolvedValue(null);

      const result = await useCase.refreshToken(refreshToken);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('REFRESH_TOKEN_INVALID');
        expect(result.error.type).toBe('UNAUTHORIZED');
      }
    });

    it('should default to tier1 when tier is not specified', async () => {
      const refreshToken = 'valid.refresh.token';
      const session: Session = {
        access_token: 'new.access.token',
        refresh_token: 'new.refresh.token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: validUuid,
          email: 'test@example.com',
          app_metadata: {}, // No tier specified
          user_metadata: {},
        },
      };

      vi.mocked(mockAuthAdapter.refreshAccessToken).mockResolvedValue(session);

      const result = await useCase.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tier).toBe('tier1');
      }
    });
  });

  describe('signOut', () => {
    it('should successfully sign out a user', async () => {
      vi.mocked(mockAuthAdapter.signOut).mockResolvedValue(undefined);

      const result = await useCase.signOut(validUuid);

      expect(result.success).toBe(true);
      expect(mockAuthAdapter.signOut).toHaveBeenCalledWith(validUuid);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateId: validUuid,
          userId: validUuid,
          reason: 'user_initiated',
        }),
      );
    });

    it('should fail for empty user ID', async () => {
      const result = await useCase.signOut('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_USER_ID');
        expect(result.error.type).toBe('VALIDATION');
      }
      expect(mockAuthAdapter.signOut).not.toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      vi.mocked(mockAuthAdapter.signOut).mockRejectedValue(new Error('Network error'));

      const result = await useCase.signOut(validUuid);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INTERNAL_ERROR');
        expect(result.error.type).toBe('INTERNAL');
      }
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
