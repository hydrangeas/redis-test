import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { Endpoint as APIEndpoint } from '@/domain/api/value-objects/endpoint';
import { InMemoryRateLimitService } from '@/infrastructure/services/in-memory-rate-limit.service';
import { Logger } from 'pino';
import { RateLimitPerformanceTester } from './rate-limit-setup';
import { v4 as uuidv4 } from 'uuid';

// Mock logger
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;

describe('Rate Limit Performance Tests', () => {
  let rateLimitService: InMemoryRateLimitService;
  let tester: RateLimitPerformanceTester;

  beforeEach(() => {
    // Create real rate limit service with mock logger
    rateLimitService = new InMemoryRateLimitService(mockLogger);
    tester = new RateLimitPerformanceTester(rateLimitService);
  });

  afterEach(() => {
    // Clean up
    rateLimitService.stop();
  });

  describe('High Load Tests', () => {
    it('should handle 1000+ requests per second accurately', async () => {
      const metrics = await tester.runLoadTest({
        concurrentUsers: 100,
        requestsPerUser: 100, // 10,000 total requests
        userTier: TierLevel.TIER1,
        endpoint: '/secure/test/data.json',
      });

      console.log('High Load Test Results:', {
        totalRequests: metrics.totalRequests,
        successRate: (metrics.successfulRequests / metrics.totalRequests) * 100,
        avgResponseTime: metrics.averageResponseTime.toFixed(2),
        p99ResponseTime: metrics.p99ResponseTime.toFixed(2),
        requestsPerSecond: (metrics.totalRequests / (metrics.duration / 1000)).toFixed(2),
      });

      // パフォーマンス基準
      expect(metrics.p99ResponseTime).toBeLessThan(100); // P99 < 100ms
      expect(metrics.averageResponseTime).toBeLessThan(50); // 平均 < 50ms
      
      // 正確性の検証（TIER1: 60 req/min）
      const expectedSuccessful = 100 * 60; // 各ユーザー60リクエストまで
      expect(metrics.successfulRequests).toBe(expectedSuccessful);
      expect(metrics.rateLimitedRequests).toBe(metrics.totalRequests - expectedSuccessful);
    });

    it('should scale with different tier levels', async () => {
      const tiers = [TierLevel.TIER1, TierLevel.TIER2, TierLevel.TIER3];
      const results = [];

      for (const tier of tiers) {
        const metrics = await tester.runLoadTest({
          concurrentUsers: 50,
          requestsPerUser: 100,
          userTier: tier,
          endpoint: '/secure/test/data.json',
        });
        
        results.push({ tier, metrics });
      }

      // 各ティアのレート制限が正しく適用されているか確認
      expect(results[0].metrics.successfulRequests).toBe(50 * 60); // TIER1: 60/min
      expect(results[1].metrics.successfulRequests).toBe(50 * 100); // TIER2: 120/min (limit to 100 requests)
      expect(results[2].metrics.successfulRequests).toBe(50 * 100); // TIER3: 300/min (limit to 100 requests)

      // すべてのティアでパフォーマンス基準を満たす
      results.forEach(({ tier, metrics }) => {
        expect(metrics.p99ResponseTime).toBeLessThan(100);
      });
    });
  });

  describe('Concurrency Tests', () => {
    it('should maintain accuracy under extreme concurrency', async () => {
      // 1000人の同時ユーザー
      const metrics = await tester.runLoadTest({
        concurrentUsers: 1000,
        requestsPerUser: 10,
        userTier: TierLevel.TIER1,
        endpoint: '/secure/test/data.json',
      });

      // 各ユーザーは独立してカウントされる
      const expectedSuccessPerUser = 10; // 10リクエストは制限内
      expect(metrics.successfulRequests).toBe(1000 * expectedSuccessPerUser);
      expect(metrics.rateLimitedRequests).toBe(0);
    });

    it('should handle race conditions at window boundaries', async () => {
      // Setup for window boundary test
      vi.useFakeTimers();
      
      const windowDuration = 60000; // 60秒
      const user = AuthenticatedUser.fromTokenPayload(
        uuidv4(),
        TierLevel.TIER1
      );

      const endpoint = APIEndpoint.fromString('GET /secure/test/data.json');

      // 最初の60リクエスト
      for (let i = 0; i < 60; i++) {
        const result = await rateLimitService.checkLimit(user, endpoint);
        expect(result.allowed).toBe(true);
        // Record usage after checking
        await rateLimitService.recordUsage(user, endpoint);
      }

      // 61番目は拒否される
      const exceeded = await rateLimitService.checkLimit(user, endpoint);
      expect(exceeded.allowed).toBe(false);

      // ウィンドウが経過するのを待つ（シミュレート）
      vi.advanceTimersByTime(windowDuration + 1000);

      // 新しいウィンドウでは再び許可される
      const newWindow = await rateLimitService.checkLimit(user, endpoint);
      expect(newWindow.allowed).toBe(true);
      
      vi.useRealTimers();
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not have memory leaks under sustained load', async () => {
      const iterations = 5;
      const memoryUsages = [];

      for (let i = 0; i < iterations; i++) {
        // ガベージコレクションを強制実行（Node.jsで有効な場合）
        if (global.gc) {
          global.gc();
        }

        const metrics = await tester.runLoadTest({
          concurrentUsers: 100,
          requestsPerUser: 50,
          userTier: TierLevel.TIER2,
          endpoint: '/secure/test/data.json',
        });

        memoryUsages.push(metrics.memoryUsage.heapUsed);
      }

      // メモリ使用量が線形に増加していないことを確認
      const firstUsage = memoryUsages[0];
      const lastUsage = memoryUsages[memoryUsages.length - 1];
      const increase = ((lastUsage - firstUsage) / firstUsage) * 100;

      console.log(`Memory increase over ${iterations} iterations: ${increase.toFixed(2)}%`);
      
      // メモリ増加が50%未満であることを確認
      expect(increase).toBeLessThan(50);
    });
  });
});