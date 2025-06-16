import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { beforeEach, afterEach, describe, it, expect, vi, Mock } from 'vitest';
import rateLimitPlugin from '../rate-limit.plugin';
import authPlugin from '../auth.plugin';
import {
  IRateLimitService,
  RateLimitResult,
} from '@/domain/api/interfaces/rate-limit-service.interface';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { IJWTService } from '@/application/interfaces/jwt.service.interface';
import { IUserRepository } from '@/domain/auth/interfaces/user-repository.interface';
import { Result } from '@/domain/shared/result';

describe('Rate Limit Plugin', () => {
  let fastify: FastifyInstance;
  let mockRateLimitService: {
    checkLimit: Mock;
    recordUsage: Mock;
    getUsageStatus: Mock;
    resetLimit: Mock;
  };
  let mockJwtService: {
    verifyAccessToken: Mock;
  };
  let mockUserRepository: {
    findById: Mock;
  };

  const createMockUser = (tier: string = 'TIER1'): AuthenticatedUser => {
    const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000'); // Valid UUID
    if (userIdResult.isFailure) throw new Error('Invalid user ID');
    const userId = userIdResult.getValue();
    const userTierResult = UserTier.create(tier.toUpperCase() as any);
    if (userTierResult.isFailure) throw new Error(`Invalid tier: ${tier}`);
    const userTier = userTierResult.getValue();
    return new AuthenticatedUser(userId, userTier);
  };

  beforeEach(async () => {
    container.reset();

    // Mock services
    mockRateLimitService = {
      checkLimit: vi.fn(),
      recordUsage: vi.fn(),
      getUsageStatus: vi.fn(),
      resetLimit: vi.fn(),
    };

    mockJwtService = {
      verifyAccessToken: vi.fn(),
    };

    mockUserRepository = {
      findById: vi.fn(),
    };

    // Mock EnvConfig for error-mapper
    const mockEnvConfig = {
      API_BASE_URL: 'https://api.example.com',
      NODE_ENV: 'test',
    };

    // Register mocks
    container.register(DI_TOKENS.EnvConfig, {
      useValue: mockEnvConfig,
    });
    container.register(DI_TOKENS.RateLimitService, {
      useValue: mockRateLimitService,
    });
    container.register(DI_TOKENS.JwtService, {
      useValue: mockJwtService,
    });
    container.register(DI_TOKENS.UserRepository, {
      useValue: mockUserRepository,
    });

    // Create Fastify instance
    fastify = Fastify({
      logger: false,
    });

    // Register plugins
    await fastify.register(authPlugin);
    await fastify.register(rateLimitPlugin);

    // Test route with authenticate and rate limit as hooks
    fastify.get(
      '/api/test',
      {
        preHandler: [fastify.authenticate, fastify.checkRateLimit],
      },
      async (request) => {
        // Debug log to confirm user is set
        if (request.user) {
          console.log('Route handler - user is set:', request.user.userId.value);
        } else {
          console.log('Route handler - user is NOT set');
        }
        return { data: 'test' };
      },
    );

    // Public route (no auth)
    fastify.get('/health', async () => ({ status: 'ok' }));
  });

  afterEach(async () => {
    await fastify.close();
    vi.clearAllMocks();
  });

  describe('Rate limit checking', () => {
    it('should allow requests within rate limit', async () => {
      // Test will create user from JWT token

      // Mock JWT validation
      mockJwtService.verifyAccessToken.mockResolvedValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          tier: 'TIER1',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );

      // Mock rate limit check
      const rateLimitResult: RateLimitResult = {
        allowed: true,
        limit: 60,
        remaining: 59,
        resetAt: Math.floor(Date.now() / 1000) + 60,
        retryAfter: 0,
      };
      mockRateLimitService.checkLimit.mockResolvedValue(rateLimitResult);
      mockRateLimitService.recordUsage.mockResolvedValue(undefined);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/test',
        headers: {
          authorization: 'Bearer valid.token',
        },
      });

      console.log('Response status:', response.statusCode);
      console.log('Response headers:', response.headers);
      console.log('Response body:', response.body);
      console.log('CheckLimit called?', mockRateLimitService.checkLimit.mock.calls.length);

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBe('60');
      expect(response.headers['x-ratelimit-remaining']).toBe('59');
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
      expect(mockRateLimitService.checkLimit).toHaveBeenCalled();
      expect(mockRateLimitService.recordUsage).toHaveBeenCalled();
    });

    it('should return 429 when rate limit exceeded', async () => {
      // Mock JWT validation
      mockJwtService.verifyAccessToken.mockResolvedValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          tier: 'TIER1',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );

      // Mock rate limit exceeded
      const rateLimitResult: RateLimitResult = {
        allowed: false,
        limit: 60,
        remaining: 0,
        resetAt: Math.floor(Date.now() / 1000) + 60,
        retryAfter: 60,
      };
      mockRateLimitService.checkLimit.mockResolvedValue(rateLimitResult);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/test',
        headers: {
          authorization: 'Bearer valid.token',
        },
      });

      expect(response.statusCode).toBe(429);
      expect(response.headers['retry-after']).toBe('60');
      expect(response.headers['x-ratelimit-limit']).toBe('60');
      expect(response.headers['x-ratelimit-remaining']).toBe('0');

      const body = JSON.parse(response.body);
      expect(body.type).toContain('errors/rate-limit-exceeded');
      expect(body.status).toBe(429);
      expect(mockRateLimitService.recordUsage).not.toHaveBeenCalled();
    });

    it('should add warning header when usage is high', async () => {
      // Mock JWT validation
      mockJwtService.verifyAccessToken.mockResolvedValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          tier: 'TIER1',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );

      // Mock high usage (80%)
      const rateLimitResult: RateLimitResult = {
        allowed: true,
        limit: 100,
        remaining: 20,
        resetAt: Math.floor(Date.now() / 1000) + 60,
        retryAfter: 0,
      };
      mockRateLimitService.checkLimit.mockResolvedValue(rateLimitResult);
      mockRateLimitService.recordUsage.mockResolvedValue(undefined);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/test',
        headers: {
          authorization: 'Bearer valid.token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-ratelimit-warning']).toBe('80% of rate limit used');
    });

    it('should skip rate limiting for excluded paths', async () => {
      // No auth needed for health endpoint
      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(mockRateLimitService.checkLimit).not.toHaveBeenCalled();
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
    });

    it('should handle rate limit service errors gracefully', async () => {
      // Mock JWT validation
      mockJwtService.verifyAccessToken.mockResolvedValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          tier: 'TIER1',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );

      // Mock rate limit service error
      mockRateLimitService.checkLimit.mockRejectedValue(new Error('Service unavailable'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/test',
        headers: {
          authorization: 'Bearer valid.token',
        },
      });

      // Should allow request (fail open)
      expect(response.statusCode).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBe('60'); // Default tier1 limit
      expect(response.headers['x-ratelimit-remaining']).toBe('unknown');
    });

    it('should only record usage for successful responses', async () => {
      // Mock JWT validation
      mockJwtService.verifyAccessToken.mockResolvedValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          tier: 'TIER1',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );

      // Mock rate limit check
      const rateLimitResult: RateLimitResult = {
        allowed: true,
        limit: 60,
        remaining: 59,
        resetAt: Math.floor(Date.now() / 1000) + 60,
        retryAfter: 0,
      };
      mockRateLimitService.checkLimit.mockResolvedValue(rateLimitResult);
      mockRateLimitService.recordUsage.mockResolvedValue(undefined);

      // Add a route that returns an error
      fastify.get(
        '/api/error',
        {
          preHandler: [fastify.authenticate, fastify.checkRateLimit],
        },
        async (request, reply) => {
          return reply.code(400).send({ error: 'Bad request' });
        },
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/error',
        headers: {
          authorization: 'Bearer valid.token',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(mockRateLimitService.checkLimit).toHaveBeenCalled();
      expect(mockRateLimitService.recordUsage).not.toHaveBeenCalled();
    });
  });

  describe('Custom options', () => {
    it('should respect custom exclude paths', async () => {
      // Create new instance with custom options
      const customFastify = Fastify({ logger: false });

      await customFastify.register(authPlugin);
      await customFastify.register(rateLimitPlugin, {
        excludePaths: ['/api/public'],
      });

      customFastify.get('/api/public', async () => ({ data: 'public' }));

      const response = await customFastify.inject({
        method: 'GET',
        url: '/api/public',
      });

      expect(response.statusCode).toBe(200);
      expect(mockRateLimitService.checkLimit).not.toHaveBeenCalled();

      await customFastify.close();
    });

    it('should respect custom exclude patterns', async () => {
      // Create new instance with custom options
      const customFastify = Fastify({ logger: false });

      await customFastify.register(authPlugin);
      await customFastify.register(rateLimitPlugin, {
        excludePatterns: [/^\/api\/v\d+\/public\//],
      });

      customFastify.get('/api/v1/public/data', async () => ({ data: 'public' }));

      const response = await customFastify.inject({
        method: 'GET',
        url: '/api/v1/public/data',
      });

      expect(response.statusCode).toBe(200);
      expect(mockRateLimitService.checkLimit).not.toHaveBeenCalled();

      await customFastify.close();
    });

    it('should allow disabling headers', async () => {
      // Create new instance with headers disabled
      const customFastify = Fastify({ logger: false });

      await customFastify.register(authPlugin);
      await customFastify.register(rateLimitPlugin, {
        includeHeaders: false,
      });

      customFastify.get(
        '/api/test',
        {
          preHandler: [customFastify.authenticate, customFastify.checkRateLimit],
        },
        async () => ({ data: 'test' }),
      );

      // Mock JWT validation
      mockJwtService.verifyAccessToken.mockResolvedValue(
        Result.ok({
          sub: '550e8400-e29b-41d4-a716-446655440000',
          tier: 'TIER1',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );

      // Mock rate limit check
      const rateLimitResult: RateLimitResult = {
        allowed: true,
        limit: 60,
        remaining: 59,
        resetAt: Math.floor(Date.now() / 1000) + 60,
        retryAfter: 0,
      };
      mockRateLimitService.checkLimit.mockResolvedValue(rateLimitResult);

      const response = await customFastify.inject({
        method: 'GET',
        url: '/api/test',
        headers: {
          authorization: 'Bearer valid.token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
      expect(response.headers['x-ratelimit-remaining']).toBeUndefined();

      await customFastify.close();
    });
  });
});
