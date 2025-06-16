import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { buildServer } from '@/presentation/server';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { IUserRepository } from '@/domain/auth/interfaces/user-repository.interface';
import { IRateLimitUseCase } from '@/application/interfaces/rate-limit-use-case.interface';
import { Result } from '@/domain/shared/result';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { IJWTService } from '@/application/interfaces/jwt.service.interface';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { pino } from 'pino';
import { IUsageLogRepository } from '@/domain/logging/interfaces/usage-log-repository.interface';
import { IRateLimitRepository } from '@/domain/auth/interfaces/rate-limit-repository.interface';
import { IAPIAccessControlUseCase } from '@/application/interfaces/api-access-control-use-case.interface';
import { EnvConfig } from '@/infrastructure/config';
import { IAuthenticationService } from '@/application/interfaces/authentication.service.interface';
import { IFileStorage } from '@/domain/data/interfaces/file-storage.interface';
import { IDataRetrievalUseCase } from '@/application/interfaces/data-retrieval-use-case.interface';
import { DomainError } from '@/domain/errors/domain-error';

describe('Auth Routes', () => {
  let server: FastifyInstance;
  let mockUserRepository: IUserRepository;
  let mockRateLimitUseCase: IRateLimitUseCase;
  let mockJWTService: IJWTService;

  beforeEach(async () => {
    // Reset container
    container.clearInstances();

    // Create test logger
    const logger = pino({ level: 'silent' });

    // Create mocks
    mockUserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      updateLastLogin: vi.fn(),
    };

    mockRateLimitUseCase = {
      checkRateLimit: vi.fn(),
      getUserUsageStatus: vi.fn(),
      incrementUsage: vi.fn(),
      resetUserUsage: vi.fn(),
    };

    mockJWTService = {
      generateAccessToken: vi.fn().mockResolvedValue(Result.ok('mock-access-token')),
      generateRefreshToken: vi.fn().mockResolvedValue(Result.ok('mock-refresh-token')),
      verifyAccessToken: vi
        .fn()
        .mockResolvedValue(Result.fail(DomainError.unauthorized('INVALID_TOKEN', 'Invalid token'))),
      verifyRefreshToken: vi
        .fn()
        .mockResolvedValue(Result.fail(DomainError.unauthorized('INVALID_TOKEN', 'Invalid token'))),
      decodeToken: vi.fn().mockReturnValue(null),
    };

    const mockUsageLogRepository: IUsageLogRepository = {
      recordAPIAccess: vi.fn().mockResolvedValue(Result.ok(undefined)),
      getUsageStats: vi.fn(),
      recordAuthEvent: vi.fn().mockResolvedValue(Result.ok(undefined)),
      getAuthEvents: vi.fn(),
    };

    const mockRateLimitRepository: IRateLimitRepository = {
      recordAttempt: vi.fn().mockResolvedValue(Result.ok(undefined)),
      getRecentAttempts: vi.fn().mockResolvedValue(Result.ok([])),
      cleanupOldAttempts: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    const mockAuthenticationService: IAuthenticationService = {
      authenticate: vi.fn(),
      refreshToken: vi.fn(),
      logout: vi.fn(),
    };

    const mockAPIAccessControlUseCase: IAPIAccessControlUseCase = {
      checkAPIAccess: vi.fn().mockResolvedValue(
        Result.ok({
          allowed: true,
          reason: 'authenticated',
        }),
      ),
    };

    const mockFileStorage: IFileStorage = {
      readFile: vi.fn(),
      getFileMetadata: vi.fn(),
      streamFile: vi.fn(),
      cleanup: vi.fn(),
    };

    const mockDataRetrievalUseCase: IDataRetrievalUseCase = {
      getFileData: vi.fn(),
      getFileMetadata: vi.fn(),
      streamFile: vi.fn(),
    };

    const mockEnvConfig: EnvConfig = {
      NODE_ENV: 'test',
      PORT: 8000,
      HOST: '0.0.0.0',
      API_BASE_URL: 'http://localhost:8000',
      API_VERSION: '1.0.0',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      JWT_SECRET: 'test-secret',
      RATE_LIMIT_WINDOW_SECONDS: 60,
      RATE_LIMIT_MAX_REQUESTS: 60,
      ALLOWED_ORIGINS: 'http://localhost:3000',
      LOG_LEVEL: 'silent',
      ENABLE_SWAGGER: true,
      DATA_DIRECTORY: './test-data',
    };

    // Register all dependencies
    container.registerInstance(DI_TOKENS.Logger, logger);
    container.registerInstance(DI_TOKENS.UserRepository, mockUserRepository);
    container.registerInstance(DI_TOKENS.RateLimitUseCase, mockRateLimitUseCase);
    container.registerInstance(DI_TOKENS.JwtService, mockJWTService);
    container.registerInstance(DI_TOKENS.ApiLogRepository, mockUsageLogRepository);
    container.registerInstance(DI_TOKENS.RateLimitRepository, mockRateLimitRepository);
    container.registerInstance(DI_TOKENS.AuthenticationService, mockAuthenticationService);
    container.registerInstance(DI_TOKENS.APIAccessControlUseCase, mockAPIAccessControlUseCase);
    container.registerInstance(DI_TOKENS.FileStorageService, mockFileStorage);
    container.registerInstance(DI_TOKENS.DataRetrievalUseCase, mockDataRetrievalUseCase);
    container.registerInstance(DI_TOKENS.EnvConfig, mockEnvConfig);
    container.registerInstance(DI_TOKENS.DataDirectory, './test-data');

    // Build server
    server = await buildServer();
    await server.ready();
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
    vi.clearAllMocks();
  });

  describe('GET /api/auth/me', () => {
    it('should return user information for authenticated user', async () => {
      // Arrange
      const userIdResult = UserId.create('123e4567-e89b-12d3-a456-426614174000');
      const userId = userIdResult.getValue();
      const rateLimit = RateLimit.create(60, 60).getValue();
      const tierResult = UserTier.create(TierLevel.TIER1, rateLimit);
      const tier = tierResult.getValue();
      const authenticatedUser = new AuthenticatedUser(userId, tier);

      // Mock JWT verification to authenticate the user
      (mockJWTService.verifyAccessToken as any).mockResolvedValue(
        Result.ok({
          sub: userId.toString(),
          email: 'test@example.com',
          tier: 'tier1',
          provider: 'email',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );

      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      // Assert
      if (response.statusCode !== 200) {
        console.error('Response:', response.body);
      }
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('userId');
      expect(body).toHaveProperty('tier', 'TIER1');
      expect(body).toHaveProperty('rateLimit');
      expect(body.rateLimit).toEqual({
        limit: 60,
        windowSeconds: 60,
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('title');
      expect(body).toHaveProperty('status', 401);
    });
  });

  describe('GET /api/auth/usage', () => {
    it('should return usage status for authenticated user', async () => {
      // Arrange
      const userIdResult = UserId.create('123e4567-e89b-12d3-a456-426614174000');
      const userId = userIdResult.getValue();
      const rateLimit = RateLimit.create(60, 60).getValue();
      const tierResult = UserTier.create(TierLevel.TIER1, rateLimit);
      const tier = tierResult.getValue();

      // Mock JWT verification
      (mockJWTService.verifyAccessToken as any).mockResolvedValue(
        Result.ok({
          sub: userId.toString(),
          email: 'test@example.com',
          tier: 'tier1',
          provider: 'email',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );

      // Mock usage status
      const windowStart = new Date();
      const windowEnd = new Date(windowStart.getTime() + 60000);
      (mockRateLimitUseCase.getUserUsageStatus as any).mockResolvedValue(
        Result.ok({
          userId: userId.toString(),
          currentCount: 15,
          limit: 60,
          windowStart,
          windowEnd,
        }),
      );

      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/usage',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('currentUsage', 15);
      expect(body).toHaveProperty('limit', 60);
      expect(body).toHaveProperty('remaining', 45);
      expect(body).toHaveProperty('resetAt');
      expect(body).toHaveProperty('windowStart');
      expect(body).toHaveProperty('windowEnd');
    });

    it('should return 401 for unauthenticated user', async () => {
      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/usage',
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/tiers', () => {
    it('should return available tiers without authentication', async () => {
      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/tiers',
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('tiers');
      expect(Array.isArray(body.tiers)).toBe(true);
      expect(body.tiers).toHaveLength(3);

      // Check tier structure
      const tier1 = body.tiers.find((t: any) => t.level === 'tier1');
      expect(tier1).toBeDefined();
      expect(tier1).toHaveProperty('name', 'Basic');
      expect(tier1).toHaveProperty('rateLimit');
      expect(tier1.rateLimit).toHaveProperty('requestsPerMinute', 60);
      expect(tier1).toHaveProperty('features');
      expect(Array.isArray(tier1.features)).toBe(true);
    });
  });
});
