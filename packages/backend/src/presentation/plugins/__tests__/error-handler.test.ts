import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { setupTestDI } from '../../../infrastructure/di';
import errorHandlerPlugin from '../error-handler';
import { 
  AuthenticationException,
  ValidationException,
  ResourceNotFoundException,
} from '../../../domain/errors';

describe('Error Handler Plugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    setupTestDI();
    app = fastify({ logger: false });
    await app.register(errorHandlerPlugin);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Domain Exception handling', () => {
    it('should handle AuthenticationException', async () => {
      app.get('/test', async () => {
        throw new AuthenticationException('google', 'Invalid token');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['content-type']).toContain('application/problem+json');
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/auth-failed'),
        title: 'Authentication failed: Invalid token',
        status: 401,
        detail: 'Authentication failed: Invalid token',
        instance: '/test',
      });
    });

    it('should handle ValidationException with errors array', async () => {
      app.get('/test', async () => {
        throw new ValidationException('email', 'test@', ['Invalid format']);
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.errors).toEqual([{
        field: 'email',
        constraints: ['Invalid format'],
      }]);
    });
  });

  describe('Fastify validation errors', () => {
    it('should handle validation errors', async () => {
      const schema = {
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
          },
          required: ['email'],
        },
      };

      app.post('/test', { schema }, async () => {
        return { ok: true };
      });

      const response = await app.inject({
        method: 'POST',
        url: '/test',
        body: { email: 'invalid' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.headers['content-type']).toContain('application/problem+json');
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/validation-error'),
        title: 'Validation Error',
        status: 400,
        detail: 'Request validation failed',
        instance: '/test',
      });
      expect(body.errors).toBeDefined();
    });
  });

  describe('404 Not Found handling', () => {
    it('should handle non-existent routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/non-existent',
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toContain('application/problem+json');
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/not-found'),
        title: 'Resource not found',
        status: 404,
        detail: "The requested resource '/non-existent' does not exist",
        instance: '/non-existent',
      });
    });
  });

  describe('Generic error handling', () => {
    it('should handle unexpected errors', async () => {
      app.get('/test', async () => {
        throw new Error('Unexpected error');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(500);
      expect(response.headers['content-type']).toContain('application/problem+json');
      
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        type: expect.stringContaining('/errors/internal-server-error'),
        title: 'Internal Server Error',
        status: 500,
        instance: '/test',
      });
    });
  });

  describe('Error logging', () => {
    it('should log errors with request context', async () => {
      const mockLogger = {
        error: vi.fn(),
      };
      
      app.decorateRequest('log', mockLogger);
      app.decorateRequest('id', 'req-123');
      
      app.get('/test', async () => {
        throw new ResourceNotFoundException('User', 'user-123');
      });

      await app.inject({
        method: 'GET',
        url: '/test',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.any(ResourceNotFoundException),
          requestId: 'req-123',
          method: 'GET',
          url: '/test',
        }),
        'Request error occurred'
      );
    });
  });
});