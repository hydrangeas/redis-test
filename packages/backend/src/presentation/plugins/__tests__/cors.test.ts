import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { setupTestDI } from '../../../infrastructure/di';
import corsPlugin from '../cors';

describe('CORS Plugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    setupTestDI();
    app = fastify({ logger: false });
    await app.register(corsPlugin);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('CORS headers', () => {
    it('should allow requests from frontend URL', async () => {
      app.get('/test', async () => ({ ok: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle OPTIONS preflight requests', async () => {
      app.get('/test', async () => ({ ok: true }));

      const response = await app.inject({
        method: 'OPTIONS',
        url: '/test',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type,authorization',
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders?.toLowerCase()).toContain('authorization');
      expect(response.headers['access-control-max-age']).toBe('86400');
    });

    it('should expose rate limit headers', async () => {
      app.get('/test', async (request, reply) => {
        reply.header('X-RateLimit-Limit', '100');
        reply.header('X-RateLimit-Remaining', '99');
        return { ok: true };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      expect(response.headers['access-control-expose-headers']).toContain('X-RateLimit-Limit');
      expect(response.headers['access-control-expose-headers']).toContain('X-RateLimit-Remaining');
    });

    it('should allow requests without origin header', async () => {
      app.get('/test', async () => ({ ok: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should include all allowed methods', async () => {
      app.get('/test', async () => ({ ok: true }));

      const response = await app.inject({
        method: 'OPTIONS',
        url: '/test',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'GET',
        },
      });

      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toBeDefined();
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('PUT');
      expect(allowedMethods).toContain('DELETE');
      expect(allowedMethods).toContain('PATCH');
      expect(allowedMethods).toContain('OPTIONS');
    });
  });
});
