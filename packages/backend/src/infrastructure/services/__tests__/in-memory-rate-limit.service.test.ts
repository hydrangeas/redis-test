import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryRateLimitService } from '../in-memory-rate-limit.service';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { Endpoint as APIEndpoint } from '@/domain/api/value-objects/endpoint';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { ApiPath } from '@/domain/api/value-objects/api-path';
import { Logger } from 'pino';

describe('InMemoryRateLimitService', () => {
  let service: InMemoryRateLimitService;
  let mockLogger: Logger;

  const createMockUser = (tier: string = 'TIER1', userIdValue?: string): AuthenticatedUser => {
    // Generate unique UUID if not provided
    const id = userIdValue || `550e8400-e29b-41d4-a716-${Math.random().toString(16).substring(2, 14)}`;
    const userIdResult = UserId.create(id);
    if (userIdResult.isFailure) throw new Error('Invalid user ID');
    const userId = userIdResult.getValue();
    
    const userTierResult = UserTier.create(tier.toUpperCase() as any);
    if (userTierResult.isFailure) throw new Error(`Invalid tier: ${tier}`);
    const userTier = userTierResult.getValue();
    
    return new AuthenticatedUser(userId, userTier);
  };

  const createEndpoint = (path: string = '/api/test'): APIEndpoint => {
    return new APIEndpoint(HttpMethod.GET, new ApiPath(path));
  };

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;

    service = new InMemoryRateLimitService(mockLogger);
  });

  afterEach(() => {
    service.stop();
    vi.clearAllMocks();
  });

  describe('checkLimit', () => {
    it('should allow requests within rate limit', async () => {
      const user = createMockUser('TIER1'); // 60 requests per minute
      const endpoint = createEndpoint();

      const result = await service.checkLimit(user, endpoint);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(60);
      expect(result.remaining).toBe(60);
      expect(result.retryAfter).toBe(0);
    });

    it('should track requests and decrease remaining count', async () => {
      const user = createMockUser('TIER1');
      const endpoint = createEndpoint();

      // First check
      await service.checkLimit(user, endpoint);
      
      // Record usage
      await service.recordUsage(user, endpoint);

      // Second check
      const result = await service.checkLimit(user, endpoint);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });

    it('should block requests when limit is exceeded', async () => {
      const user = createMockUser('TIER1');
      const endpoint = createEndpoint();

      // Record 60 requests (the limit)
      for (let i = 0; i < 60; i++) {
        await service.recordUsage(user, endpoint);
      }

      const result = await service.checkLimit(user, endpoint);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should use sliding window for rate limiting', async () => {
      const user = createMockUser('TIER1');
      const endpoint = createEndpoint();

      // Record some requests
      await service.recordUsage(user, endpoint);
      await service.recordUsage(user, endpoint);

      // Wait a bit and check - should still count previous requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let result = await service.checkLimit(user, endpoint);
      expect(result.remaining).toBe(58);

      // Mock time to simulate window expiry
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => originalDateNow() + 61000); // 61 seconds later

      // Check again - window should have reset
      result = await service.checkLimit(user, endpoint);
      expect(result.remaining).toBe(60);

      Date.now = originalDateNow;
    });

    it('should track rate limits per user and endpoint', async () => {
      const user1 = createMockUser('TIER1', '550e8400-e29b-41d4-a716-446655440001');
      const user2 = createMockUser('TIER2', '550e8400-e29b-41d4-a716-446655440002');
      const endpoint1 = createEndpoint('/api/test1');
      const endpoint2 = createEndpoint('/api/test2');

      // Record usage for different combinations
      await service.recordUsage(user1, endpoint1);
      await service.recordUsage(user1, endpoint2);
      await service.recordUsage(user2, endpoint1);

      // Check limits - should be independent
      const result1 = await service.checkLimit(user1, endpoint1);
      expect(result1.remaining).toBe(59);

      const result2 = await service.checkLimit(user1, endpoint2);
      expect(result2.remaining).toBe(59);

      const result3 = await service.checkLimit(user2, endpoint1);
      expect(result3.remaining).toBe(119); // tier2 has 120 limit
    });

    it('should respect different tier limits', async () => {
      const tier1User = createMockUser('TIER1'); // 60/min
      const tier2User = createMockUser('TIER2'); // 120/min
      const tier3User = createMockUser('TIER3'); // 300/min
      const endpoint = createEndpoint();

      const result1 = await service.checkLimit(tier1User, endpoint);
      expect(result1.limit).toBe(60);

      const result2 = await service.checkLimit(tier2User, endpoint);
      expect(result2.limit).toBe(120);

      const result3 = await service.checkLimit(tier3User, endpoint);
      expect(result3.limit).toBe(300);
    });
  });

  describe('recordUsage', () => {
    it('should record API usage', async () => {
      const user = createMockUser();
      const endpoint = createEndpoint();

      await service.recordUsage(user, endpoint);

      const result = await service.checkLimit(user, endpoint);
      expect(result.remaining).toBe(59);
    });

    it('should handle concurrent usage recording', async () => {
      const user = createMockUser();
      const endpoint = createEndpoint();

      // Record multiple requests concurrently
      await Promise.all([
        service.recordUsage(user, endpoint),
        service.recordUsage(user, endpoint),
        service.recordUsage(user, endpoint),
      ]);

      const result = await service.checkLimit(user, endpoint);
      expect(result.remaining).toBe(57);
    });
  });

  describe('getUsageStatus', () => {
    it('should return current usage status', async () => {
      const user = createMockUser();
      const endpoint = createEndpoint();

      await service.recordUsage(user, endpoint);
      await service.recordUsage(user, endpoint);

      const status = await service.getUsageStatus(user, endpoint);

      expect(status.currentCount).toBe(2);
      expect(status.limit).toBe(60);
      expect(status.windowStart).toBeInstanceOf(Date);
      expect(status.windowEnd).toBeInstanceOf(Date);
    });

    it('should return empty status for new user', async () => {
      const user = createMockUser();
      const endpoint = createEndpoint();

      const status = await service.getUsageStatus(user, endpoint);

      expect(status.currentCount).toBe(0);
      expect(status.limit).toBe(60);
    });
  });

  describe('resetLimit', () => {
    it('should reset limit for specific endpoint', async () => {
      const user = createMockUser();
      const endpoint = createEndpoint();

      // Record some usage
      await service.recordUsage(user, endpoint);
      await service.recordUsage(user, endpoint);

      // Reset
      await service.resetLimit(user, endpoint);

      // Check - should be back to full limit
      const result = await service.checkLimit(user, endpoint);
      expect(result.remaining).toBe(60);
    });

    it('should reset all endpoints for a user', async () => {
      const user = createMockUser();
      const endpoint1 = createEndpoint('/api/test1');
      const endpoint2 = createEndpoint('/api/test2');

      // Record usage on multiple endpoints
      await service.recordUsage(user, endpoint1);
      await service.recordUsage(user, endpoint2);

      // Reset all
      await service.resetLimit(user);

      // Check both endpoints
      const result1 = await service.checkLimit(user, endpoint1);
      expect(result1.remaining).toBe(60);

      const result2 = await service.checkLimit(user, endpoint2);
      expect(result2.remaining).toBe(60);
    });
  });

  describe('cleanup', () => {
    it('should clean up old entries', async () => {
      const user = createMockUser();
      const endpoint = createEndpoint();

      // Record usage
      await service.recordUsage(user, endpoint);

      // Mock time to simulate old entries
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => originalDateNow() + 3700000); // 1 hour + later

      // Trigger cleanup
      (service as any).cleanup();

      // Check - old entries should be removed
      const result = await service.checkLimit(user, endpoint);
      expect(result.remaining).toBe(60);

      Date.now = originalDateNow;
    });
  });

  describe('edge cases', () => {
    it('should handle empty windows correctly', async () => {
      const user = createMockUser();
      const endpoint = createEndpoint();

      const result = await service.checkLimit(user, endpoint);

      expect(result.allowed).toBe(true);
      expect(result.resetAt).toBeGreaterThan(Date.now() / 1000);
    });

    it('should calculate correct retry-after when rate limited', async () => {
      const user = createMockUser();
      const endpoint = createEndpoint();

      // Fill up the rate limit
      for (let i = 0; i < 60; i++) {
        await service.recordUsage(user, endpoint);
      }

      const result = await service.checkLimit(user, endpoint);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });
  });
});