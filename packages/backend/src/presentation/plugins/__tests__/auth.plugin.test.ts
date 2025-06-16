import { describe, it, expect, beforeEach, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import authPlugin from '../auth.plugin';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Result } from '@/domain/shared/result';
import { IJWTService } from '@/application/interfaces/jwt.service.interface';
import { IUserRepository } from '@/domain/auth/interfaces/user-repository.interface';
import { User } from '@/domain/auth/entities/user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { setupTestDI } from '@/infrastructure/di/container';

describe('Auth Plugin', () => {
  let app: FastifyInstance;
  let mockJWTService: IJWTService;
  let mockUserRepository: IUserRepository;

  beforeEach(async () => {
    // Setup test DI container
    setupTestDI();

    // Create mocks
    mockJWTService = {
      generateAccessToken: vi.fn(),
      generateRefreshToken: vi.fn(),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
      decodeToken: vi.fn(),
    };

    mockUserRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
    };

    // Register mocks
    container.register(DI_TOKENS.JwtService, { useValue: mockJWTService });
    container.register(DI_TOKENS.UserRepository, { useValue: mockUserRepository });

    // Create Fastify app
    app = fastify({ logger: false });
    await app.register(authPlugin);

    // Add test routes
    app.get('/public', async () => ({ message: 'public' }));

    app.get(
      '/protected',
      {
        preHandler: [app.authenticate],
      },
      async (request) => ({
        message: 'protected',
        userId: request.user?.userId.value,
        tier: request.user?.tier.level.toLowerCase(),
      }),
    );
  });

  describe('Public routes', () => {
    it('should allow access without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/public',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ message: 'public' });
    });
  });

  describe('Protected routes', () => {
    it('should require authentication header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/protected',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Authentication required');
      expect(body.detail).toBe('Missing authorization header');
    });

    it('should require Bearer scheme', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Basic dXNlcjpwYXNz',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Invalid authorization format');
      expect(body.detail).toBe('Authorization header must use Bearer scheme');
    });

    it('should verify token', async () => {
      vi.mocked(mockJWTService.verifyAccessToken).mockResolvedValueOnce(
        Result.fail('Invalid token'),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Invalid token');
      expect(body.detail).toBe('Invalid token');
      expect(mockJWTService.verifyAccessToken).toHaveBeenCalledWith('invalid-token');
    });

    it('should authenticate valid token with tier from token', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      vi.mocked(mockJWTService.verifyAccessToken).mockResolvedValueOnce(
        Result.ok({
          sub: userId,
          tier: 'tier2',
          type: 'access',
        }),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('protected');
      expect(body.userId).toBe(userId);
      expect(body.tier).toBe('tier2');
    });

    it.skip('should authenticate valid token and fetch tier from user repository', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      vi.mocked(mockJWTService.verifyAccessToken).mockResolvedValueOnce(
        Result.ok({
          sub: userId,
          type: 'access',
        }),
      );

      const userIdObj = UserId.create(userId).getValue();
      const userTier = UserTier.create(TierLevel.TIER3).getValue();
      const email = await import('@/domain/auth/value-objects/email').then((m) =>
        m.Email.create('test@example.com').getValue(),
      );
      const user = User.create({
        id: userIdObj,
        email,
        tier: userTier,
      }).getValue();

      vi.mocked(mockUserRepository.findById).mockResolvedValueOnce(Result.ok(user));

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.userId).toBe(userId);
      expect(body.tier).toBe('tier3');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(
        expect.objectContaining({
          _value: userId,
        }),
      );
    });

    it('should use default tier when user not found', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      vi.mocked(mockJWTService.verifyAccessToken).mockResolvedValueOnce(
        Result.ok({
          sub: userId,
          type: 'access',
        }),
      );

      vi.mocked(mockUserRepository.findById).mockResolvedValueOnce(Result.ok(null));

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.userId).toBe(userId);
      expect(body.tier).toBe('tier1'); // Default tier
    });

    it('should handle invalid user ID in token', async () => {
      vi.mocked(mockJWTService.verifyAccessToken).mockResolvedValueOnce(
        Result.ok({
          sub: 'invalid-uuid',
          type: 'access',
        }),
      );

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Invalid user ID');
      expect(body.detail).toBe('Token contains invalid user ID');
    });

    it('should handle authentication errors', async () => {
      vi.mocked(mockJWTService.verifyAccessToken).mockRejectedValueOnce(new Error('Service error'));

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Authentication error');
      expect(body.detail).toBe('An error occurred during authentication');
    });
  });

  describe('Exclude paths', () => {
    it('should exclude specified paths from authentication', async () => {
      // Register plugin with exclude paths
      const appWithExcludes = fastify({ logger: false });
      await appWithExcludes.register(authPlugin, {
        excludePaths: ['/health', '/api-docs/*'],
      });

      appWithExcludes.get(
        '/health',
        {
          preHandler: [appWithExcludes.authenticate],
        },
        async () => ({ status: 'ok' }),
      );

      appWithExcludes.get(
        '/api-docs/swagger',
        {
          preHandler: [appWithExcludes.authenticate],
        },
        async () => ({ docs: 'swagger' }),
      );

      appWithExcludes.get(
        '/api-docs/scalar',
        {
          preHandler: [appWithExcludes.authenticate],
        },
        async () => ({ docs: 'scalar' }),
      );

      // Health check should not require auth
      const healthResponse = await appWithExcludes.inject({
        method: 'GET',
        url: '/health',
      });
      expect(healthResponse.statusCode).toBe(200);

      // API docs should not require auth
      const swaggerResponse = await appWithExcludes.inject({
        method: 'GET',
        url: '/api-docs/swagger',
      });
      expect(swaggerResponse.statusCode).toBe(200);

      const scalarResponse = await appWithExcludes.inject({
        method: 'GET',
        url: '/api-docs/scalar',
      });
      expect(scalarResponse.statusCode).toBe(200);
    });
  });
});
