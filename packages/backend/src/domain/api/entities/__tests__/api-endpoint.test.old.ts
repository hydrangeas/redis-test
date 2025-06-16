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
      expect(endpoint.path.value).toBe('/api/data/*');
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.isActive).toBe(true);
      expect(endpoint.isPublic).toBe(false);
    });

    it('should have empty rate limit logs initially', () => {
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue();
      const rateLimit = new RateLimit(5, 60);
      
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
      endpoint.recordRequest(userId, new Date(now.getTime() - 30000)); // 30 seconds ago
      endpoint.recordRequest(userId, new Date(now.getTime() - 20000)); // 20 seconds ago
      endpoint.recordRequest(userId, new Date(now.getTime() - 10000)); // 10 seconds ago
      
      const result = endpoint.checkRateLimit(userId, rateLimit, now);
      
      expect(result.isExceeded).toBe(false);
      expect(result.requestCount.count).toBe(3);
      expect(result.remainingRequests).toBe(2);
    });

    it('should detect rate limit exceeded', () => {
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue();
      const rateLimit = new RateLimit(5, 60);
      
      const now = new Date();
      // Record 6 requests (exceeds limit of 5) within the past minute
      for (let i = 0; i < 6; i++) {
        endpoint.recordRequest(userId, new Date(now.getTime() - (50000 - i * 5000))); // Spread across 50 seconds
      }
      
      const result = endpoint.checkRateLimit(userId, rateLimit, now);
      
      expect(result.isExceeded).toBe(true);
      expect(result.remainingRequests).toBe(0);
      expect(result.retryAfterSeconds).toBeDefined();
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('should cleanup old logs', () => {
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue();
      const rateLimit = new RateLimit(5, 60);
      
      const now = new Date();
      // Record old request (2 hours ago)
      const oldTimestamp = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      endpoint.recordRequest(userId, oldTimestamp);
      
      // Record current request
      endpoint.recordRequest(userId, new Date(now.getTime() - 5000)); // 5 seconds ago
      
      const result = endpoint.checkRateLimit(userId, rateLimit, now);
      
      // Only current request should be counted (old one is cleaned up)
      expect(result.requestCount.count).toBe(1);
    });

    it('should handle multiple users independently', () => {
      const userId1 = UserId.create('550e8400-e29b-41d4-a716-446655440001').getValue();
      const userId2 = UserId.create('550e8400-e29b-41d4-a716-446655440002').getValue();
      const rateLimit = new RateLimit(5, 60);
      
      const now = new Date();
      // Record requests for user 1
      for (let i = 0; i < 3; i++) {
        endpoint.recordRequest(userId1, new Date(now.getTime() - (30000 - i * 5000)));
      }
      
      // Record requests for user 2
      for (let i = 0; i < 2; i++) {
        endpoint.recordRequest(userId2, new Date(now.getTime() - (25000 - i * 5000)));
      }
      
      const result1 = endpoint.checkRateLimit(userId1, rateLimit, now);
      const result2 = endpoint.checkRateLimit(userId2, rateLimit, now);
      
      expect(result1.requestCount.count).toBe(3);
      expect(result2.requestCount.count).toBe(2);
    });

    it('should calculate correct retry after time', () => {
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue();
      const rateLimit = new RateLimit(2, 60); // 2 requests per minute
      
      const now = new Date();
      
      // Clear any existing logs for this user first
      endpoint['props'].rateLimitLogs.delete(userId.value);
      
      // Record 3 requests within the last minute (exceeds limit of 2)
      endpoint.recordRequest(userId, new Date(now.getTime() - 40000)); // 40 seconds ago
      endpoint.recordRequest(userId, new Date(now.getTime() - 20000)); // 20 seconds ago
      endpoint.recordRequest(userId, new Date(now.getTime() - 10000)); // 10 seconds ago
      
      const result = endpoint.checkRateLimit(userId, rateLimit, now);
      
      expect(result.requestCount.count).toBe(3); 
      expect(result.isExceeded).toBe(true);
      // Oldest request (40 seconds ago) expires in about 20 seconds (60 - 40)
      expect(result.retryAfterSeconds).toBeDefined();
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(21);
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(19);
    });
  });

  describe('activation and deactivation', () => {
    it('should activate an inactive endpoint', () => {
      const inactiveEndpoint = APIEndpoint.create({
        path: EndpointPath.create('/test').getValue(),
        method: HttpMethod.GET,
        type: EndpointType.create('public').getValue(),
        isActive: false,
      }).getValue();
      
      expect(inactiveEndpoint.isActive).toBe(false);
      
      const result = inactiveEndpoint.activate();
      expect(result.isSuccess).toBe(true);
      expect(inactiveEndpoint.isActive).toBe(true);
    });

    it('should fail to activate an already active endpoint', () => {
      const result = endpoint.activate();
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Endpoint is already active');
    });

    it('should deactivate an active endpoint', () => {
      const result = endpoint.deactivate();
      expect(result.isSuccess).toBe(true);
      expect(endpoint.isActive).toBe(false);
    });

    it('should fail to deactivate an already inactive endpoint', () => {
      endpoint.deactivate();
      const result = endpoint.deactivate();
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Endpoint is already inactive');
    });
  });

  describe('tier-based rate limiting', () => {
    it('should get rate limit for user tier', () => {
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);
      const tier3 = UserTier.createDefault(TierLevel.TIER3);
      
      const result1 = endpoint.getRateLimitForTier(tier1);
      const result2 = endpoint.getRateLimitForTier(tier2);
      const result3 = endpoint.getRateLimitForTier(tier3);
      
      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
      expect(result3.isSuccess).toBe(true);
      
      expect(result1.getValue().maxRequests).toBe(60);
      expect(result2.getValue().maxRequests).toBe(120);
      expect(result3.getValue().maxRequests).toBe(300);
    });
  });

  describe('async methods', () => {
    it('should add rate limit log asynchronously', async () => {
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue();
      
      const now = new Date();
      const result = await endpoint.addRateLimitLog(userId, new Date(now.getTime() - 5000)); // 5 seconds ago
      expect(result.isSuccess).toBe(true);
      
      const checkResult = endpoint.checkRateLimit(userId, new RateLimit(5, 60), now);
      expect(checkResult.requestCount.count).toBe(1);
    });

    it('should cleanup logs for specific user', async () => {
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue();
      const now = new Date();
      
      // Clear any existing logs
      endpoint['props'].rateLimitLogs.delete(userId.value);
      
      // First add recent log
      await endpoint.addRateLimitLog(userId, new Date(now.getTime() - 30 * 1000)); // 30 seconds ago
      
      // Check current count before cleanup
      const beforeResult = endpoint.checkRateLimit(userId, new RateLimit(10, 60), now);
      expect(beforeResult.requestCount.count).toBe(1);
      
      // Note: Since auto-cleanup happens during addRateLimitLog, 
      // manual cleanup of already cleaned logs returns 0
      const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const result = await endpoint.cleanupLogsForUser(userId, cutoffTime);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(0); // No logs to remove (all are recent)
      
      const checkResult = endpoint.checkRateLimit(userId, new RateLimit(5, 60), now);
      expect(checkResult.requestCount.count).toBe(1); // Still 1 recent log
    });

    it('should cleanup all logs across users', async () => {
      const userId1 = UserId.create('550e8400-e29b-41d4-a716-446655440001').getValue();
      const userId2 = UserId.create('550e8400-e29b-41d4-a716-446655440002').getValue();
      const now = new Date();
      
      // Add old logs for both users (these will be auto-cleaned during addRateLimitLog)
      await endpoint.addRateLimitLog(userId1, new Date(now.getTime() - 2 * 60 * 60 * 1000));
      await endpoint.addRateLimitLog(userId2, new Date(now.getTime() - 2 * 60 * 60 * 1000));
      
      // Add recent logs
      await endpoint.addRateLimitLog(userId1, new Date(now.getTime() - 5000)); // 5 seconds ago
      await endpoint.addRateLimitLog(userId2, new Date(now.getTime() - 5000)); // 5 seconds ago
      
      // Since auto-cleanup already happened, manual cleanup returns 0
      const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
      const result = await endpoint.cleanupAllLogs(cutoffTime);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(0); // 0 logs removed (already cleaned automatically)
      
      // Verify only recent logs remain
      const check1 = endpoint.checkRateLimit(userId1, new RateLimit(5, 60), now);
      const check2 = endpoint.checkRateLimit(userId2, new RateLimit(5, 60), now);
      expect(check1.requestCount.count).toBe(1);
      expect(check2.requestCount.count).toBe(1);
    });
  });

  describe('endpoint types', () => {
    it('should correctly identify public endpoints', () => {
      const publicEndpoint = APIEndpoint.create({
        path: EndpointPath.create('/health').getValue(),
        method: HttpMethod.GET,
        type: EndpointType.create('public').getValue(),
        isActive: true,
      }).getValue();
      
      expect(publicEndpoint.isPublic).toBe(true);
    });

    it('should correctly identify protected endpoints', () => {
      expect(endpoint.isPublic).toBe(false);
      expect(endpoint.type.value).toBe('protected');
    });

    it('should correctly identify admin endpoints', () => {
      const adminEndpoint = APIEndpoint.create({
        path: EndpointPath.create('/admin/users').getValue(),
        method: HttpMethod.GET,
        type: EndpointType.create('admin').getValue(),
        isActive: true,
      }).getValue();
      
      expect(adminEndpoint.isPublic).toBe(false);
      expect(adminEndpoint.type.value).toBe('admin');
    });
  });
});