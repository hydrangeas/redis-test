import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import corsPlugin from '../cors-enhanced.js';
import securityHeadersPlugin from '../security-headers-enhanced.js';
import pathValidationPlugin from '../path-validation.js';
import { setupTestContainer, clearContainer } from '../../../infrastructure/di/test-container.js';

describe('Security Plugins', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    clearContainer();
    setupTestContainer();
    
    app = fastify({ logger: false });
    
    // Register plugins
    await app.register(corsPlugin);
    await app.register(securityHeadersPlugin);
    await app.register(pathValidationPlugin);
    
    // Test route
    app.get('/test', async () => ({ message: 'OK' }));
    
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('CORS', () => {
    it('should allow requests from allowed origins', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          origin: 'http://localhost:5173',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle preflight requests', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/test',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'Content-Type, Authorization',
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });

    it('should add Vary header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.headers['vary']).toContain('Origin');
    });
  });

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['x-api-version']).toBe('1.0.0');
    });

    it('should set strict transport security', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should set cache control for API endpoints', async () => {
      app.get('/api/test', async () => ({ data: 'test' }));
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/test',
      });

      expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });

    it('should set permissions policy', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      const permissionsPolicy = response.headers['permissions-policy'];
      expect(permissionsPolicy).toContain('camera=()');
      expect(permissionsPolicy).toContain('microphone=()');
      expect(permissionsPolicy).toContain('geolocation=()');
    });
  });

  describe('Path Validation', () => {
    it('should reject path traversal attempts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test/../../../etc/passwd',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        type: 'https://example.com/errors/invalid-path',
        title: 'Invalid Path',
        status: 400,
      });
    });

    it('should reject URL encoded path traversal', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test/%2e%2e%2f%2e%2e%2fetc/passwd',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject hidden file access', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test/.git/config',
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        type: 'https://example.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
      });
    });

    it('should allow .well-known paths', async () => {
      app.get('/.well-known/test', async () => ({ status: 'ok' }));
      
      const response = await app.inject({
        method: 'GET',
        url: '/.well-known/test',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject paths with null bytes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test%00.txt',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject extremely long paths', async () => {
      const longPath = '/test/' + 'a'.repeat(2050);
      const response = await app.inject({
        method: 'GET',
        url: longPath,
      });

      expect(response.statusCode).toBe(414);
      expect(response.json()).toMatchObject({
        type: 'https://example.com/errors/uri-too-long',
        title: 'URI Too Long',
        status: 414,
      });
    });

    it('should sanitize query parameters', async () => {
      let receivedQuery: any;
      app.get('/query-test', async (request) => {
        receivedQuery = request.query;
        return { query: request.query };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/query-test?name=<script>alert("xss")</script>&safe=normal',
      });

      expect(response.statusCode).toBe(200);
      expect(receivedQuery.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(receivedQuery.safe).toBe('normal');
    });

    it('should sanitize JSON body', async () => {
      let receivedBody: any;
      app.post('/body-test', async (request) => {
        receivedBody = request.body;
        return { body: request.body };
      });

      const response = await app.inject({
        method: 'POST',
        url: '/body-test',
        headers: { 'content-type': 'application/json' },
        payload: {
          name: '<script>alert("xss")</script>',
          nested: {
            value: 'javascript:alert(1)',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(receivedBody.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(receivedBody.nested.value).toBe('alert(1)');
    });
  });

  describe('Health Check Exceptions', () => {
    it('should allow caching for health endpoint', async () => {
      app.get('/health', async () => ({ status: 'ok' }));
      
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['cache-control']).toBe('public, max-age=60');
      expect(response.headers['x-frame-options']).toBeUndefined();
    });

    it('should skip path validation for API docs', async () => {
      app.get('/api-docs/test', async () => ({ docs: 'test' }));
      
      const response = await app.inject({
        method: 'GET',
        url: '/api-docs/test',
      });

      expect(response.statusCode).toBe(200);
    });
  });
});