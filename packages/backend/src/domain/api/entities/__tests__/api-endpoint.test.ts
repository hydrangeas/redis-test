import { describe, it, expect, beforeEach } from 'vitest';
import { APIEndpoint } from '../api-endpoint.entity';
import { EndpointPath } from '../../value-objects/endpoint-path';
import { HttpMethod } from '../../value-objects/http-method';
import { EndpointType } from '../../value-objects/endpoint-type';
import { EndpointId } from '../../value-objects/endpoint-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';

describe('APIEndpoint', () => {
  let endpoint: APIEndpoint;

  beforeEach(() => {
    const pathResult = EndpointPath.create('/api/data/*');
    const typeResult = EndpointType.create('protected');

    const endpointResult = APIEndpoint.create({
      path: pathResult.getValue(),
      method: HttpMethod.GET,
      type: typeResult.getValue(),
      isActive: true,
    });

    endpoint = endpointResult.getValue();
  });

  describe('create', () => {
    it('should create an endpoint with valid props', () => {
      const pathResult = EndpointPath.create('/api/test');
      const typeResult = EndpointType.create('public');

      const result = APIEndpoint.create({
        path: pathResult.getValue(),
        method: HttpMethod.POST,
        type: typeResult.getValue(),
        description: 'Test endpoint',
        isActive: true,
      });

      expect(result.isSuccess).toBe(true);
      const endpoint = result.getValue();
      expect(endpoint.path.value).toBe('/api/test');
      expect(endpoint.method).toBe(HttpMethod.POST);
      expect(endpoint.type.value).toBe('public');
      expect(endpoint.isPublic).toBe(true);
      expect(endpoint.isActive).toBe(true);
    });

    it('should create with custom id', () => {
      const customId = EndpointId.generate();
      const pathResult = EndpointPath.create('/api/test');
      const typeResult = EndpointType.create('protected');

      const result = APIEndpoint.create(
        {
          path: pathResult.getValue(),
          method: HttpMethod.GET,
          type: typeResult.getValue(),
          isActive: true,
        },
        customId
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().id).toBe(customId);
    });
  });

  describe('path matching', () => {
    it('should match wildcard patterns', () => {
      const testPath = EndpointPath.create('/api/data/test.json').getValue();
      expect(endpoint.matchesPath(testPath)).toBe(true);

      const nonMatchingPath = EndpointPath.create('/api/other/test.json').getValue();
      expect(endpoint.matchesPath(nonMatchingPath)).toBe(false);
    });

    it('should match exact paths', () => {
      const exactEndpoint = APIEndpoint.create({
        path: EndpointPath.create('/api/health').getValue(),
        method: HttpMethod.GET,
        type: EndpointType.create('public').getValue(),
        isActive: true,
      }).getValue();

      const exactPath = EndpointPath.create('/api/health').getValue();
      expect(exactEndpoint.matchesPath(exactPath)).toBe(true);

      const differentPath = EndpointPath.create('/api/health/check').getValue();
      expect(exactEndpoint.matchesPath(differentPath)).toBe(false);
    });
  });

  describe('rate limiting', () => {
    it('should track requests within sliding window', () => {
      const userId = UserId.generate();
      const rateLimit = new RateLimit(5, 60); // 5 requests per minute

      // Record 3 requests
      for (let i = 0; i < 3; i++) {
        endpoint.recordRequest(userId);
      }

      const result = endpoint.checkRateLimit(userId, rateLimit);

      expect(result.isExceeded).toBe(false);
      expect(result.requestCount.count).toBe(3);
      expect(result.remainingRequests).toBe(2);
      expect(result.retryAfterSeconds).toBeUndefined();
    });

    it('should detect rate limit exceeded', () => {
      const userId = UserId.generate();
      const rateLimit = new RateLimit(5, 60);

      // Record 6 requests (exceeds limit of 5)
      for (let i = 0; i < 6; i++) {
        endpoint.recordRequest(userId);
      }

      const result = endpoint.checkRateLimit(userId, rateLimit);

      expect(result.isExceeded).toBe(true);
      expect(result.requestCount.count).toBe(6);
      expect(result.remainingRequests).toBe(0);
      expect(result.retryAfterSeconds).toBeDefined();
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('should handle multiple users independently', () => {
      const user1 = UserId.generate();
      const user2 = UserId.generate();
      const rateLimit = new RateLimit(3, 60);

      // User 1: 3 requests
      for (let i = 0; i < 3; i++) {
        endpoint.recordRequest(user1);
      }

      // User 2: 1 request
      endpoint.recordRequest(user2);

      const result1 = endpoint.checkRateLimit(user1, rateLimit);
      const result2 = endpoint.checkRateLimit(user2, rateLimit);

      expect(result1.requestCount.count).toBe(3);
      expect(result1.remainingRequests).toBe(0);
      expect(result2.requestCount.count).toBe(1);
      expect(result2.remainingRequests).toBe(2);
    });

    it('should cleanup old logs', () => {
      const userId = UserId.generate();
      const rateLimit = new RateLimit(5, 60);

      // Record old request (2 hours ago)
      const oldTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000);
      endpoint.recordRequest(userId, oldTimestamp);

      // Record current request
      endpoint.recordRequest(userId);

      const result = endpoint.checkRateLimit(userId, rateLimit);

      // Only current request should be counted
      expect(result.requestCount.count).toBe(1);
      expect(result.remainingRequests).toBe(4);
    });

    it('should handle sliding window correctly', () => {
      const userId = UserId.generate();
      const rateLimit = new RateLimit(3, 60);

      // Use a fixed time to make the test predictable
      const baseTime = new Date('2024-01-01T12:00:30.000Z');
      
      // The window will be aligned to 12:00:00 - 12:01:00
      const times = [
        new Date('2024-01-01T11:59:30.000Z'), // Outside window
        new Date('2024-01-01T12:00:05.000Z'), // Inside window
        new Date('2024-01-01T12:00:15.000Z'), // Inside window
        new Date('2024-01-01T12:00:25.000Z'), // Inside window
      ];

      times.forEach(time => {
        endpoint.recordRequest(userId, time);
      });

      const result = endpoint.checkRateLimit(userId, rateLimit, baseTime);

      // Should count only the 3 requests within the 60-second window
      expect(result.requestCount.count).toBe(3);
      expect(result.isExceeded).toBe(true);
    });
  });

  describe('activation/deactivation', () => {
    it('should activate an inactive endpoint', () => {
      const inactiveEndpoint = APIEndpoint.create({
        path: EndpointPath.create('/api/test').getValue(),
        method: HttpMethod.GET,
        type: EndpointType.create('protected').getValue(),
        isActive: false,
      }).getValue();

      expect(inactiveEndpoint.isActive).toBe(false);

      const result = inactiveEndpoint.activate();
      expect(result.isSuccess).toBe(true);
      expect(inactiveEndpoint.isActive).toBe(true);
    });

    it('should fail to activate an already active endpoint', () => {
      expect(endpoint.isActive).toBe(true);

      const result = endpoint.activate();
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Endpoint is already active');
    });

    it('should deactivate an active endpoint', () => {
      expect(endpoint.isActive).toBe(true);

      const result = endpoint.deactivate();
      expect(result.isSuccess).toBe(true);
      expect(endpoint.isActive).toBe(false);
    });

    it('should fail to deactivate an already inactive endpoint', () => {
      endpoint.deactivate(); // First deactivation
      const result = endpoint.deactivate(); // Second deactivation

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Endpoint is already inactive');
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute from existing data', () => {
      const id = EndpointId.generate();
      const userId = UserId.generate();
      const rateLimitLogs = new Map();
      rateLimitLogs.set(userId.value, []);

      const props = {
        path: EndpointPath.create('/api/test').getValue(),
        method: HttpMethod.POST,
        type: EndpointType.create('public').getValue(),
        description: 'Test endpoint',
        isActive: true,
        rateLimitLogs,
      };

      const reconstituted = APIEndpoint.reconstitute(props, id);

      expect(reconstituted.id).toBe(id);
      expect(reconstituted.path.value).toBe('/api/test');
      expect(reconstituted.method).toBe(HttpMethod.POST);
      expect(reconstituted.type.value).toBe('public');
      expect(reconstituted.isActive).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty rate limit logs', () => {
      const userId = UserId.generate();
      const rateLimit = new RateLimit(10, 60);

      const result = endpoint.checkRateLimit(userId, rateLimit);

      expect(result.isExceeded).toBe(false);
      expect(result.requestCount.count).toBe(0);
      expect(result.remainingRequests).toBe(10);
      expect(result.retryAfterSeconds).toBeUndefined();
    });

    it('should handle rate limit of 1', () => {
      const userId = UserId.generate();
      const rateLimit = new RateLimit(1, 60); // Only 1 request allowed

      // No requests yet
      let result = endpoint.checkRateLimit(userId, rateLimit);
      expect(result.isExceeded).toBe(false);
      expect(result.remainingRequests).toBe(1);

      // After 1 request
      endpoint.recordRequest(userId);
      result = endpoint.checkRateLimit(userId, rateLimit);
      expect(result.isExceeded).toBe(true);
      expect(result.remainingRequests).toBe(0);
    });
  });
});