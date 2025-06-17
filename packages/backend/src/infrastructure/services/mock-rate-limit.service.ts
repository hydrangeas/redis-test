import { injectable } from 'tsyringe';
import {
  IRateLimitService,
  RateLimitCheckResult,
} from '@/domain/api/interfaces/rate-limit-service.interface';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { Endpoint as APIEndpoint } from '@/domain/api/value-objects/endpoint';

/**
 * レート制限サービスのモック実装
 * 開発・テスト用
 */
@injectable()
export class MockRateLimitService implements IRateLimitService {
  private usageMap = new Map<string, number>();
  private windowStart = new Date();

  async checkLimit(user: AuthenticatedUser, endpoint: APIEndpoint): Promise<RateLimitCheckResult> {
    const key = `${user.userId.value}:${endpoint.path}`;
    const currentCount = this.usageMap.get(key) || 0;
    const limit = user.tier.rateLimit.maxRequests;

    // ウィンドウのリセット（1分経過後）
    const now = new Date();
    if (now.getTime() - this.windowStart.getTime() > user.tier.rateLimit.windowSeconds * 1000) {
      this.usageMap.clear();
      this.windowStart = now;
    }

    const allowed = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount);
    const resetAt = new Date(this.windowStart.getTime() + user.tier.rateLimit.windowSeconds * 1000);
    const retryAfter = allowed ? undefined : Math.ceil((resetAt.getTime() - now.getTime()) / 1000);

    return {
      allowed,
      limit,
      remaining,
      resetAt,
      retryAfter,
    };
  }

  async recordUsage(user: AuthenticatedUser, endpoint: APIEndpoint): Promise<void> {
    const key = `${user.userId.value}:${endpoint.path}`;
    const currentCount = this.usageMap.get(key) || 0;
    this.usageMap.set(key, currentCount + 1);
  }

  async getUsageStatus(user: AuthenticatedUser): Promise<{
    currentCount: number;
    limit: number;
    windowStart: Date;
    windowEnd: Date;
  }> {
    let totalCount = 0;

    // Sum all endpoints for this user
    for (const [k, v] of this.usageMap.entries()) {
      if (k.startsWith(user.userId.value)) {
        totalCount += v;
      }
    }

    return {
      currentCount: totalCount,
      limit: user.tier.rateLimit.maxRequests,
      windowStart: this.windowStart,
      windowEnd: new Date(this.windowStart.getTime() + user.tier.rateLimit.windowSeconds * 1000),
    };
  }

  async resetLimit(userId: string): Promise<void> {
    // Remove all entries for this user
    for (const key of this.usageMap.keys()) {
      if (key.startsWith(userId)) {
        this.usageMap.delete(key);
      }
    }
  }
}
