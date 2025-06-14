import { injectable } from 'tsyringe';
import { InjectRateLimitRepository, InjectLogger, InjectAppConfig } from '../../infrastructure/di/decorators.js';
import type { IRateLimitRepository } from '../../infrastructure/repositories/rate-limit.repository.js';
import type { Logger } from 'pino';

export interface RateLimitConfig {
  tier1: number;
  tier2: number;
  tier3: number;
  windowMinutes: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface IRateLimitService {
  checkRateLimit(userId: string, tier: string, endpoint: string): Promise<RateLimitResult>;
  incrementRequestCount(userId: string, endpoint: string): Promise<void>;
}

@injectable()
export class RateLimitService implements IRateLimitService {
  private readonly rateLimits: RateLimitConfig = {
    tier1: 60,
    tier2: 120,
    tier3: 300,
    windowMinutes: 1,
  };

  constructor(
    @InjectRateLimitRepository() private readonly repository: IRateLimitRepository,
    @InjectLogger() private readonly logger: Logger,
    @InjectAppConfig() private readonly config: any,
  ) {
    // Override with config if available
    if (config.rateLimits) {
      Object.assign(this.rateLimits, config.rateLimits);
    }
  }

  async checkRateLimit(userId: string, tier: string, endpoint: string): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.rateLimits.windowMinutes * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + this.rateLimits.windowMinutes * 60 * 1000);

    try {
      const count = await this.repository.getRequestCount(userId, endpoint, windowStart);
      const limit = this.getRateLimitForTier(tier);
      
      const allowed = count < limit;
      const remaining = Math.max(0, limit - count);
      
      return {
        allowed,
        remaining,
        resetAt: windowEnd,
      };
    } catch (error) {
      this.logger.error({ error, userId, tier, endpoint }, 'Failed to check rate limit');
      // Fail open - allow the request
      return {
        allowed: true,
        remaining: 1,
        resetAt: windowEnd,
      };
    }
  }

  async incrementRequestCount(userId: string, endpoint: string): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.rateLimits.windowMinutes * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + this.rateLimits.windowMinutes * 60 * 1000);

    try {
      await this.repository.incrementRequestCount(userId, endpoint, windowStart, windowEnd);
    } catch (error) {
      this.logger.error({ error, userId, endpoint }, 'Failed to increment request count');
      // Don't throw - we don't want to fail the request
    }
  }

  private getRateLimitForTier(tier: string): number {
    const key = tier as keyof typeof this.rateLimits;
    return this.rateLimits[key] || this.rateLimits.tier1;
  }
}