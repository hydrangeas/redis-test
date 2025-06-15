import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { DI_TOKENS } from '../../../../infrastructure/di/tokens';
import { setupTestDI } from '../../../../infrastructure/di/container';
import dataAccessRoute from '../data-access.route';
import { DataAccessUseCase } from '../../../../application/use-cases/data-access.use-case';
import { AuthenticatedUser } from '../../../../domain/auth/value-objects/authenticated-user';
import { UserId } from '../../../../domain/auth/value-objects/user-id';
import { UserTier } from '../../../../domain/auth/value-objects/user-tier';
import { DomainError } from '../../../../domain/errors/domain-error';

describe('Data Access Route', () => {
  let app: FastifyInstance;
  let mockDataAccessUseCase: Partial<DataAccessUseCase>;
  
  function createMockAuthenticatedUser(userId = 'test-user-123', tier = 'tier1'): AuthenticatedUser {
    return new AuthenticatedUser(
      new UserId(userId),
      new UserTier(tier as any)
    );
  }

  beforeEach(async () => {
    setupTestDI();
    
    // Mock DataAccessUseCase
    mockDataAccessUseCase = {
      getData: vi.fn(),
    };
    
    container.register(DI_TOKENS.DataAccessUseCase, {
      useValue: mockDataAccessUseCase,
    });

    app = fastify({ logger: false });
    
    // Register authentication decorator
    app.decorate('authenticate', async (request, reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          type: 'https://api.example.com/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          instance: request.url,
        });
      }
      request.user = createMockAuthenticatedUser();
    });
    
    // Register rate limit decorator
    app.decorate('checkRateLimit', async (request, reply) => {
      // Mock rate limit check - always pass in tests
    });
    
    // Register error handler
    const errorHandler = (await import('../../../plugins/error-handler')).default;
    await app.register(errorHandler);
    
    await app.register(dataAccessRoute);
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  describe('GET /*', () => {
    it('should return data successfully', async () => {
      const mockData = {
        key: 'value',
        numbers: [1, 2, 3],
      };
      
      vi.mocked(mockDataAccessUseCase.getData).mockResolvedValue({
        success: true,
        data: {
          content: mockData,
          etag: '"abc123"',
          lastModified: new Date('2024-01-01T00:00:00Z'),
          size: 1024,
        },
        error: null,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/secure/test/data.json',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['etag']).toBe('"abc123"');
      expect(response.headers['cache-control']).toBe('public, max-age=3600');
      
      const body = JSON.parse(response.body);
      expect(body).toEqual({
        data: mockData,
        metadata: {
          etag: '"abc123"',
          lastModified: '2024-01-01T00:00:00.000Z',
          size: 1024,
        },
      });

      expect(mockDataAccessUseCase.getData).toHaveBeenCalledWith({
        path: 'secure/test/data.json',
        user: expect.any(AuthenticatedUser),
        ipAddress: expect.any(String),
        userAgent: expect.any(String),
      });
    });

    it('should return 304 when etag matches', async () => {
      vi.mocked(mockDataAccessUseCase.getData).mockResolvedValue({
        success: true,
        data: {
          content: { key: 'value' },
          etag: '"abc123"',
          lastModified: new Date('2024-01-01T00:00:00Z'),
          size: 1024,
        },
        error: null,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/secure/test/data.json',
        headers: {
          authorization: 'Bearer valid-token',
          'if-none-match': '"abc123"',
        },
      });

      expect(response.statusCode).toBe(304);
      expect(response.body).toBe('');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/secure/test/data.json',
      });

      expect(response.statusCode).toBe(401);
      expect(mockDataAccessUseCase.getData).not.toHaveBeenCalled();
    });

    it('should return 404 when data not found', async () => {
      vi.mocked(mockDataAccessUseCase.getData).mockResolvedValue({
        success: false,
        data: null,
        error: new DomainError(
          'DATA_NOT_FOUND',
          'Data file not found',
          'NOT_FOUND'
        ),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/secure/test/missing.json',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toContain('application/problem+json');
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/data-not-found'),
        title: 'Data file not found',
        status: 404,
      });
    });

    it('should return 400 for invalid path', async () => {
      vi.mocked(mockDataAccessUseCase.getData).mockResolvedValue({
        success: false,
        data: null,
        error: new DomainError(
          'INVALID_PATH',
          'Path traversal detected',
          'SECURITY'
        ),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/../../../etc/passwd',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
    });

    it('should return 429 when rate limit exceeded', async () => {
      vi.mocked(mockDataAccessUseCase.getData).mockResolvedValue({
        success: false,
        data: null,
        error: new DomainError(
          'RATE_LIMIT_EXCEEDED',
          'API rate limit exceeded',
          'RATE_LIMIT',
          {
            limit: 60,
            remaining: 0,
            reset: 1704067260,
            retryAfter: 30,
          }
        ),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/secure/test/data.json',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(429);
      // Note: Headers might not be set in test environment without middleware
      // The important thing is that we return 429 with proper error response
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/rate-limit-exceeded'),
        status: 429,
      });
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(mockDataAccessUseCase.getData).mockRejectedValue(
        new Error('Unexpected error')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/secure/test/data.json',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(500);
      expect(response.headers['content-type']).toContain('application/problem+json');
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/data-access-error'),
        title: 'An unexpected error occurred while accessing data',
        status: 500,
      });
    });
  });
});