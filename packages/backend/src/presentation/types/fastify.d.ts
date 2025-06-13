import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    authenticatedUser?: AuthenticatedUser;
  }
  
  interface FastifyContextConfig {
    requireAuth?: boolean;
  }
}