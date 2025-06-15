import { describe, it, expect, beforeEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { AuthenticationUseCase } from '../authentication.use-case';
import { setupDependencies, createMockUser } from '../../__tests__/test-utils';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { AuthenticationService } from '@/domain/auth/services/authentication.service';
import { Result } from '@/domain/errors';
import { Email } from '@/domain/auth/value-objects/email';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { AuthenticationFailed } from '@/domain/auth/events/authentication-failed.event';
import { TokenRefreshed } from '@/domain/auth/events/token-refreshed.event';
import { UserLoggedOut } from '@/domain/auth/events/user-logged-out.event';

describe('AuthenticationUseCase Integration', () => {
  let useCase: AuthenticationUseCase;
  let mockDependencies: any;

  beforeEach(() => {
    container.reset();
    mockDependencies = setupDependencies();
    useCase = container.resolve(AuthenticationUseCase);
  });

  describe('validateToken', () => {
    it('should validate token and return user information', async () => {
      const mockToken = 'valid-jwt-token';
      
      // Mock JWT validation
      mockDependencies.mockJWTValidator.validateToken.mockResolvedValue(
        Result.ok({ valid: true, claims: { sub: 'user-123' } })
      );

      // Mock auth adapter verification
      mockDependencies.mockAuthAdapter.verifyToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        tier: 'TIER1',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
        jti: 'token-123',
      });

      // Mock auth service validation - return AuthenticatedUser
      const userId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID v4
      const userIdResult = UserId.create(userId);
      const userTierResult = UserTier.create('TIER1');
      
      if (userIdResult.isFailure) {
        console.error('UserId creation failed:', userIdResult.getError());
        throw new Error('Failed to create UserId');
      }
      if (userTierResult.isFailure) {
        console.error('UserTier creation failed:', userTierResult.getError());
        throw new Error('Failed to create UserTier');
      }
      
      const authenticatedUser = new AuthenticatedUser(
        userIdResult.getValue(),
        userTierResult.getValue()
      );
      
      mockDependencies.mockAuthenticationService.validateToken.mockReturnValue(
        Result.ok(authenticatedUser)
      );

      const result = await useCase.validateToken(mockToken);

      expect(result.success).toBe(true);
      const validationResult = result.data;
      expect(validationResult.user).toBeDefined();
      expect(validationResult.user?.userId.value).toBe(userId);
      expect(validationResult.user?.email.value).toBe('test@example.com');
      expect(validationResult.user?.tier.level).toBe('tier1');
      expect(validationResult.tokenId).toBe('token-123');

      // Verify auth service was called
      expect(mockDependencies.mockAuthenticationService.validateToken).toHaveBeenCalled();
    });

    it('should handle invalid token format', async () => {
      const mockToken = 'invalid-token';

      mockDependencies.mockJWTValidator.validateToken.mockResolvedValue(
        Result.fail({ message: 'Invalid JWT format' })
      );

      const result = await useCase.validateToken(mockToken);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_TOKEN_FORMAT');
      expect(result.error.type).toBe('VALIDATION');
    });

    it('should handle expired token', async () => {
      const mockToken = 'expired-token';

      mockDependencies.mockJWTValidator.validateToken.mockResolvedValue(
        Result.ok({ valid: true, claims: { sub: 'user-123' } })
      );

      mockDependencies.mockAuthAdapter.verifyToken.mockResolvedValue(null);

      const result = await useCase.validateToken(mockToken);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('TOKEN_VERIFICATION_FAILED');

      // Verify authentication failed event was published
      expect(mockDependencies.mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(AuthenticationFailed)
      );
    });

    it('should handle token validation failure', async () => {
      mockDependencies.mockJWTValidator.validateToken.mockResolvedValue(
        Result.ok({ valid: true, claims: { sub: 'user-123' } })
      );

      mockDependencies.mockAuthAdapter.verifyToken.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        tier: 'TIER1',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      mockDependencies.mockAuthenticationService.validateToken.mockReturnValue(
        Result.fail({ message: 'User not found' })
      );

      const result = await useCase.validateToken('token');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('TOKEN_VALIDATION_FAILED');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockRefreshToken = 'refresh-token';
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      mockDependencies.mockAuthAdapter.refreshAccessToken.mockResolvedValue({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: 3600,
        user: {
          id: '550e8400-e29b-41d4-a716-446655440003', // Valid UUID v4
          email: 'test@example.com',
          app_metadata: { tier: 'TIER1' },
        },
      });

      // Mock JWT decode
      mockDependencies.mockJWTValidator.decodeToken = vi.fn().mockReturnValue({
        jti: 'new-token-id',
      });

      const result = await useCase.refreshToken(mockRefreshToken);

      expect(result.success).toBe(true);
      const refreshResult = result.data;
      expect(refreshResult.accessToken).toBe(newAccessToken);
      expect(refreshResult.refreshToken).toBe(newRefreshToken);
      expect(refreshResult.expiresIn).toBe(3600);
      expect(refreshResult.userId).toBe('550e8400-e29b-41d4-a716-446655440003');
      expect(refreshResult.tier).toBe('TIER1');

      // Verify token refreshed event was published
      expect(mockDependencies.mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(TokenRefreshed)
      );
    });

    it('should handle refresh token failure', async () => {
      const mockRefreshToken = 'invalid-refresh-token';

      mockDependencies.mockAuthAdapter.refreshAccessToken.mockResolvedValue(null);

      const result = await useCase.refreshToken(mockRefreshToken);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('REFRESH_TOKEN_INVALID');
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      const userId = 'user-123';

      mockDependencies.mockAuthAdapter.signOut.mockResolvedValue(undefined);

      const result = await useCase.signOut(userId);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();

      // Verify logout event was published
      expect(mockDependencies.mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(UserLoggedOut)
      );
    });

    it('should handle sign out failure', async () => {
      const userId = 'user-123';

      mockDependencies.mockAuthAdapter.signOut.mockRejectedValue(
        new Error('Sign out failed')
      );

      const result = await useCase.signOut(userId);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('cross-layer integration', () => {
    it('should coordinate between auth adapter, domain service, and events', async () => {
      const mockToken = 'valid-jwt-token';
      const userId = '550e8400-e29b-41d4-a716-446655440006'; // Valid UUID v4
      
      // Setup complex scenario
      mockDependencies.mockJWTValidator.validateToken.mockResolvedValue(
        Result.ok({ valid: true, claims: { sub: userId } })
      );

      mockDependencies.mockAuthAdapter.verifyToken.mockResolvedValue({
        sub: userId,
        email: 'test@example.com',
        tier: 'TIER1',
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: 'token-123',
      });

      const userIdResult = UserId.create(userId);
      const userTierResult = UserTier.create('TIER1');
      
      if (userIdResult.isFailure) {
        throw new Error('Failed to create UserId');
      }
      if (userTierResult.isFailure) {
        throw new Error('Failed to create UserTier');
      }
      
      const authenticatedUser = new AuthenticatedUser(
        userIdResult.getValue(),
        userTierResult.getValue()
      );

      mockDependencies.mockAuthenticationService.validateToken.mockReturnValue(
        Result.ok(authenticatedUser)
      );

      const result = await useCase.validateToken(mockToken);

      expect(result.success).toBe(true);
      
      // Verify all layers were involved
      expect(mockDependencies.mockJWTValidator.validateToken).toHaveBeenCalled();
      expect(mockDependencies.mockAuthAdapter.verifyToken).toHaveBeenCalled();
      expect(mockDependencies.mockAuthenticationService.validateToken).toHaveBeenCalled();
    });

    it('should handle errors gracefully at any layer', async () => {
      const mockToken = 'valid-jwt-token';
      const userId = '550e8400-e29b-41d4-a716-446655440007'; // Valid UUID v4
      
      mockDependencies.mockJWTValidator.validateToken.mockResolvedValue(
        Result.ok({ valid: true, claims: { sub: userId } })
      );

      // Auth adapter throws unexpected error
      mockDependencies.mockAuthAdapter.verifyToken.mockRejectedValue(
        new Error('Network error')
      );

      const result = await useCase.validateToken(mockToken);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INTERNAL_ERROR');
      
      // Verify no data was processed further
      expect(mockDependencies.mockAuthenticationService.validateToken).not.toHaveBeenCalled();
    });
  });
});