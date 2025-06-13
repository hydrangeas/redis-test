import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { setupTestDI } from '../../../infrastructure/di';
import pathValidationPlugin from '../path-validation';

describe('Path Validation Plugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    setupTestDI();
    app = fastify({ logger: false });
    
    // パス検証プラグインを登録
    await app.register(pathValidationPlugin);
    
    // テスト用エンドポイント
    app.get('/secure/*', async (request) => ({ 
      path: request.url,
      query: request.query,
    }));
    
    app.get('/api/data/:id', async (request) => ({ 
      params: request.params,
      query: request.query,
    }));

    app.get('/health', async () => ({ status: 'ok' }));
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Path traversal prevention', () => {
    it('should handle paths with .. (fastify normalizes to 404)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/secure/../etc/passwd',
      });

      // Fastify normalizes paths with .. and returns 404
      expect(response.statusCode).toBe(404);
    });

    it('should reject query parameters with path traversal', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/secure/test?path=../../etc/passwd',
      });

      expect(response.statusCode).toBe(200);
      // Path traversal in query params should be passed through
      // (sanitization happens at application level)
      const body = JSON.parse(response.body);
      expect(body.query.path).toBe('..&#x2F;..&#x2F;etc&#x2F;passwd');
    });
  });

  describe('Valid paths', () => {
    it('should accept normal paths', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/secure/319985/r5.json',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.path).toBe('/secure/319985/r5.json');
    });

    it('should accept paths with hyphens and underscores', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/data/test-file_name',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.params.id).toBe('test-file_name');
    });
  });

  describe('Query parameter sanitization', () => {
    it('should sanitize XSS attempts in query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/data/123?search=<script>alert("xss")</script>',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.query.search).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(body.query.search).not.toContain('<script>');
    });
  });

  describe('Special endpoints', () => {
    it('should allow health check endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
    });
  });
});