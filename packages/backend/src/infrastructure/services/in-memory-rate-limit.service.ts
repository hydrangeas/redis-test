import { injectable, inject } from 'tsyringe';
import {
  IRateLimitService,
  RateLimitCheckResult,
} from '@/domain/api/interfaces/rate-limit-service.interface';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { Endpoint as APIEndpoint } from '@/domain/api/value-objects/endpoint';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Logger } from 'pino';
import { metrics } from '@/plugins/monitoring';

interface WindowEntry {
  timestamp: number;
  count: number;
}

@injectable()
export class InMemoryRateLimitService implements IRateLimitService {
  private windows = new Map<string, WindowEntry[]>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {
    // 定期的なクリーンアップ（メモリリーク防止）
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 1分ごと
  }

  async checkLimit(user: AuthenticatedUser, endpoint: APIEndpoint): Promise<RateLimitCheckResult> {
    const key = this.generateKey(user, endpoint);
    const now = Date.now();
    const windowSize = user.tier.rateLimit.windowSeconds * 1000; // ミリ秒に変換
    const limit = user.tier.rateLimit.maxRequests;

    // ウィンドウの取得または作成
    let entries = this.windows.get(key) || [];

    // 古いエントリを削除（スライディングウィンドウ）
    entries = entries.filter((entry) => now - entry.timestamp < windowSize);

    // 現在のカウント
    const currentCount = entries.reduce((sum, entry) => sum + entry.count, 0);
    const remaining = Math.max(0, limit - currentCount);
    const allowed = currentCount < limit;

    // リセット時刻の計算（最も古いエントリから）
    let resetAt: Date;
    if (entries.length > 0) {
      const oldestEntry = entries[0];
      resetAt = new Date(oldestEntry.timestamp + windowSize);
    } else {
      resetAt = new Date(now + windowSize);
    }

    // Retry-Afterの計算
    let retryAfter = 0;
    if (!allowed && entries.length > 0) {
      const oldestEntry = entries[0];
      const nextAvailable = oldestEntry.timestamp + windowSize;
      retryAfter = Math.ceil((nextAvailable - now) / 1000);
    }

    // ウィンドウを更新
    this.windows.set(key, entries);

    // メトリクスを記録
    metrics.rateLimitHits.inc({
      user_tier: user.tier.level,
      endpoint: endpoint.path.value,
    });

    if (!allowed) {
      metrics.rateLimitExceeded.inc({
        user_tier: user.tier.level,
        endpoint: endpoint.path.value,
      });
    }

    this.logger.debug(
      {
        userId: user.userId.value,
        tier: user.tier.level,
        endpoint: endpoint.toString(),
        currentCount,
        limit,
        remaining,
        allowed,
      },
      'Rate limit check',
    );

    return {
      allowed,
      limit,
      remaining,
      resetAt,
      retryAfter,
    };
  }

  async recordUsage(user: AuthenticatedUser, endpoint: APIEndpoint): Promise<void> {
    const key = this.generateKey(user, endpoint);
    const now = Date.now();
    const windowSize = user.tier.rateLimit.windowSeconds * 1000;

    let entries = this.windows.get(key) || [];

    // 古いエントリを削除
    entries = entries.filter((entry) => now - entry.timestamp < windowSize);

    // 新しいエントリを追加
    entries.push({
      timestamp: now,
      count: 1,
    });

    this.windows.set(key, entries);

    this.logger.debug(
      {
        userId: user.userId.value,
        endpoint: endpoint.toString(),
        entryCount: entries.length,
      },
      'Rate limit usage recorded',
    );
  }

  async getUsageStatus(
    user: AuthenticatedUser,
  ): Promise<{
    currentCount: number;
    limit: number;
    windowStart: Date;
    windowEnd: Date;
  }> {
    const now = Date.now();
    const windowSize = user.tier.rateLimit.windowSeconds * 1000;
    const limit = user.tier.rateLimit.maxRequests;

    // Aggregate usage across all endpoints for this user
    let totalCount = 0;
    const prefix = `${user.userId.value}:`;
    
    for (const [key, entries] of this.windows.entries()) {
      if (key.startsWith(prefix)) {
        const validEntries = entries.filter((entry) => now - entry.timestamp < windowSize);
        totalCount += validEntries.reduce((sum, entry) => sum + entry.count, 0);
      }
    }

    const windowStart = new Date(now - windowSize);
    const windowEnd = new Date(now);

    return {
      currentCount: totalCount,
      limit,
      windowStart,
      windowEnd,
    };
  }

  async resetLimit(userId: string): Promise<void> {
    // Reset all endpoints for the user
    const prefix = `${userId}:`;
    for (const key of this.windows.keys()) {
      if (key.startsWith(prefix)) {
        this.windows.delete(key);
      }
    }

    this.logger.info(
      {
        userId,
      },
      'Rate limit reset',
    );
  }

  private generateKey(user: AuthenticatedUser, endpoint: APIEndpoint): string {
    // ユーザーIDとエンドポイントパスでキーを生成
    // 将来的にはIPアドレスなども含められる
    return `${user.userId.value}:${endpoint.path.value}`;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // 期限切れのウィンドウを削除
    for (const [key, entries] of this.windows.entries()) {
      // すべてのエントリが1時間以上古い場合は削除
      const allOld = entries.every((entry) => now - entry.timestamp > 3600000);

      if (allOld || entries.length === 0) {
        this.windows.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        {
          cleanedCount,
          remainingWindows: this.windows.size,
        },
        'Rate limit windows cleaned up',
      );
    }
  }

  // クリーンアップタイマーの停止
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
