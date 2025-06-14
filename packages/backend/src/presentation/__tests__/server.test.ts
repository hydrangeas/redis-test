import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildServer } from '../server';
import { FastifyInstance } from 'fastify';
import { setupTestDI } from '@/infrastructure/di/container';
import { container } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { IJwtService } from '@/application/interfaces/jwt.service.interface';
import { IUserRepository } from '@/domain/auth/interfaces/user-repository.interface';
import { IRateLimitLogRepository } from '@/domain/api/interfaces/rate-limit-log-repository.interface';
import { IRateLimitUseCase } from '@/application/interfaces/rate-limit-use-case.interface';
import { IDataRetrievalUseCase } from '@/application/interfaces/data-retrieval-use-case.interface';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';

describe('Server Configuration', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    // Test DI設定
    setupTestDI();
    
    // JwtServiceのモックを登録
    const mockJwtService: IJwtService = {
      generateAccessToken: vi.fn().mockResolvedValue(Result.ok('mock-access-token')),
      generateRefreshToken: vi.fn().mockResolvedValue(Result.ok('mock-refresh-token')),
      verifyAccessToken: vi.fn().mockResolvedValue(Result.ok({ sub: '123e4567-e89b-12d3-a456-426614174000', tier: 'tier1' })),
      verifyRefreshToken: vi.fn().mockResolvedValue(Result.ok({ sub: '123e4567-e89b-12d3-a456-426614174000' })),
      decodeToken: vi.fn().mockReturnValue({ sub: '123e4567-e89b-12d3-a456-426614174000' }),
    };
    container.register(DI_TOKENS.JwtService, { useValue: mockJwtService });
    
    // UserRepositoryのモックを登録
    const mockUserRepository: IUserRepository = {
      findById: vi.fn().mockResolvedValue(Result.ok(null)),
      findByEmail: vi.fn().mockResolvedValue(Result.ok(null)),
      save: vi.fn().mockResolvedValue(Result.ok()),
      update: vi.fn().mockResolvedValue(Result.ok()),
      delete: vi.fn().mockResolvedValue(Result.ok()),
    };
    container.register(DI_TOKENS.UserRepository, { useValue: mockUserRepository });
    
    // RateLimitLogRepositoryのモックを登録
    const mockRateLimitLogRepository: IRateLimitLogRepository = {
      save: vi.fn().mockResolvedValue(Result.ok()),
      findByUserId: vi.fn().mockResolvedValue(Result.ok([])),
      countInWindow: vi.fn().mockResolvedValue(Result.ok(0)),
      deleteOlderThan: vi.fn().mockResolvedValue(Result.ok()),
      deleteByUserId: vi.fn().mockResolvedValue(Result.ok()),
    };
    container.register(DI_TOKENS.RateLimitLogRepository, { useValue: mockRateLimitLogRepository });
    
    // RateLimitUseCaseのモックを登録
    const mockRateLimitUseCase: IRateLimitUseCase = {
      checkAndRecordAccess: vi.fn().mockResolvedValue(Result.ok({
        allowed: true,
        limit: 60,
        remaining: 59,
        resetAt: Math.floor(Date.now() / 1000) + 60,
      })),
      getUserUsageStatus: vi.fn().mockResolvedValue(Result.ok({
        currentCount: 1,
        limit: 60,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60000),
      })),
      resetUserLimit: vi.fn().mockResolvedValue(Result.ok()),
    };
    container.register(DI_TOKENS.RateLimitUseCase, { useValue: mockRateLimitUseCase });
    
    // DataRetrievalUseCaseのモックを登録
    const mockDataRetrievalUseCase: IDataRetrievalUseCase = {
      retrieveData: vi.fn().mockResolvedValue(Result.ok({
        content: { test: 'data' },
        checksum: 'abc123',
        lastModified: new Date(),
      })),
    };
    container.register(DI_TOKENS.DataRetrievalUseCase, { useValue: mockDataRetrievalUseCase });
    
    // 環境変数の設定
    process.env.NODE_ENV = 'test';
    process.env.API_URL = 'http://localhost:8000';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173';
    
    // サーバー構築
    server = await buildServer();
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'healthy');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('environment', 'test');
    });
  });

  describe('Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('name', 'Open Data API');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('documentation', '/api-docs');
    });
  });

  describe('API Version', () => {
    it('should return API version information', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/version',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('build');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('404 Handler', () => {
    it('should return RFC 7807 formatted error for not found routes', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/non-existent-route',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('title', 'Resource not found');
      expect(body).toHaveProperty('status', 404);
      expect(body).toHaveProperty('detail');
      expect(body).toHaveProperty('instance', '/non-existent-route');
    });
  });

  describe('CORS', () => {
    it('should allow requests from allowed origins', async () => {
      const response = await server.inject({
        method: 'OPTIONS',
        url: '/api/version',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'GET',
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should reject requests from non-allowed origins', async () => {
      const response = await server.inject({
        method: 'OPTIONS',
        url: '/api/version',
        headers: {
          origin: 'http://evil.com',
          'access-control-request-method': 'GET',
        },
      });

      expect(response.statusCode).toBe(500);
    });
  });

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('OpenAPI Documentation', () => {
    it('should provide OpenAPI JSON specification', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api-docs/json',
      });

      expect(response.statusCode).toBe(200);
      const spec = JSON.parse(response.body);
      expect(spec).toHaveProperty('openapi');
      expect(spec.info).toHaveProperty('title', 'Open Data API');
      expect(spec.info).toHaveProperty('version', '1.0.0');
    });
  });
});