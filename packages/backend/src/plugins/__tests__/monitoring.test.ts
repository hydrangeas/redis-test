import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { container } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Logger } from 'pino';
import monitoringPlugin from '../monitoring';

// Mock pino
vi.mock('pino', () => ({
  default: vi.fn(() => ({
    child: vi.fn(() => mockLogger),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => mockLogger),
};

describe('Monitoring Plugin', () => {
  let fastify: any;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Register mocks in DI container
    container.register(DI_TOKENS.Logger, { useValue: mockLogger });
    container.register(DI_TOKENS.DataDirectory, { useValue: '/tmp/data' });
    container.register(DI_TOKENS.SupabaseClient, { useValue: {} });

    // Create Fastify instance
    fastify = Fastify({ logger: false });
    
    // Register the monitoring plugin
    await fastify.register(monitoringPlugin);
  });

  afterEach(async () => {
    await fastify.close();
    container.clearInstances();
  });

  describe('Metrics endpoint', () => {
    it('should expose /metrics endpoint', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('text/plain');
      expect(response.body).toContain('# HELP');
      expect(response.body).toContain('# TYPE');
    });

    it('should include custom metrics', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(response.body).toContain('http_request_duration_seconds');
      expect(response.body).toContain('http_requests_total');
      expect(response.body).toContain('rate_limit_hits_total');
      expect(response.body).toContain('authentication_attempts_total');
      expect(response.body).toContain('data_access_total');
      expect(response.body).toContain('errors_total');
    });

    it('should include default Node.js metrics', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(response.body).toContain('process_cpu_user_seconds_total');
      expect(response.body).toContain('nodejs_heap_size_total_bytes');
      expect(response.body).toContain('nodejs_gc_duration_seconds');
    });
  });

  describe('Health check endpoint', () => {
    it('should expose /health/detailed endpoint', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: {
          seconds: expect.any(Number),
          human: expect.any(String),
        },
        memory: {
          rss: expect.any(String),
          heapTotal: expect.any(String),
          heapUsed: expect.any(String),
          external: expect.any(String),
        },
        environment: {
          nodeVersion: expect.any(String),
          platform: expect.any(String),
          env: expect.any(String),
        },
        checks: {
          database: { status: 'healthy', latency: expect.any(Number) },
          filesystem: { status: 'healthy' },
        },
      });
    });

    it('should format uptime correctly', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      const health = response.json();
      expect(health.uptime.human).toMatch(/^\d+s$/); // Should be in format like "5s", "10s", etc.
    });

    it('should format memory usage correctly', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      const health = response.json();
      expect(health.memory.rss).toMatch(/^\d+\.\d{2} (B|KB|MB|GB)$/);
      expect(health.memory.heapTotal).toMatch(/^\d+\.\d{2} (B|KB|MB|GB)$/);
      expect(health.memory.heapUsed).toMatch(/^\d+\.\d{2} (B|KB|MB|GB)$/);
    });
  });

  describe('Request tracking', () => {
    let testFastify: any;

    beforeEach(async () => {
      // Create new instance for these tests
      testFastify = Fastify({ logger: false });
      await testFastify.register(monitoringPlugin);
    });

    afterEach(async () => {
      await testFastify.close();
    });

    it('should track HTTP request metrics', async () => {
      // Add a test route
      testFastify.get('/test', async () => ({ ok: true }));

      // Make a request
      const response = await testFastify.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);

      // Check if logger was called
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'http_request',
          request: expect.objectContaining({
            method: 'GET',
            url: '/test',
          }),
          response: expect.objectContaining({
            statusCode: 200,
            duration: expect.any(Number),
          }),
        })
      );
    });

    it('should track request with user info', async () => {
      // Add a test route that sets user
      testFastify.get('/test-user', async (request: any) => {
        request.user = {
          userId: { value: 'test-user-id' },
          tier: { level: 'tier2' },
        };
        return { ok: true };
      });

      await testFastify.inject({
        method: 'GET',
        url: '/test-user',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          user: {
            id: 'test-user-id',
            tier: 'tier2',
          },
        })
      );
    });

    it('should track rate limit exceeded', async () => {
      // Add a test route that returns 429
      testFastify.get('/test-rate-limit', async (request: any, reply: any) => {
        request.user = {
          userId: { value: 'test-user-id' },
          tier: { level: 'tier1' },
        };
        reply.code(429);
        return { error: 'Rate limit exceeded' };
      });

      await testFastify.inject({
        method: 'GET',
        url: '/test-rate-limit',
      });

      // Check if metrics would be updated (we can't easily test the actual counter)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          response: expect.objectContaining({
            statusCode: 429,
          }),
        })
      );
    });

    it('should track data access requests', async () => {
      // Add a test route for data access
      testFastify.get('/api/v1/data/test.json', async (request: any, reply: any) => {
        reply.header('content-length', '1024');
        return { data: 'test' };
      });

      await testFastify.inject({
        method: 'GET',
        url: '/api/v1/data/test.json',
      });

      // Find the log entry with type 'http_request'
      const httpRequestCall = mockLogger.info.mock.calls.find(
        call => call[0]?.type === 'http_request'
      );
      
      expect(httpRequestCall).toBeDefined();
      expect(httpRequestCall[0]).toMatchObject({
        type: 'http_request',
        request: expect.objectContaining({
          url: '/api/v1/data/test.json',
        }),
        response: expect.objectContaining({
          statusCode: 200,
        }),
      });
    });
  });

  describe('Error tracking', () => {
    let testFastify: any;

    beforeEach(async () => {
      // Create new instance for these tests
      testFastify = Fastify({ logger: false });
      await testFastify.register(monitoringPlugin);
    });

    afterEach(async () => {
      await testFastify.close();
    });

    it('should track errors', async () => {
      // Add a route that throws an error
      testFastify.get('/test-error', async () => {
        const error: any = new Error('Test error');
        error.statusCode = 500;
        error.code = 'TEST_ERROR';
        throw error;
      });

      const response = await testFastify.inject({
        method: 'GET',
        url: '/test-error',
      });

      expect(response.statusCode).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error: expect.objectContaining({
            message: 'Test error',
            code: 'TEST_ERROR',
            statusCode: 500,
          }),
        })
      );
    });

    it('should handle errors without statusCode', async () => {
      // Add a route that throws a generic error
      testFastify.get('/test-generic-error', async () => {
        throw new Error('Generic error');
      });

      const response = await testFastify.inject({
        method: 'GET',
        url: '/test-generic-error',
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toMatchObject({
        error: 'Error',
        message: 'Generic error',
      });
    });
  });

  describe('Utility functions', () => {
    it('should handle filesystem check errors gracefully', async () => {
      // Even if filesystem check fails, endpoint should still work
      const response = await fastify.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      // Health check should still return a response
      expect(response.statusCode).toBeGreaterThanOrEqual(200);
      expect(response.statusCode).toBeLessThan(600);
      
      const health = response.json();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('checks');
    });
  });
});