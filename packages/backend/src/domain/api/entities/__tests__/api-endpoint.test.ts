import { describe, it, expect, beforeEach } from 'vitest';
import { APIEndpoint } from '../api-endpoint.entity';
import { EndpointPath } from '../../value-objects/endpoint-path';
import { HttpMethod } from '../../value-objects/http-method';
import { EndpointType } from '../../value-objects/endpoint-type';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';

describe('APIEndpoint', () => {
  const createEndpoint = () => {
    const endpointResult = APIEndpoint.create({
      path: '/api/data/*',
      method: HttpMethod.GET,
      type: EndpointType.PROTECTED,
      isActive: true,
    });

    if (endpointResult.isFailure) {
      throw new Error(`Failed to create endpoint: ${endpointResult.getError().message}`);
    }

    return endpointResult.getValue();
  };

  let endpoint: APIEndpoint;

  beforeEach(() => {
    endpoint = createEndpoint();
  });

  describe('creation', () => {
    it('should create a valid endpoint', () => {
      expect(endpoint).toBeDefined();
      expect(endpoint.isActive).toBe(true);
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.type).toBe(EndpointType.PROTECTED);
    });

    it('should have empty rate limit logs initially', () => {
      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      expect(userIdResult.isSuccess).toBe(true);
      const userId = userIdResult.getValue();

      const rateLimitResult = RateLimit.create(5, 60);
      expect(rateLimitResult.isSuccess).toBe(true);
      const rateLimit = rateLimitResult.getValue();

      const result = endpoint.checkRateLimit(userId, rateLimit);

      expect(result.requestCount.count).toBe(0);
      expect(result.isExceeded).toBe(false);
      expect(result.remainingRequests).toBe(5);
    });
  });

  describe('path matching', () => {
    it('should match wildcard patterns', () => {
      const testPathResult = EndpointPath.create('/api/data/test.json');
      expect(testPathResult.isSuccess).toBe(true);
      const testPath = testPathResult.getValue();
      expect(endpoint.matchesPath(testPath)).toBe(true);

      const nonMatchingPathResult = EndpointPath.create('/api/other/test.json');
      expect(nonMatchingPathResult.isSuccess).toBe(true);
      const nonMatchingPath = nonMatchingPathResult.getValue();
      expect(endpoint.matchesPath(nonMatchingPath)).toBe(false);
    });

    it('should handle exact path matching', () => {
      const exactEndpointResult = APIEndpoint.create({
        path: '/health',
        method: HttpMethod.GET,
        type: EndpointType.PUBLIC,
        isActive: true,
      });
      expect(exactEndpointResult.isSuccess).toBe(true);
      const exactEndpoint = exactEndpointResult.getValue();

      const exactPathResult = EndpointPath.create('/health');
      expect(exactPathResult.isSuccess).toBe(true);
      expect(exactEndpoint.matchesPath(exactPathResult.getValue())).toBe(true);

      const differentPathResult = EndpointPath.create('/healthz');
      expect(differentPathResult.isSuccess).toBe(true);
      expect(exactEndpoint.matchesPath(differentPathResult.getValue())).toBe(false);
    });
  });

  describe('rate limiting', () => {
    it('should track requests within sliding window', () => {
      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      expect(userIdResult.isSuccess).toBe(true);
      const userId = userIdResult.getValue();

      const rateLimitResult = RateLimit.create(5, 60); // 5 requests per minute
      expect(rateLimitResult.isSuccess).toBe(true);
      const rateLimit = rateLimitResult.getValue();

      const now = new Date();
      // Record 3 requests within the past 30 seconds
      endpoint.recordAccess(userId, 'req-1', new Date(now.getTime() - 30000)); // 30 seconds ago
      endpoint.recordAccess(userId, 'req-2', new Date(now.getTime() - 20000)); // 20 seconds ago
      endpoint.recordAccess(userId, 'req-3', new Date(now.getTime() - 10000)); // 10 seconds ago

      const result = endpoint.checkRateLimit(userId, rateLimit, now);

      expect(result.requestCount.count).toBe(3);
      expect(result.isExceeded).toBe(false);
      expect(result.remainingRequests).toBe(2);
    });

    it('should detect rate limit exceeded', () => {
      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      expect(userIdResult.isSuccess).toBe(true);
      const userId = userIdResult.getValue();

      const rateLimitResult = RateLimit.create(3, 60);
      expect(rateLimitResult.isSuccess).toBe(true);
      const rateLimit = rateLimitResult.getValue();

      const now = new Date();
      // Record 4 requests within the window (exceeds limit of 3)
      endpoint.recordAccess(userId, 'req-1', new Date(now.getTime() - 40000));
      endpoint.recordAccess(userId, 'req-2', new Date(now.getTime() - 30000));
      endpoint.recordAccess(userId, 'req-3', new Date(now.getTime() - 20000));
      endpoint.recordAccess(userId, 'req-4', new Date(now.getTime() - 10000));

      const result = endpoint.checkRateLimit(userId, rateLimit, now);

      expect(result.requestCount.count).toBe(4);
      expect(result.isExceeded).toBe(true);
      expect(result.remainingRequests).toBe(0);
      expect(result.retryAfterSeconds).toBeDefined();
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('should cleanup old logs', () => {
      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      expect(userIdResult.isSuccess).toBe(true);
      const userId = userIdResult.getValue();

      const rateLimitResult = RateLimit.create(10, 60);
      expect(rateLimitResult.isSuccess).toBe(true);
      const rateLimit = rateLimitResult.getValue();

      const now = new Date();
      // Add old logs (outside 60-second window)
      endpoint.recordAccess(userId, 'req-1', new Date(now.getTime() - 120000)); // 2 minutes ago
      endpoint.recordAccess(userId, 'req-2', new Date(now.getTime() - 90000)); // 1.5 minutes ago
      // Add recent logs
      endpoint.recordAccess(userId, 'req-3', new Date(now.getTime() - 30000)); // 30 seconds ago

      // Should only count recent logs
      const result = endpoint.checkRateLimit(userId, rateLimit, now);
      expect(result.requestCount.count).toBe(1);

      // Cleanup logs older than 60 seconds
      endpoint.cleanupOldLogs(60, now);

      // Check that old logs are removed
      const resultAfterCleanup = endpoint.checkRateLimit(userId, rateLimit, now);
      expect(resultAfterCleanup.requestCount.count).toBe(1);
    });

    it('should handle multiple users independently', () => {
      const userId1Result = UserId.create('550e8400-e29b-41d4-a716-446655440001');
      expect(userId1Result.isSuccess).toBe(true);
      const userId1 = userId1Result.getValue();

      const userId2Result = UserId.create('550e8400-e29b-41d4-a716-446655440002');
      expect(userId2Result.isSuccess).toBe(true);
      const userId2 = userId2Result.getValue();

      const rateLimitResult = RateLimit.create(3, 60);
      expect(rateLimitResult.isSuccess).toBe(true);
      const rateLimit = rateLimitResult.getValue();

      const now = new Date();

      // User 1 makes 2 requests
      endpoint.recordAccess(userId1, 'req-1', now);
      endpoint.recordAccess(userId1, 'req-2', now);

      // User 2 makes 3 requests
      endpoint.recordAccess(userId2, 'req-1', now);
      endpoint.recordAccess(userId2, 'req-2', now);
      endpoint.recordAccess(userId2, 'req-3', now);

      // Check rate limits are tracked independently
      const result1 = endpoint.checkRateLimit(userId1, rateLimit, now);
      expect(result1.requestCount.count).toBe(2);
      expect(result1.isExceeded).toBe(false);

      const result2 = endpoint.checkRateLimit(userId2, rateLimit, now);
      expect(result2.requestCount.count).toBe(3);
      expect(result2.isExceeded).toBe(false); // At the limit but not exceeded
    });

    it('should calculate correct retry after time', () => {
      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      expect(userIdResult.isSuccess).toBe(true);
      const userId = userIdResult.getValue();

      const rateLimitResult = RateLimit.create(2, 60);
      expect(rateLimitResult.isSuccess).toBe(true);
      const rateLimit = rateLimitResult.getValue();

      const now = new Date('2024-01-01T00:01:00Z');

      // Add requests that exceed the limit
      endpoint.recordAccess(userId, 'req-1', new Date('2024-01-01T00:00:30Z')); // 30 seconds ago
      endpoint.recordAccess(userId, 'req-2', new Date('2024-01-01T00:00:40Z')); // 20 seconds ago
      endpoint.recordAccess(userId, 'req-3', new Date('2024-01-01T00:00:50Z')); // 10 seconds ago

      const result = endpoint.checkRateLimit(userId, rateLimit, now);

      expect(result.isExceeded).toBe(true);
      expect(result.retryAfterSeconds).toBe(30); // Oldest request expires in 30 seconds
    });
  });

  describe('activation and deactivation', () => {
    it('should activate an inactive endpoint', () => {
      const inactiveEndpointResult = APIEndpoint.create({
        path: '/api/test',
        method: HttpMethod.GET,
        type: EndpointType.PROTECTED,
        isActive: false,
      });
      expect(inactiveEndpointResult.isSuccess).toBe(true);
      const inactiveEndpoint = inactiveEndpointResult.getValue();

      expect(inactiveEndpoint.isActive).toBe(false);
      inactiveEndpoint.activate();
      expect(inactiveEndpoint.isActive).toBe(true);
    });

    it('should fail to activate an already active endpoint', () => {
      expect(endpoint.isActive).toBe(true);
      endpoint.activate(); // Should not throw, just no-op
      expect(endpoint.isActive).toBe(true);
    });

    it('should deactivate an active endpoint', () => {
      expect(endpoint.isActive).toBe(true);
      endpoint.deactivate();
      expect(endpoint.isActive).toBe(false);
    });

    it('should fail to deactivate an already inactive endpoint', () => {
      endpoint.deactivate();
      expect(endpoint.isActive).toBe(false);
      endpoint.deactivate(); // Should not throw, just no-op
      expect(endpoint.isActive).toBe(false);
    });
  });

  describe('tier-based rate limiting', () => {
    it('should get rate limit for user tier', () => {
      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      expect(userIdResult.isSuccess).toBe(true);
      const userId = userIdResult.getValue();

      const tier1Result = UserTier.create(TierLevel.TIER1);
      expect(tier1Result.isSuccess).toBe(true);
      const tier1 = tier1Result.getValue();

      const rateLimitResult = tier1.getRateLimit();
      expect(rateLimitResult.isSuccess).toBe(true);
      const rateLimit = rateLimitResult.getValue();

      expect(rateLimit.maxRequests).toBe(60);
      expect(rateLimit.windowSeconds).toBe(60);
    });
  });

  describe('async methods', () => {
    it('should add rate limit log asynchronously', async () => {
      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      expect(userIdResult.isSuccess).toBe(true);
      const userId = userIdResult.getValue();

      const rateLimitResult = RateLimit.create(5, 60);
      expect(rateLimitResult.isSuccess).toBe(true);
      const rateLimit = rateLimitResult.getValue();

      await endpoint.recordAccess(userId, 'req-1');

      const result = endpoint.checkRateLimit(userId, rateLimit);
      expect(result.requestCount.count).toBe(1);
    });

    it('should cleanup logs for specific user', () => {
      const userId1Result = UserId.create('550e8400-e29b-41d4-a716-446655440001');
      expect(userId1Result.isSuccess).toBe(true);
      const userId1 = userId1Result.getValue();

      const userId2Result = UserId.create('550e8400-e29b-41d4-a716-446655440002');
      expect(userId2Result.isSuccess).toBe(true);
      const userId2 = userId2Result.getValue();

      // Add logs for both users
      endpoint.recordAccess(userId1, 'req-1');
      endpoint.recordAccess(userId2, 'req-1');

      expect(endpoint.getUserLogCount(userId1)).toBe(1);
      expect(endpoint.getUserLogCount(userId2)).toBe(1);

      // Clean up logs for user1 using cleanupOldLogs with 0 seconds
      const now = new Date();
      const future = new Date(now.getTime() + 1000); // 1 second in future
      endpoint.cleanupOldLogs(0, future); // All logs are "old"

      expect(endpoint.getUserLogCount(userId1)).toBe(0);
      expect(endpoint.getUserLogCount(userId2)).toBe(0);
    });

    it('should cleanup all logs across users', () => {
      const userId1Result = UserId.create('550e8400-e29b-41d4-a716-446655440001');
      expect(userId1Result.isSuccess).toBe(true);
      const userId1 = userId1Result.getValue();

      const userId2Result = UserId.create('550e8400-e29b-41d4-a716-446655440002');
      expect(userId2Result.isSuccess).toBe(true);
      const userId2 = userId2Result.getValue();

      const now = new Date();

      // Add old and new logs
      endpoint.recordAccess(userId1, 'req-1', new Date(now.getTime() - 120000)); // 2 minutes ago
      endpoint.recordAccess(userId1, 'req-2', now);
      endpoint.recordAccess(userId2, 'req-1', new Date(now.getTime() - 90000)); // 1.5 minutes ago
      endpoint.recordAccess(userId2, 'req-2', now);

      expect(endpoint.getTotalLogCount()).toBe(4);

      // Cleanup logs older than 60 seconds
      endpoint.cleanupOldLogs(60, now);

      expect(endpoint.getTotalLogCount()).toBe(2); // Only recent logs remain
      expect(endpoint.getUserLogCount(userId1)).toBe(1);
      expect(endpoint.getUserLogCount(userId2)).toBe(1);
    });
  });

  describe('endpoint types', () => {
    it('should correctly identify public endpoints', () => {
      const publicEndpointResult = APIEndpoint.create({
        path: '/health',
        method: HttpMethod.GET,
        type: EndpointType.PUBLIC,
        isActive: true,
      });
      expect(publicEndpointResult.isSuccess).toBe(true);
      const publicEndpoint = publicEndpointResult.getValue();

      expect(publicEndpoint.isPublic).toBe(true);
    });

    it('should correctly identify protected endpoints', () => {
      expect(endpoint.type).toBe(EndpointType.PROTECTED);
      expect(endpoint.isPublic).toBe(false);
    });

    it('should correctly identify admin endpoints', () => {
      const adminEndpointResult = APIEndpoint.create({
        path: '/admin/users',
        method: HttpMethod.GET,
        type: EndpointType.ADMIN,
        isActive: true,
      });
      expect(adminEndpointResult.isSuccess).toBe(true);
      const adminEndpoint = adminEndpointResult.getValue();

      expect(adminEndpoint.type).toBe(EndpointType.ADMIN);
      expect(adminEndpoint.isPublic).toBe(false);
    });
  });
});
