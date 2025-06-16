import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { setupTestDI } from '@/infrastructure/di/container';
import { container } from 'tsyringe';
import authPlugin from '@/presentation/plugins/auth.plugin';
import rateLimitPlugin from '@/presentation/plugins/rate-limit.plugin';
import dataRoutes from '@/presentation/routes/api/data';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { IJwtService } from '@/application/interfaces/jwt.service.interface';
import { IUserRepository } from '@/domain/auth/interfaces/user-repository.interface';
import { IRateLimitLogRepository } from '@/domain/api/interfaces/rate-limit-log-repository.interface';
import { IDataRetrievalUseCase } from '@/application/interfaces/data-retrieval-use-case.interface';
import { IRateLimitUseCase } from '@/application/interfaces/rate-limit-use-case.interface';
import { IAuthenticationUseCase } from '@/application/interfaces/authentication-use-case.interface';
import { Result } from '@/domain/shared/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';

describe('Data Routes', () => {
  let server: FastifyInstance;
  let mockDataRetrievalUseCase: IDataRetrievalUseCase;
  let mockRateLimitUseCase: IRateLimitUseCase;
  let mockJwtService: IJwtService;
  let mockAuthenticationUseCase: IAuthenticationUseCase;

  beforeAll(async () => {
    // 環境変数の設定（setupTestDIの前に設定）
    process.env.NODE_ENV = 'test';
    process.env.API_URL = 'http://localhost:8000';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
    
    // DIコンテナをリセット
    container.reset();
    
    try {
    
    // Test DI設定
    setupTestDI();
    
    // 認証関連のモックを先に登録
    const mockUserId = UserId.create('123e4567-e89b-12d3-a456-426614174000').getValue();
    const mockUserTier = UserTier.create(TierLevel.TIER1).getValue();
    const mockAuthenticatedUser = new AuthenticatedUser(mockUserId, mockUserTier);
    
    // JwtServiceのモックを登録（auth.plugin.tsで使用）
    mockJwtService = {
      generateAccessToken: vi.fn().mockResolvedValue(Result.ok('mock-access-token')),
      generateRefreshToken: vi.fn().mockResolvedValue(Result.ok('mock-refresh-token')),
      verifyAccessToken: vi.fn().mockResolvedValue(Result.ok({ 
        sub: '123e4567-e89b-12d3-a456-426614174000', 
        tier: 'tier1',
        exp: Math.floor(Date.now() / 1000) + 3600 
      })),
      verifyRefreshToken: vi.fn().mockResolvedValue(Result.ok({ sub: '123e4567-e89b-12d3-a456-426614174000' })),
      decodeToken: vi.fn().mockReturnValue({ sub: '123e4567-e89b-12d3-a456-426614174000' }),
    };
    container.register(DI_TOKENS.JwtService, { useValue: mockJwtService });
    
    // UserRepositoryのモックを登録（auth.plugin.tsで使用）
    const mockUserRepository: IUserRepository = {
      findById: vi.fn().mockResolvedValue(Result.ok(null)),
      findByEmail: vi.fn().mockResolvedValue(Result.ok(null)),
      save: vi.fn().mockResolvedValue(Result.ok()),
      update: vi.fn().mockResolvedValue(Result.ok()),
      delete: vi.fn().mockResolvedValue(Result.ok()),
    };
    container.register(DI_TOKENS.UserRepository, { useValue: mockUserRepository });
    
    // AuthenticationUseCaseのモックを登録（もし使用される場合のため）
    mockAuthenticationUseCase = {
      validateToken: vi.fn().mockResolvedValue({
        success: true,
        data: {
          user: mockAuthenticatedUser,
          tokenId: 'test-token-id',
        },
      }),
      refreshToken: vi.fn(),
      signOut: vi.fn(),
    };
    container.register(DI_TOKENS.AuthenticationUseCase, { useValue: mockAuthenticationUseCase });
    
    // RateLimitLogRepositoryのモックを登録
    const mockRateLimitLogRepository: IRateLimitLogRepository = {
      save: vi.fn().mockResolvedValue(Result.ok()),
      saveMany: vi.fn().mockResolvedValue(Result.ok()),
      findByUserAndEndpoint: vi.fn().mockResolvedValue(Result.ok([])),
      findByUser: vi.fn().mockResolvedValue(Result.ok([])),
      findByEndpoint: vi.fn().mockResolvedValue(Result.ok([])),
      deleteOldLogs: vi.fn().mockResolvedValue(Result.ok(0)),
      countRequests: vi.fn().mockResolvedValue(Result.ok(0)),
    };
    container.register(DI_TOKENS.RateLimitLogRepository, { useValue: mockRateLimitLogRepository });
    
    // DataRetrievalUseCaseのモックを登録
    mockDataRetrievalUseCase = {
      retrieveData: vi.fn(),
    };
    container.register(DI_TOKENS.DataRetrievalUseCase, { useValue: mockDataRetrievalUseCase });
    
    // RateLimitUseCaseのモックを登録
    mockRateLimitUseCase = {
      checkAndRecordAccess: vi.fn(),
      getUserUsageStatus: vi.fn(),
      resetUserLimit: vi.fn(),
    };
    container.register(DI_TOKENS.RateLimitUseCase, { useValue: mockRateLimitUseCase });
    
    // SecurityAuditServiceのモックを登録
    const mockSecurityAuditService = {
      logSecurityEvent: vi.fn().mockResolvedValue(Result.ok()),
      logPathTraversalAttempt: vi.fn().mockResolvedValue(Result.ok()),
      logUnauthorizedAccess: vi.fn().mockResolvedValue(Result.ok()),
      logSuspiciousActivity: vi.fn().mockResolvedValue(Result.ok()),
    };
    container.register(DI_TOKENS.SecurityAuditService, { useValue: mockSecurityAuditService });
    
    // SecureFileAccessServiceのモックを登録
    const mockSecureFileAccess = {
      validateAndSanitizePath: vi.fn().mockResolvedValue(Result.ok('/data/test.json')),
      checkAccess: vi.fn().mockResolvedValue(Result.ok(true)),
    };
    container.register(DI_TOKENS.SecureFileAccessService, { useValue: mockSecureFileAccess });
    
    // テスト用の最小限のサーバー構築
    server = Fastify({
      logger: false,
    }).withTypeProvider<TypeBoxTypeProvider>();
    
    // 必要なプラグインのみ登録
    await server.register(authPlugin, {
      excludePaths: ['/health'],
    });
    await server.register(rateLimitPlugin, {
      excludePaths: ['/health'],
    });
    
    // データルートのみ登録
    await server.register(dataRoutes, { prefix: '/api/data' });
    
    // ヘルスチェックエンドポイント（テスト用）
    server.get('/health', async () => ({ status: 'ok' }));
    
    } catch (error) {
      console.error('Failed to build server:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/data/:path', () => {
    it('should retrieve data successfully with valid token', async () => {
      // モックの設定
      mockRateLimitUseCase.checkAndRecordAccess = vi.fn().mockResolvedValue(Result.ok({
        allowed: true,
        limit: 60,
        remaining: 59,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      }));
      
      mockDataRetrievalUseCase.retrieveData = vi.fn().mockResolvedValue(Result.ok({
        content: { test: 'data' },
        checksum: 'abc123',
        lastModified: new Date('2024-01-01T00:00:00Z'),
      }));
      
      console.log('Sending request with Bearer valid-token');
      const response = await server.inject({
        method: 'GET',
        url: '/api/data/secure/319985/r5.json',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      // Debug: always log the response for debugging
      console.log('Response status:', response.statusCode);
      console.log('Response body:', response.body);
      console.log('Response headers:', response.headers);
      console.log('DataRetrievalUseCase was called:', mockDataRetrievalUseCase.retrieveData.mock.calls.length, 'times');
      if (mockDataRetrievalUseCase.retrieveData.mock.calls.length > 0) {
        console.log('DataRetrievalUseCase calls:', mockDataRetrievalUseCase.retrieveData.mock.calls);
      }

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ test: 'data' });
      expect(response.headers['x-ratelimit-limit']).toBe('60');
      expect(response.headers['x-ratelimit-remaining']).toBe('59');
      expect(response.headers['cache-control']).toBe('public, max-age=3600');
      expect(response.headers['etag']).toBe('"abc123"');
    });

    it('should return 401 when no authorization header is provided', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/data/secure/319985/r5.json',
      });

      // Debug: log the response if it's not 401
      if (response.statusCode !== 401) {
        console.log('Response status:', response.statusCode);
        console.log('Response body:', response.body);
        console.log('Response headers:', response.headers);
      }

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('title', 'Authentication required');
      expect(body).toHaveProperty('status', 401);
    });

    it('should return 429 when rate limit is exceeded', async () => {
      mockRateLimitUseCase.checkAndRecordAccess = vi.fn().mockResolvedValue(Result.ok({
        allowed: false,
        limit: 60,
        remaining: 0,
        resetAt: Math.floor(Date.now() / 1000) + 60,
        retryAfter: 60,
      }));
      
      const response = await server.inject({
        method: 'GET',
        url: '/api/data/secure/319985/r5.json',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('title', 'Too many requests');
      expect(body).toHaveProperty('status', 429);
      expect(response.headers['retry-after']).toBe('60');
    });

    it('should return 404 when data is not found', async () => {
      mockRateLimitUseCase.checkAndRecordAccess = vi.fn().mockResolvedValue(Result.ok({
        allowed: true,
        limit: 60,
        remaining: 59,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      }));
      
      mockDataRetrievalUseCase.retrieveData = vi.fn().mockResolvedValue(
        Result.fail(new DomainError('DATA_NOT_FOUND', 'Data not found', ErrorType.NOT_FOUND))
      );
      
      const response = await server.inject({
        method: 'GET',
        url: '/api/data/secure/319985/r5.json',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 404);
    });

    it('should return 400 for invalid path format', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/data/invalid-path',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('title', 'Invalid data path format');
    });

    it('should return 304 when ETag matches', async () => {
      mockRateLimitUseCase.checkAndRecordAccess = vi.fn().mockResolvedValue(Result.ok({
        allowed: true,
        limit: 60,
        remaining: 59,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      }));
      
      mockDataRetrievalUseCase.retrieveData = vi.fn().mockResolvedValue(Result.ok({
        content: { test: 'data' },
        checksum: 'abc123',
        lastModified: new Date('2024-01-01T00:00:00Z'),
      }));
      
      const response = await server.inject({
        method: 'GET',
        url: '/api/data/secure/319985/r5.json',
        headers: {
          authorization: 'Bearer valid-token',
          'if-none-match': '"abc123"',
        },
      });

      expect(response.statusCode).toBe(304);
      expect(response.body).toBe('');
    });
  });

  describe('GET /api/data', () => {
    it('should list data files (currently returns empty)', async () => {
      mockRateLimitUseCase.checkAndRecordAccess = vi.fn().mockResolvedValue(Result.ok({
        allowed: true,
        limit: 60,
        remaining: 59,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      }));
      
      const response = await server.inject({
        method: 'GET',
        url: '/api/data?limit=10&offset=0',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('items');
      expect(body).toHaveProperty('total', 0);
      expect(body).toHaveProperty('limit', 10);
      expect(body).toHaveProperty('offset', 0);
    });
  });
});