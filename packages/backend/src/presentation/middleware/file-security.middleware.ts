import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { container } from 'tsyringe';
import { SecureFileAccessService } from '@/infrastructure/services/secure-file-access.service';
import { SecurityContext } from '@/domain/data/interfaces/secure-file-access.interface';

// Extend FastifyRequest type to include security context
declare module 'fastify' {
  interface FastifyRequest {
    securityContext?: SecurityContext;
  }
}

export const fileSecurityMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const securityService = container.resolve(SecureFileAccessService);
  const user = request.user;

  // Create security context
  const context: SecurityContext = {
    userId: user?.userId?.value || 'anonymous',
    userTier: user?.tier?.level || 'none',
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'] || 'unknown',
  };

  // Set security headers
  reply.headers({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'none'",
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  });

  // Attach security context to request
  request.securityContext = context;
};