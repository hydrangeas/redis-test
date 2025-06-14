import fp from 'fastify-plugin';
import { validatePath, sanitizeInput, sanitizeJson } from '../middleware/path-validation.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    sanitizeInput: (input: string) => string;
    sanitizeJson: <T extends Record<string, any>>(input: T, maxDepth?: number) => T;
  }
}

/**
 * Enhanced path validation plugin
 * Prevents path traversal attacks and provides input sanitization
 */
export default fp(async function pathValidationPlugin(fastify: FastifyInstance) {
  // Add sanitization methods to request
  fastify.decorateRequest('sanitizeInput', null);
  fastify.decorateRequest('sanitizeJson', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.sanitizeInput = sanitizeInput;
    request.sanitizeJson = sanitizeJson;
  });

  // Apply path validation to all routes except health and docs
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip validation for health check and API docs
    if (
      request.url === '/health' ||
      request.url === '/api/health' ||
      request.url.startsWith('/api-docs') ||
      request.url.startsWith('/api/v1/docs')
    ) {
      return;
    }

    // Validate the path
    await validatePath(request, reply);
  });

  // Sanitize query parameters
  fastify.addHook('preValidation', async (request) => {
    if (request.query && typeof request.query === 'object') {
      try {
        request.query = sanitizeJson(request.query as Record<string, any>, 5);
      } catch (error) {
        fastify.log.warn({ error, query: request.query }, 'Failed to sanitize query parameters');
      }
    }
  });

  // Sanitize request body
  fastify.addHook('preValidation', async (request) => {
    if (request.body && typeof request.body === 'object') {
      try {
        request.body = sanitizeJson(request.body as Record<string, any>, 10);
      } catch (error) {
        fastify.log.warn({ error }, 'Failed to sanitize request body');
      }
    }
  });

  // Log security events
  fastify.addHook('onError', async (request, reply, error) => {
    if (error.statusCode === 400 || error.statusCode === 403) {
      fastify.log.warn({
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        path: request.url,
        method: request.method,
        error: error.message,
      }, 'Security validation error');
    }
  });

  fastify.log.info('Enhanced path validation plugin registered');
}, {
  name: 'path-validation',
  fastify: '4.x',
});