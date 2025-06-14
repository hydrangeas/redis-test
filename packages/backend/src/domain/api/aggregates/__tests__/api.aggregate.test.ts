import { describe, it, expect, beforeEach } from 'vitest';
import { APIAggregate } from '../api.aggregate';
import { APIEndpoint } from '../../value-objects/api-endpoint';
import { EndpointPath } from '../../value-objects/endpoint-path';
import { HttpMethod } from '../../value-objects/http-method';
import { EndpointType } from '../../value-objects/endpoint-type';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';

describe('APIAggregate (Refactored)', () => {
  let aggregate: APIAggregate;
  let testEndpoint: APIEndpoint;

  beforeEach(() => {
    const aggregateResult = APIAggregate.create();
    aggregate = aggregateResult.getValue();

    const pathResult = EndpointPath.create('/api/test');
    const typeResult = EndpointType.create('protected');
    
    const endpointResult = APIEndpoint.create({
      path: pathResult.getValue(),
      method: HttpMethod.GET,
      type: typeResult.getValue(),
      description: 'Test endpoint',
      isActive: true,
    });
    testEndpoint = endpointResult.getValue();
  });

  describe('create', () => {
    it('should create APIAggregate with empty defaults', () => {
      const result = APIAggregate.create();

      expect(result.isSuccess).toBe(true);
      const aggregate = result.getValue();
      expect(aggregate.endpoints.size).toBe(0);
      expect(aggregate.defaultRateLimits.size).toBe(0);
    });

    it('should create APIAggregate with custom properties', () => {
      const customRateLimits = new Map([
        [TierLevel.TIER1, new RateLimit(30, 60)],
        [TierLevel.TIER2, new RateLimit(60, 60)],
      ]);

      const result = APIAggregate.create({
        defaultRateLimits: customRateLimits,
      });

      expect(result.isSuccess).toBe(true);
      const aggregate = result.getValue();
      expect(aggregate.defaultRateLimits).toBe(customRateLimits);
    });
  });

  describe('addEndpoint', () => {
    it('should add endpoint successfully', () => {
      const result = aggregate.addEndpoint(testEndpoint);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.endpoints.size).toBe(1);
      const key = `${testEndpoint.path.value}:${testEndpoint.method}`;
      expect(aggregate.endpoints.get(key)).toBe(testEndpoint);
    });

    it('should fail to add duplicate endpoint', () => {
      aggregate.addEndpoint(testEndpoint);
      const result = aggregate.addEndpoint(testEndpoint);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_ALREADY_EXISTS');
    });
  });

  describe('removeEndpoint', () => {
    it('should remove endpoint successfully', () => {
      aggregate.addEndpoint(testEndpoint);
      const result = aggregate.removeEndpoint(testEndpoint.path, testEndpoint.method);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.endpoints.size).toBe(0);
    });

    it('should fail to remove non-existent endpoint', () => {
      const pathResult = EndpointPath.create('/api/nonexistent');
      const result = aggregate.removeEndpoint(pathResult.getValue(), HttpMethod.GET);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_NOT_FOUND');
    });
  });

  describe('getEndpoint', () => {
    it('should get endpoint successfully', () => {
      aggregate.addEndpoint(testEndpoint);
      const result = aggregate.getEndpoint(testEndpoint.path, testEndpoint.method);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(testEndpoint);
    });

    it('should fail to get non-existent endpoint', () => {
      const pathResult = EndpointPath.create('/api/nonexistent');
      const result = aggregate.getEndpoint(pathResult.getValue(), HttpMethod.GET);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_NOT_FOUND');
    });
  });

  describe('findMatchingEndpoint', () => {
    it('should find endpoint by exact path and method', () => {
      aggregate.addEndpoint(testEndpoint);
      const pathResult = EndpointPath.create('/api/test');
      const result = aggregate.findMatchingEndpoint(
        pathResult.getValue(),
        HttpMethod.GET
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(testEndpoint);
    });

    it('should find endpoint with wildcard pattern', () => {
      const wildcardPathResult = EndpointPath.create('/api/data/*');
      const wildcardTypeResult = EndpointType.create('protected');
      
      const wildcardEndpointResult = APIEndpoint.create({
        path: wildcardPathResult.getValue(),
        method: HttpMethod.GET,
        type: wildcardTypeResult.getValue(),
        isActive: true,
      });
      const wildcardEndpoint = wildcardEndpointResult.getValue();
      aggregate.addEndpoint(wildcardEndpoint);

      const testPathResult = EndpointPath.create('/api/data/test.json');
      const result = aggregate.findMatchingEndpoint(
        testPathResult.getValue(),
        HttpMethod.GET
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(wildcardEndpoint);
    });

    it('should fail to find non-existent endpoint', () => {
      const pathResult = EndpointPath.create('/api/nonexistent');
      const result = aggregate.findMatchingEndpoint(
        pathResult.getValue(),
        HttpMethod.GET
      );

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_NOT_FOUND');
    });
  });

  describe('validateEndpointAccess', () => {
    let userId: UserId;
    let userTier: UserTier;

    beforeEach(() => {
      userId = UserId.generate();
      userTier = new UserTier(TierLevel.TIER1, new RateLimit(5, 60));
      
      // Add default rate limit for tier1
      const rateLimit = new RateLimit(5, 60);
      aggregate.defaultRateLimits.set(TierLevel.TIER1, rateLimit);
      aggregate.addEndpoint(testEndpoint);
    });

    it('should validate endpoint access successfully', () => {
      const result = aggregate.validateEndpointAccess(
        userId,
        testEndpoint.path,
        testEndpoint.method,
        userTier
      );

      expect(result.isSuccess).toBe(true);
      const validationResult = result.getValue();
      expect(validationResult.endpoint).toBe(testEndpoint);
      expect(validationResult.rateLimit).toBeDefined();
      expect(validationResult.rateLimit?.maxRequests).toBe(5);

      // Should emit APIAccessRequested event
      expect(aggregate.domainEvents.length).toBe(1);
      expect(aggregate.domainEvents[0].getEventName()).toBe('APIAccessRequested');
    });

    it('should fail for inactive endpoint', () => {
      // Create inactive endpoint
      const pathResult = EndpointPath.create('/api/inactive');
      const typeResult = EndpointType.create('protected');
      const inactiveEndpointResult = APIEndpoint.create({
        path: pathResult.getValue(),
        method: HttpMethod.GET,
        type: typeResult.getValue(),
        isActive: false,
      });
      const inactiveEndpoint = inactiveEndpointResult.getValue();
      aggregate.addEndpoint(inactiveEndpoint);

      const result = aggregate.validateEndpointAccess(
        userId,
        inactiveEndpoint.path,
        inactiveEndpoint.method,
        userTier
      );

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_INACTIVE');

      // Should emit InvalidAPIAccess event
      expect(aggregate.domainEvents.length).toBe(1);
      expect(aggregate.domainEvents[0].getEventName()).toBe('InvalidAPIAccess');
    });

    it('should return null rate limit for public endpoints', () => {
      const publicPathResult = EndpointPath.create('/api/public');
      const publicTypeResult = EndpointType.create('public');
      const publicEndpointResult = APIEndpoint.create({
        path: publicPathResult.getValue(),
        method: HttpMethod.GET,
        type: publicTypeResult.getValue(),
        isActive: true,
      });
      const publicEndpoint = publicEndpointResult.getValue();
      aggregate.addEndpoint(publicEndpoint);

      const result = aggregate.validateEndpointAccess(
        userId,
        publicEndpoint.path,
        publicEndpoint.method,
        userTier
      );

      expect(result.isSuccess).toBe(true);
      const validationResult = result.getValue();
      expect(validationResult.endpoint).toBe(publicEndpoint);
      expect(validationResult.rateLimit).toBeNull();
    });

    it('should fail for non-existent endpoint', () => {
      const pathResult = EndpointPath.create('/api/nonexistent');
      
      const result = aggregate.validateEndpointAccess(
        userId,
        pathResult.getValue(),
        HttpMethod.GET,
        userTier
      );

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_NOT_FOUND');

      // Should emit InvalidAPIAccess event
      expect(aggregate.domainEvents.length).toBe(1);
      expect(aggregate.domainEvents[0].getEventName()).toBe('InvalidAPIAccess');
    });

    it('should fail when tier cannot access endpoint', () => {
      // Create internal endpoint (tier3 only)
      const pathResult = EndpointPath.create('/api/internal');
      const typeResult = EndpointType.create('internal');
      const tier3EndpointResult = APIEndpoint.create({
        path: pathResult.getValue(),
        method: HttpMethod.GET,
        type: typeResult.getValue(),
        isActive: true,
      });
      const tier3Endpoint = tier3EndpointResult.getValue();
      aggregate.addEndpoint(tier3Endpoint);

      // Try to access with tier1
      const result = aggregate.validateEndpointAccess(
        userId,
        tier3Endpoint.path,
        tier3Endpoint.method,
        userTier // tier1
      );

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INSUFFICIENT_TIER');

      // Should emit InvalidAPIAccess event
      expect(aggregate.domainEvents.length).toBe(1);
      expect(aggregate.domainEvents[0].getEventName()).toBe('InvalidAPIAccess');
    });
  });

  describe('setDefaultRateLimit', () => {
    it('should set default rate limit for tier', () => {
      const tier = new UserTier(TierLevel.TIER2, new RateLimit(100, 60));
      const rateLimit = new RateLimit(100, 60);

      const result = aggregate.setDefaultRateLimit(tier, rateLimit);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.defaultRateLimits.get(TierLevel.TIER2)).toBe(rateLimit);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute from existing data', () => {
      const endpoints = new Map([
        [`${testEndpoint.path.value}:${testEndpoint.method}`, testEndpoint]
      ]);
      const rateLimits = new Map([
        [TierLevel.TIER1, new RateLimit(60, 60)]
      ]);

      const reconstituted = APIAggregate.reconstitute(
        {
          endpoints,
          defaultRateLimits: rateLimits,
        },
        'aggregate-id'
      );

      expect(reconstituted.endpoints).toBe(endpoints);
      expect(reconstituted.defaultRateLimits).toBe(rateLimits);
      // Aggregate id is private, so we can't directly test it
    });
  });
});