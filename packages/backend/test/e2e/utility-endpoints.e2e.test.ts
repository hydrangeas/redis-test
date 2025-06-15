/**
 * Utility Endpoints E2E Tests
 * Tests health check, API documentation, and other utility endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { 
  setupTestEnvironment, 
  teardownTestEnvironment,
  createTestUser,
  getBaseUrl
} from './setup';

describe('Utility Endpoints E2E', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    ({ app } = await setupTestEnvironment());
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe('GET /health', () => {
    it('should return health status without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
      expect(body.version).toBeDefined();
      expect(body.environment).toBe('development');
    });

    it('should include service health checks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = JSON.parse(response.body);
      expect(body.services).toBeDefined();
      expect(body.services).toHaveProperty('database');
      expect(body.services).toHaveProperty('fileSystem');
      expect(body.services).toHaveProperty('cache');
      
      // All services should be healthy in test environment
      expect(body.services.database.status).toBe('healthy');
      expect(body.services.fileSystem.status).toBe('healthy');
      expect(body.services.cache.status).toBe('healthy');
      
      // Check response times
      expect(body.services.database.responseTime).toBeDefined();
      expect(body.services.database.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should include system metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = JSON.parse(response.body);
      expect(body.metrics).toBeDefined();
      expect(body.metrics.uptime).toBeGreaterThan(0);
      expect(body.metrics.memory).toBeDefined();
      expect(body.metrics.memory.used).toBeGreaterThan(0);
      expect(body.metrics.memory.total).toBeGreaterThan(0);
      expect(body.metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(body.metrics.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should be accessible with authentication', async () => {
      const { token } = await createTestUser('tier1');

      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
    });

    it('should not include sensitive information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = JSON.parse(response.body);
      const bodyString = JSON.stringify(body);
      
      // Should not contain sensitive data
      expect(bodyString).not.toContain('password');
      expect(bodyString).not.toContain('secret');
      expect(bodyString).not.toContain('key');
      expect(bodyString).not.toContain('token');
      expect(bodyString).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    });
  });

  describe('GET /api-docs', () => {
    it('should serve API documentation without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-docs',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<!DOCTYPE html>');
      expect(response.body).toContain('Scalar API Reference');
      expect(response.body).toContain('OpenData API');
    });

    it('should include proper meta tags', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-docs',
      });

      expect(response.body).toContain('<meta charset="utf-8">');
      expect(response.body).toContain('<meta name="viewport"');
      expect(response.body).toContain('content="width=device-width, initial-scale=1"');
    });

    it('should reference the OpenAPI spec', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-docs',
      });

      // Should contain reference to OpenAPI spec endpoint
      expect(response.body).toMatch(/spec[-_]?url|openapi|swagger/i);
    });
  });

  describe('GET /api-docs/json', () => {
    it('should return OpenAPI specification in JSON format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-docs/json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      const spec = JSON.parse(response.body);
      expect(spec.openapi).toBeDefined();
      expect(spec.openapi).toMatch(/^3\.\d+\.\d+$/); // OpenAPI 3.x.x
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('OpenData API');
      expect(spec.info.version).toBeDefined();
      expect(spec.paths).toBeDefined();
      expect(spec.components).toBeDefined();
    });

    it('should include all API endpoints in specification', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-docs/json',
      });

      const spec = JSON.parse(response.body);
      const paths = Object.keys(spec.paths);

      // Check for required endpoints
      expect(paths).toContain('/health');
      expect(paths).toContain('/auth/callback');
      expect(paths).toContain('/auth/logout');
      expect(paths).toContain('/auth/refresh');
      expect(paths).toContain('/auth/me');
      expect(paths.some(p => p.includes('/secure/'))).toBe(true);
    });

    it('should include security schemes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-docs/json',
      });

      const spec = JSON.parse(response.body);
      expect(spec.components.securitySchemes).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth.type).toBe('http');
      expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
      expect(spec.components.securitySchemes.bearerAuth.bearerFormat).toBe('JWT');
    });

    it('should include error response schemas', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api-docs/json',
      });

      const spec = JSON.parse(response.body);
      expect(spec.components.schemas).toBeDefined();
      expect(spec.components.schemas.ProblemDetails).toBeDefined();
      
      const problemDetails = spec.components.schemas.ProblemDetails;
      expect(problemDetails.properties).toHaveProperty('type');
      expect(problemDetails.properties).toHaveProperty('title');
      expect(problemDetails.properties).toHaveProperty('status');
      expect(problemDetails.properties).toHaveProperty('detail');
      expect(problemDetails.properties).toHaveProperty('instance');
    });
  });

  describe('GET / (Root)', () => {
    it('should redirect to API documentation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe('/api-docs');
    });

    it('should handle trailing slash', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '//',
      });

      expect([302, 404]).toContain(response.statusCode);
    });
  });

  describe('404 Not Found', () => {
    it('should return RFC 7807 compliant error for non-existent routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/non-existent-endpoint',
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toContain('application/problem+json');
      
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/not-found');
      expect(body.title).toBe('Not Found');
      expect(body.status).toBe(404);
      expect(body.detail).toBe('Route not found');
      expect(body.instance).toBe('/non-existent-endpoint');
    });

    it('should handle various HTTP methods on non-existent routes', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const response = await app.inject({
          method,
          url: '/api/v2/non-existent',
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.body);
        expect(body.type).toBe('https://api.opendata.nara/errors/not-found');
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in all responses', async () => {
      const endpoints = [
        { method: 'GET', url: '/health' },
        { method: 'GET', url: '/api-docs' },
        { method: 'GET', url: '/api-docs/json' },
        { method: 'GET', url: '/non-existent' },
        { method: 'POST', url: '/auth/logout' },
      ];

      for (const { method, url } of endpoints) {
        const response = await app.inject({ method, url });

        // Core security headers
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
        
        // HSTS header (may be conditional based on HTTPS)
        if (response.headers['strict-transport-security']) {
          expect(response.headers['strict-transport-security']).toContain('max-age=');
        }

        // Additional security headers
        expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
        expect(response.headers['referrer-policy']).toBeDefined();
      }
    });

    it('should not expose server information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      // Should not expose server details
      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Request Validation', () => {
    it('should validate content-type for POST requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/callback',
        headers: {
          'Content-Type': 'text/plain',
        },
        payload: 'invalid',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/bad-request');
      expect(body.detail).toContain('Content-Type');
    });

    it('should handle malformed JSON', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/callback',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: '{"invalid": json}',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/bad-request');
      expect(body.detail).toContain('Invalid JSON');
    });

    it('should enforce request size limits', async () => {
      const largePayload = JSON.stringify({
        data: 'x'.repeat(1024 * 1024 * 2), // 2MB of data
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/callback',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: largePayload,
      });

      expect(response.statusCode).toBe(413);
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/payload-too-large');
      expect(body.title).toBe('Payload Too Large');
    });
  });

  describe('Monitoring Endpoints', () => {
    it('should expose metrics endpoint for monitoring', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      // Metrics might be protected or not implemented
      if (response.statusCode === 200) {
        expect(response.headers['content-type']).toContain('text/plain');
        expect(response.body).toContain('# HELP');
        expect(response.body).toContain('# TYPE');
      } else {
        // If not implemented, should return 404
        expect(response.statusCode).toBe(404);
      }
    });

    it('should track request metrics', async () => {
      // Make several requests
      await app.inject({ method: 'GET', url: '/health' });
      await app.inject({ method: 'GET', url: '/api-docs/json' });
      
      const { token } = await createTestUser('tier1');
      await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { Authorization: `Bearer ${token}` },
      });

      // Check if metrics are being tracked
      const metricsResponse = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      if (metricsResponse.statusCode === 200) {
        expect(metricsResponse.body).toContain('http_request_duration');
        expect(metricsResponse.body).toContain('http_requests_total');
      }
    });
  });
});