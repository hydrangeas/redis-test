import { injectable } from 'tsyringe';
import { InjectRateLimitService, InjectLogger } from '../../infrastructure/di/decorators.js';
import type { IRateLimitService } from '../../domain/services/rate-limit.service.js';
import type { Logger } from 'pino';

export interface RateLimitCheckRequest {
  userId: string;
  tier: string;
  endpoint: string;
}

export interface RateLimitCheckResponse {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

@injectable()
export class RateLimitUseCase {
  private readonly tierLimits: Record<string, number> = {
    tier1: 60,
    tier2: 120,
    tier3: 300,
  };

  constructor(
    @InjectRateLimitService() private readonly rateLimitService: IRateLimitService,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  async checkLimit(request: RateLimitCheckRequest): Promise<RateLimitCheckResponse> {
    try {
      const { userId, tier, endpoint } = request;

      const result = await this.rateLimitService.checkRateLimit(userId, tier, endpoint);
      const limit = this.tierLimits[tier] || this.tierLimits.tier1;

      return {
        allowed: result.allowed,
        limit,
        remaining: result.remaining,
        resetAt: result.resetAt,
      };
    } catch (error) {
      this.logger.error({ error, request }, 'Rate limit check failed');
      
      // Fail open - allow the request with defaults
      return {
        allowed: true,
        limit: this.tierLimits.tier1,
        remaining: 1,
        resetAt: new Date(Date.now() + 60000), // 1 minute from now
      };
    }
  }

  async recordRequest(userId: string, endpoint: string): Promise<void> {
    try {
      await this.rateLimitService.incrementRequestCount(userId, endpoint);
    } catch (error) {
      this.logger.error({ error, userId, endpoint }, 'Failed to record request');
      // Don't throw - we don't want to fail the request
    }
  }
}