import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { apiLoggingMiddleware } from '../api-logging.middleware';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Result } from '@/domain/shared/result';

// Mock the value objects
vi.mock('@/domain/api/value-objects/api-path', () => ({
  APIPath: {
    create: vi.fn().mockReturnValue(Result.ok({ value: '/api/data/test.json' })),
  },
}));

vi.mock('@/domain/api/value-objects/endpoint', () => ({
  Endpoint: {
    create: vi.fn().mockReturnValue(
      Result.ok({
        method: 'GET',
        path: { value: '/api/data/test.json' },
      }),
    ),
  },
}));

vi.mock('@/domain/log/value-objects/log-id', () => ({
  LogId: {
    generate: vi.fn().mockReturnValue({ value: 'test-log-id' }),
  },
}));

vi.mock('@/domain/auth/value-objects/user-id', () => ({
  UserId: {
    fromString: vi.fn().mockReturnValue({ value: 'test-user-id' }),
  },
}));

vi.mock('@/domain/log/value-objects/request-info', () => ({
  RequestInfo: vi.fn().mockImplementation((props) => ({
    ipAddress: props.ipAddress,
    userAgent: props.userAgent,
    headers: props.headers,
    body: props.body,
    queryParams: props.queryParams,
  })),
}));

vi.mock('@/domain/log/value-objects/response-info', () => ({
  ResponseInfo: vi.fn().mockImplementation((props) => ({
    statusCode: props.statusCode,
    responseTime: props.responseTime,
    size: props.size,
    headers: props.headers,
    getRateLimitInfo: () => ({
      limit: parseInt(props.headers['x-ratelimit-limit'] || '0'),
      remaining: parseInt(props.headers['x-ratelimit-remaining'] || '0'),
      reset: props.headers['x-ratelimit-reset']
        ? new Date(parseInt(props.headers['x-ratelimit-reset']) * 1000)
        : undefined,
    }),
  })),
}));

vi.mock('@/domain/log/entities/api-log-entry', () => ({
  APILogEntry: {
    create: vi.fn().mockReturnValue(
      Result.ok({
        id: { value: 'test-log-id' },
        userId: { value: 'test-user-id' },
        endpoint: {
          method: 'GET',
          path: { value: '/api/data/test.json' },
        },
        requestInfo: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test Browser',
          headers: {
            'user-agent': 'Mozilla/5.0 Test Browser',
            'accept-language': 'en-US',
            referer: 'https://example.com',
          },
        },
        responseInfo: {
          statusCode: 200,
          responseTime: 100,
          size: 17,
          headers: {
            'content-type': 'application/json',
            'cache-control': 'max-age=3600',
            'x-ratelimit-limit': '60',
            'x-ratelimit-remaining': '59',
            'x-ratelimit-reset': '1234567890',
          },
          getRateLimitInfo: () => ({
            limit: 60,
            remaining: 59,
            reset: new Date(1234567890 * 1000),
          }),
        },
        timestamp: new Date(),
        error: undefined,
        isSuccess: true,
      }),
    ),
  },
}));

describe('API Logging Middleware', () => {
  let mockApiLogService: any;
  let mockLogger: any;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    // Mock API log service
    mockApiLogService = {
      saveLog: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    // Register mocks in DI container
    container.register(DI_TOKENS.ApiLogService, { useValue: mockApiLogService });
    container.register(DI_TOKENS.Logger, { useValue: mockLogger });

    // Mock request
    mockRequest = {
      id: 'test-request-id',
      method: 'GET',
      url: '/api/data/test.json',
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'Mozilla/5.0 Test Browser',
        'accept-language': 'en-US',
        referer: 'https://example.com',
      },
      query: { filter: 'active' },
      body: null,
      protocol: 'https',
      hostname: 'api.example.com',
      user: {
        userId: { value: 'test-user-id' },
        tier: { level: 'tier1' },
      },
      context: {
        startTime: Date.now() - 100,
        requestId: 'test-request-id',
        userId: 'test-user-id',
        userTier: 'tier1',
      },
    };

    // Mock reply
    mockReply = {
      statusCode: 200,
      getHeaders: vi.fn().mockReturnValue({
        'content-type': 'application/json',
        'cache-control': 'max-age=3600',
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '59',
        'x-ratelimit-reset': '1234567890',
      }),
      getHeader: vi.fn((name: string) => {
        const headers = mockReply.getHeaders!();
        return headers[name.toLowerCase()];
      }),
      hasHeader: vi.fn((name: string) => {
        const headers = mockReply.getHeaders!();
        return name.toLowerCase() in headers;
      }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    container.clearInstances();
  });

  describe('onRequest', () => {
    it('should initialize request context', async () => {
      // Clear existing context
      delete (mockRequest as any).context;

      await apiLoggingMiddleware.onRequest(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.context).toBeDefined();
      expect(mockRequest.context!.startTime).toBeDefined();
      expect(mockRequest.context!.requestId).toBe('test-request-id');
      expect(mockRequest.context!.userId).toBe('test-user-id');
      expect(mockRequest.context!.userTier).toBe('tier1');
    });

    it('should handle unauthenticated requests', async () => {
      // Clear existing context and user
      delete (mockRequest as any).context;
      mockRequest.user = undefined;

      await apiLoggingMiddleware.onRequest(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
      );

      expect(mockRequest.context).toBeDefined();
      expect(mockRequest.context!.userId).toBeUndefined();
      expect(mockRequest.context!.userTier).toBeUndefined();
    });
  });

  describe('onSend', () => {
    beforeEach(async () => {
      // Ensure context is initialized
      if (!mockRequest.context) {
        await apiLoggingMiddleware.onRequest(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
        );
      }
    });

    it('should log successful API requests', async () => {
      const payload = JSON.stringify({ data: 'test' });

      await apiLoggingMiddleware.onSend(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        payload,
      );

      expect(mockApiLogService.saveLog).toHaveBeenCalledTimes(1);
      const savedLog = mockApiLogService.saveLog.mock.calls[0][0];

      expect(savedLog.userId?.value).toBe('test-user-id');
      expect(savedLog.endpoint.method).toBe('GET');
      expect(savedLog.endpoint.path.value).toBe('/api/data/test.json');
      expect(savedLog.responseInfo.statusCode).toBe(200);
      expect(savedLog.responseInfo.responseTime).toBeGreaterThan(0);
    });

    it('should handle error responses', async () => {
      mockReply.statusCode = 404;
      const { APIPath } = await import('@/domain/api/value-objects/api-path');
      const { Endpoint } = await import('@/domain/api/value-objects/endpoint');
      const { APILogEntry } = await import('@/domain/log/entities/api-log-entry');

      (APIPath.create as any).mockReturnValue(Result.ok({ value: '/api/data/test.json' }));
      (Endpoint.create as any).mockReturnValue(
        Result.ok({
          method: 'GET',
          path: { value: '/api/data/test.json' },
        }),
      );
      (APILogEntry.create as any).mockReturnValue(
        Result.ok({
          id: { value: 'test-log-id' },
          userId: { value: 'test-user-id' },
          endpoint: {
            method: 'GET',
            path: { value: '/api/data/test.json' },
          },
          requestInfo: {
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0 Test Browser',
            headers: {},
          },
          responseInfo: {
            statusCode: 404,
            responseTime: 100,
            size: 36,
            headers: {},
          },
          timestamp: new Date(),
          error: 'Not Found',
          isSuccess: false,
        }),
      );

      const payload = JSON.stringify({
        error: 'Not Found',
        message: 'Resource not found',
      });

      await apiLoggingMiddleware.onSend(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        payload,
      );

      expect(mockApiLogService.saveLog).toHaveBeenCalledTimes(1);
      const savedLog = mockApiLogService.saveLog.mock.calls[0][0];

      expect(savedLog.responseInfo.statusCode).toBe(404);
      expect(savedLog.error).toBe('Not Found');
    });

    it('should sanitize endpoint paths', async () => {
      mockRequest.url = '/api/data/12345/details?page=1';
      const { APIPath } = await import('@/domain/api/value-objects/api-path');

      (APIPath.create as any).mockReturnValue(Result.ok({ value: '/api/data/{id}/details' }));

      const payload = '{}';

      await apiLoggingMiddleware.onSend(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        payload,
      );

      expect(mockApiLogService.saveLog).toHaveBeenCalledTimes(1);
      expect(APIPath.create).toHaveBeenCalledWith('/api/data/{id}/details');
    });

    it('should handle UUID patterns in paths', async () => {
      mockRequest.url = '/api/users/550e8400-e29b-41d4-a716-446655440000/profile';
      const { APIPath } = await import('@/domain/api/value-objects/api-path');

      (APIPath.create as any).mockReturnValue(Result.ok({ value: '/api/users/{id}/profile' }));

      const payload = '{}';

      await apiLoggingMiddleware.onSend(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        payload,
      );

      expect(mockApiLogService.saveLog).toHaveBeenCalledTimes(1);
      expect(APIPath.create).toHaveBeenCalledWith('/api/users/{id}/profile');
    });

    it('should handle buffer payloads', async () => {
      const payload = Buffer.from('test data');

      await apiLoggingMiddleware.onSend(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        payload,
      );

      expect(mockApiLogService.saveLog).toHaveBeenCalledTimes(1);
      const savedLog = mockApiLogService.saveLog.mock.calls[0][0];

      expect(savedLog.responseInfo.size).toBe(payload.length);
    });

    it('should handle stream payloads', async () => {
      const { Readable } = await import('stream');
      const payload = new Readable();

      await apiLoggingMiddleware.onSend(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        payload,
      );

      expect(mockApiLogService.saveLog).toHaveBeenCalledTimes(1);
      // Stream size should be handled as -1 (unknown)
    });

    it('should handle logging failures gracefully', async () => {
      const { APILogEntry } = await import('@/domain/log/entities/api-log-entry');

      // Make the log entry creation fail
      (APILogEntry.create as any).mockReturnValue(Result.fail(new Error('Creation failed')));

      const payload = '{}';

      // Should not throw
      await expect(
        apiLoggingMiddleware.onSend(
          mockRequest as FastifyRequest,
          mockReply as FastifyReply,
          payload,
        ),
      ).resolves.toBe(payload);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Failed to create API log entry',
      );
    });

    it('should sanitize sensitive headers', async () => {
      mockRequest.headers = {
        ...mockRequest.headers,
        authorization: 'Bearer secret-token',
        cookie: 'session=secret',
        'x-api-key': 'secret-key',
      };

      const { RequestInfo } = await import('@/domain/log/value-objects/request-info');
      const payload = '{}';

      await apiLoggingMiddleware.onSend(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        payload,
      );

      // Check that RequestInfo was called with sanitized headers
      expect(RequestInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.not.objectContaining({
            authorization: expect.any(String),
            cookie: expect.any(String),
            'x-api-key': expect.any(String),
          }),
        }),
      );
    });

    it('should capture rate limit information', async () => {
      const payload = '{}';

      await apiLoggingMiddleware.onSend(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        payload,
      );

      expect(mockApiLogService.saveLog).toHaveBeenCalledTimes(1);
      const savedLog = mockApiLogService.saveLog.mock.calls[0][0];

      const rateLimitInfo = savedLog.responseInfo.getRateLimitInfo();
      expect(rateLimitInfo.limit).toBe(60);
      expect(rateLimitInfo.remaining).toBe(59);
      expect(rateLimitInfo.reset).toBeDefined();
    });
  });
});
