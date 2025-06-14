import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { RateLimitCheckResult } from '@/application/interfaces/rate-limit-use-case.interface';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser & {
      sub: string;
      email?: string;
      tier?: string;
      provider?: string;
      exp?: number;
      iat?: number;
    };
    authenticatedUser?: AuthenticatedUser;
    rateLimitStatus?: RateLimitCheckResult;
  }
  
  interface FastifyContextConfig {
    requireAuth?: boolean;
  }
}