import { describe, it, expect, beforeEach } from 'vitest';
import { APIAggregate } from '../api.aggregate';
import { APIEndpoint } from '../../entities/api-endpoint.entity';
import { EndpointPath } from '../../value-objects/endpoint-path';
import { HttpMethod } from '../../value-objects/http-method';
import { EndpointType } from '../../value-objects/endpoint-type';
import { EndpointId } from '../../value-objects/endpoint-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { APIEndpointFactory } from '../../factories/api-endpoint.factory';

describe('APIAggregate', () => {
  let aggregate: APIAggregate;

  beforeEach(() => {
    const result = APIAggregate.create();
    aggregate = result.getValue();
  });

  describe('creation', () => {
    it('should create an empty aggregate', () => {
      expect(aggregate).toBeDefined();
      expect(aggregate.endpoints.size).toBe(0);
      expect(aggregate.defaultRateLimits.size).toBe(3); // Default tiers
    });

    it('should have default rate limits for all tiers', () => {
      const tier1Limit = aggregate.defaultRateLimits.get(TierLevel.TIER1);
      const tier2Limit = aggregate.defaultRateLimits.get(TierLevel.TIER2);
      const tier3Limit = aggregate.defaultRateLimits.get(TierLevel.TIER3);

      expect(tier1Limit?.maxRequests).toBe(60);
      expect(tier2Limit?.maxRequests).toBe(120);
      expect(tier3Limit?.maxRequests).toBe(300);
    });
  });

  describe('addEndpoint', () => {
    it('should add a new endpoint', () => {
      const endpoint = APIEndpointFactory.createDataEndpoint('/api/data/test.json');

      const result = aggregate.addEndpoint(endpoint);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.endpoints.size).toBe(1);
      expect(aggregate.endpoints.get(endpoint.id.value)).toBe(endpoint);
    });

    it('should reject duplicate endpoint IDs', () => {
      const endpoint = APIEndpointFactory.createDataEndpoint('/api/data/test.json');

      aggregate.addEndpoint(endpoint);
      const result = aggregate.addEndpoint(endpoint);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_ALREADY_EXISTS');
    });

    it('should reject duplicate path and method combinations', () => {
      const endpoint1 = APIEndpointFactory.createDataEndpoint('/api/data/test.json');
      const endpoint2 = APIEndpointFactory.createDataEndpoint('/api/data/test.json');

      aggregate.addEndpoint(endpoint1);
      const result = aggregate.addEndpoint(endpoint2);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('DUPLICATE_ENDPOINT');
    });
  });

  describe('removeEndpoint', () => {
    it('should remove an existing endpoint', () => {
      const endpoint = APIEndpointFactory.createDataEndpoint('/api/data/test.json');
      aggregate.addEndpoint(endpoint);

      const result = aggregate.removeEndpoint(endpoint.id);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.endpoints.size).toBe(0);
    });

    it('should fail to remove non-existent endpoint', () => {
      const endpointId = EndpointId.create().getValue();

      const result = aggregate.removeEndpoint(endpointId);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_NOT_FOUND');
    });
  });

  describe('findEndpointByPathAndMethod', () => {
    beforeEach(() => {
      // Add various endpoints
      aggregate.addEndpoint(APIEndpointFactory.createDataEndpoint('/api/data/test.json'));
      aggregate.addEndpoint(APIEndpointFactory.createDataEndpoint('/api/data/*'));
      aggregate.addEndpoint(APIEndpointFactory.createHealthCheckEndpoint());
    });

    it('should find exact match endpoint', () => {
      const path = EndpointPath.create('/health').getValue();

      const result = aggregate.findEndpointByPathAndMethod(path, HttpMethod.GET);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().path.value).toBe('/health');
    });

    it('should find wildcard match endpoint', () => {
      const path = EndpointPath.create('/api/data/something.json').getValue();

      const result = aggregate.findEndpointByPathAndMethod(path, HttpMethod.GET);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().path.value).toBe('/api/data/*');
    });

    it('should prefer exact match over wildcard', () => {
      const path = EndpointPath.create('/api/data/test.json').getValue();

      const result = aggregate.findEndpointByPathAndMethod(path, HttpMethod.GET);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().path.value).toBe('/api/data/test.json');
    });

    it('should fail for non-existent endpoint', () => {
      const path = EndpointPath.create('/non-existent').getValue();

      const result = aggregate.findEndpointByPathAndMethod(path, HttpMethod.GET);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_NOT_FOUND');
    });
  });

  describe('processAPIAccess', () => {
    let userId: UserId;
    let userTier: UserTier;

    beforeEach(() => {
      userId = UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue();
      userTier = UserTier.createDefault(TierLevel.TIER1);

      // Add test endpoints
      aggregate.addEndpoint(APIEndpointFactory.createDataEndpoint('/api/data/*'));
      aggregate.addEndpoint(APIEndpointFactory.createHealthCheckEndpoint());
      aggregate.addEndpoint(APIEndpointFactory.createAdminEndpoint('/admin/users'));
    });

    it('should process public endpoint access without rate limiting', async () => {
      const path = EndpointPath.create('/health').getValue();

      const result = await aggregate.processAPIAccess(userId, path, HttpMethod.GET, userTier);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().isExceeded).toBe(false);
      expect(result.getValue().remainingRequests).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should process protected endpoint access with rate limiting', async () => {
      const path = EndpointPath.create('/api/data/test.json').getValue();

      const result = await aggregate.processAPIAccess(userId, path, HttpMethod.GET, userTier);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().isExceeded).toBe(false);
      expect(result.getValue().requestCount).toBe(1);
      expect(result.getValue().remainingRequests).toBe(59); // 60 - 1
    });

    it('should detect rate limit exceeded', async () => {
      const path = EndpointPath.create('/api/data/test.json').getValue();

      // Make 60 requests (tier 1 limit)
      for (let i = 0; i < 60; i++) {
        await aggregate.processAPIAccess(userId, path, HttpMethod.GET, userTier);
      }

      // 61st request should exceed
      const result = await aggregate.processAPIAccess(userId, path, HttpMethod.GET, userTier);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().isExceeded).toBe(true);
      expect(result.getValue().retryAfterSeconds).toBeDefined();
    });

    it('should reject access to admin endpoints for regular users', async () => {
      const path = EndpointPath.create('/admin/users').getValue();

      const result = await aggregate.processAPIAccess(userId, path, HttpMethod.GET, userTier);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INSUFFICIENT_TIER');
    });

    it('should reject access to inactive endpoints', async () => {
      const endpoint = APIEndpointFactory.createDataEndpoint('/api/inactive');
      endpoint.deactivate();
      aggregate.addEndpoint(endpoint);

      const path = EndpointPath.create('/api/inactive').getValue();

      const result = await aggregate.processAPIAccess(userId, path, HttpMethod.GET, userTier);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_INACTIVE');
    });

    it('should track domain events', async () => {
      const path = EndpointPath.create('/api/data/test.json').getValue();

      // Clear existing events
      aggregate['_domainEvents'] = [];

      await aggregate.processAPIAccess(userId, path, HttpMethod.GET, userTier);

      const events = aggregate.getUncommittedEvents();
      expect(events.length).toBe(2); // APIAccessRequested and APIAccessRecorded
      expect(events[0].getEventName()).toBe('APIAccessRequested');
      expect(events[1].getEventName()).toBe('APIAccessRecorded');
    });
  });

  describe('tier access control', () => {
    beforeEach(() => {
      // Add internal endpoint
      const pathResult = EndpointPath.create('/internal/api');
      const typeResult = EndpointType.create('internal');
      const endpoint = APIEndpoint.create({
        path: pathResult.getValue(),
        method: HttpMethod.GET,
        type: typeResult.getValue(),
        isActive: true,
      }).getValue();
      aggregate.addEndpoint(endpoint);
    });

    it('should allow TIER3 to access internal endpoints', async () => {
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440003').getValue();
      const userTier = UserTier.createDefault(TierLevel.TIER3);
      const path = EndpointPath.create('/internal/api').getValue();

      const result = await aggregate.processAPIAccess(userId, path, HttpMethod.GET, userTier);

      expect(result.isSuccess).toBe(true);
    });

    it('should deny TIER1 and TIER2 from accessing internal endpoints', async () => {
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440001').getValue();
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);
      const path = EndpointPath.create('/internal/api').getValue();

      const result1 = await aggregate.processAPIAccess(userId, path, HttpMethod.GET, tier1);

      const result2 = await aggregate.processAPIAccess(userId, path, HttpMethod.GET, tier2);

      expect(result1.isFailure).toBe(true);
      expect(result1.getError().code).toBe('INSUFFICIENT_TIER');
      expect(result2.isFailure).toBe(true);
      expect(result2.getError().code).toBe('INSUFFICIENT_TIER');
    });
  });

  describe('cleanup operations', () => {
    beforeEach(async () => {
      const endpoint = APIEndpointFactory.createDataEndpoint('/api/data/*');
      aggregate.addEndpoint(endpoint);

      // Add some test requests
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440099').getValue();
      const userTier = UserTier.createDefault(TierLevel.TIER1);
      const path = EndpointPath.create('/api/data/test.json').getValue();

      // Add current and old requests
      const now = new Date();
      const oldTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

      // Process some requests
      for (let i = 0; i < 3; i++) {
        await aggregate.processAPIAccess(userId, path, HttpMethod.GET, userTier, now);
      }
    });

    it('should cleanup user logs', async () => {
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440099').getValue();

      const result = await aggregate.cleanupUserLogs(userId, 60);

      expect(result.isSuccess).toBe(true);
      // Cleanup count depends on the automatic cleanup in the endpoint
    });

    it('should cleanup all logs', async () => {
      const result = await aggregate.cleanupAllLogs(60);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('setDefaultRateLimit', () => {
    it('should set custom rate limit for a tier', () => {
      const customLimit = new RateLimit(100, 60);

      const result = aggregate.setDefaultRateLimit(TierLevel.TIER1, customLimit);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.defaultRateLimits.get(TierLevel.TIER1)).toBe(customLimit);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute aggregate from existing data', () => {
      const endpoint = APIEndpointFactory.createDataEndpoint('/api/data/*');
      const props = {
        endpoints: new Map([[endpoint.id.value, endpoint]]),
        defaultRateLimits: new Map([[TierLevel.TIER1, new RateLimit(100, 60)]]),
      };

      const reconstituted = APIAggregate.reconstitute(props, 'aggregate-id');

      expect(reconstituted.endpoints.size).toBe(1);
      expect(reconstituted.defaultRateLimits.get(TierLevel.TIER1)?.maxRequests).toBe(100);
    });
  });
});
