import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { RateLimitCheckResult } from '@/application/interfaces/rate-limit-use-case.interface';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    authenticatedUser?: AuthenticatedUser;
    rateLimitStatus?: RateLimitCheckResult;
    apiLoggingContext?: {
      startTime: number;
      userId?: string;
      userTier?: string;
      requestId: string;
    };
    jwtPayload?: {
      sub: string;
      email?: string;
      tier?: string;
      provider?: string;
      exp?: number;
      iat?: number;
    };
  }

  interface FastifyContextConfig {
    requireAuth?: boolean;
  }
}
