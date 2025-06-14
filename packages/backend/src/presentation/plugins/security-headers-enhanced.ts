import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import { container } from 'tsyringe';
import { DI_TOKENS } from '../../infrastructure/di/tokens.js';
import { SecurityConfigService } from '../../infrastructure/config/security.config.js';
import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

/**
 * Enhanced security headers plugin with comprehensive protection
 */
export default fp(async function securityHeadersEnhancedPlugin(fastify: FastifyInstance) {
  // Register SecurityConfigService if not already registered
  if (!container.isRegistered(DI_TOKENS.SecurityConfig)) {
    container.register(DI_TOKENS.SecurityConfig, { useClass: SecurityConfigService });
  }

  const securityConfig = container.resolve<SecurityConfigService>(DI_TOKENS.SecurityConfig);
  const logger = container.resolve<Logger>(DI_TOKENS.Logger);
  const headersConfig = securityConfig.getSecurityHeadersConfig();

  // Register helmet with configuration
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: headersConfig.contentSecurityPolicy.directives,
      reportOnly: false,
    },
    hsts: headersConfig.hsts,
    noSniff: headersConfig.contentTypeOptions,
    frameguard: {
      action: headersConfig.frameOptions.toLowerCase() as 'deny' | 'sameorigin',
    },
    xssFilter: headersConfig.xssProtection,
    referrerPolicy: {
      policy: headersConfig.referrerPolicy as any,
    },
    permittedCrossDomainPolicies: false,
    hidePoweredBy: true,
    ieNoOpen: true,
    dnsPrefetchControl: {
      allow: false,
    },
    originAgentCluster: true,
  });

  // Add custom security headers
  fastify.addHook('onSend', async (request, reply) => {
    // API Version header
    reply.header('X-API-Version', process.env.API_VERSION || '1.0.0');
    
    // Request ID for tracing
    const requestId = request.id || reply.getHeader('X-Request-ID');
    if (requestId) {
      reply.header('X-Request-ID', requestId);
    }

    // Cache control for API endpoints
    if (request.url.startsWith('/api/')) {
      // No caching for API responses by default
      if (!reply.hasHeader('Cache-Control')) {
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        reply.header('Pragma', 'no-cache');
        reply.header('Expires', '0');
      }
    }

    // Permissions Policy (replacing Feature Policy)
    const permissionsPolicyParts: string[] = [];
    for (const [feature, allowList] of Object.entries(headersConfig.permissionsPolicy)) {
      const value = allowList.length === 0 ? '()' : `(${allowList.join(' ')})`;
      permissionsPolicyParts.push(`${feature}=${value}`);
    }
    if (permissionsPolicyParts.length > 0) {
      reply.header('Permissions-Policy', permissionsPolicyParts.join(', '));
    }

    // Additional security headers
    reply.header('X-Permitted-Cross-Domain-Policies', 'none');
    reply.header('Cross-Origin-Embedder-Policy', 'require-corp');
    reply.header('Cross-Origin-Opener-Policy', 'same-origin');
    reply.header('Cross-Origin-Resource-Policy', 'same-origin');
    
    // Prevent content type sniffing for specific endpoints
    if (request.url.includes('/download/') || request.url.includes('/file/')) {
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('Content-Disposition', 'attachment');
    }
  });

  // Special handling for health check endpoint
  fastify.addHook('onSend', async (request, reply) => {
    if (request.url === '/health' || request.url === '/api/health') {
      // Allow caching for health checks
      reply.header('Cache-Control', 'public, max-age=60');
      // Remove unnecessary security headers for health endpoint
      reply.removeHeader('X-Frame-Options');
      reply.removeHeader('Content-Security-Policy');
    }
  });

  // Log security configuration
  logger.info({
    hsts: headersConfig.hsts,
    csp: Object.keys(headersConfig.contentSecurityPolicy.directives),
    frameOptions: headersConfig.frameOptions,
  }, 'Enhanced security headers plugin registered');

  // Security headers validation in development
  if (process.env.NODE_ENV === 'development') {
    fastify.addHook('onSend', async (request, reply) => {
      const headers = reply.getHeaders();
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'strict-transport-security',
        'content-security-policy',
      ];

      const missingHeaders = securityHeaders.filter(
        (header) => !Object.keys(headers).some((h) => h.toLowerCase() === header),
      );

      if (missingHeaders.length > 0 && !request.url.includes('/health')) {
        logger.warn({
          url: request.url,
          missingHeaders,
        }, 'Missing security headers');
      }
    });
  }
}, {
  name: 'security-headers-enhanced',
  fastify: '4.x',
  dependencies: ['cors-enhanced'],
});