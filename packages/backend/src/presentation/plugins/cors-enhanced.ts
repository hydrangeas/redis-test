import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { container } from 'tsyringe';
import { DI_TOKENS } from '../../infrastructure/di/tokens.js';
import { SecurityConfigService } from '../../infrastructure/config/security.config.js';
import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

/**
 * Enhanced CORS plugin with configuration management
 */
export default fp(async function corsEnhancedPlugin(fastify: FastifyInstance) {
  // Register SecurityConfigService if not already registered
  if (!container.isRegistered(DI_TOKENS.SecurityConfig)) {
    container.register(DI_TOKENS.SecurityConfig, { useClass: SecurityConfigService });
  }

  const securityConfig = container.resolve<SecurityConfigService>(DI_TOKENS.SecurityConfig);
  const logger = container.resolve<Logger>(DI_TOKENS.Logger);
  const corsConfig = securityConfig.getCorsConfig();

  await fastify.register(cors, {
    origin: (origin, callback) => {
      // Allow same-origin requests
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is allowed
      if (securityConfig.isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      // Log rejected origins
      logger.warn({ origin }, 'CORS: Origin rejected');
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },

    methods: corsConfig.allowedMethods,
    allowedHeaders: corsConfig.allowedHeaders,
    exposedHeaders: corsConfig.exposedHeaders,
    credentials: corsConfig.credentials,
    maxAge: corsConfig.maxAge,

    // Additional options
    preflightContinue: false,
    optionsSuccessStatus: 204,
    strictPreflight: true,
  });

  // Add custom CORS handling for specific routes
  fastify.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    
    // Log CORS requests in development
    if (process.env.NODE_ENV === 'development' && origin) {
      logger.debug({
        method: request.method,
        url: request.url,
        origin,
      }, 'CORS request');
    }

    // Add Vary header for proper caching
    reply.header('Vary', 'Origin');
  });

  // Handle preflight requests
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method === 'OPTIONS') {
      // Add additional headers for preflight
      reply.header('Access-Control-Allow-Private-Network', 'true');
      
      // Log preflight requests
      logger.debug({
        origin: request.headers.origin,
        requestedMethod: request.headers['access-control-request-method'],
        requestedHeaders: request.headers['access-control-request-headers'],
      }, 'CORS preflight request');
    }
  });

  logger.info({
    allowedOrigins: corsConfig.allowedOrigins,
    credentials: corsConfig.credentials,
  }, 'Enhanced CORS plugin registered');
}, {
  name: 'cors-enhanced',
  fastify: '4.x',
});