import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { setupTestDI } from '../../../infrastructure/di';
import securityHeadersPlugin from '../security-headers';

describe('Security Headers Plugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    setupTestDI();
    app = fastify({ logger: false });
    await app.register(securityHeadersPlugin);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Security headers', () => {
    it('should set basic security headers', async () => {
      app.get('/test', async () => ({ ok: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
      
      // Basic security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should set HSTS header', async () => {
      app.get('/test', async () => ({ ok: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should set Content-Security-Policy header', async () => {
      app.get('/test', async () => ({ ok: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-src 'none'");
    });

    it('should set custom API version header', async () => {
      app.get('/test', async () => ({ ok: true }));

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.headers['x-api-version']).toBe('1.0.0');
    });

    it('should set cache control headers for API endpoints', async () => {
      app.get('/api/data', async () => ({ data: 'test' }));

      const response = await app.inject({
        method: 'GET',
        url: '/api/data',
      });

      expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });

    it('should not set cache control headers for health endpoint', async () => {
      app.get('/api/health', async () => ({ status: 'ok' }));

      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.headers['cache-control']).not.toBe('no-store, no-cache, must-revalidate, private');
    });

    it('should set max-age header for OPTIONS requests', async () => {
      app.get('/test', async () => ({ ok: true }));

      const response = await app.inject({
        method: 'OPTIONS',
        url: '/test',
      });

      expect(response.headers['access-control-max-age']).toBe('86400');
    });
  });
});