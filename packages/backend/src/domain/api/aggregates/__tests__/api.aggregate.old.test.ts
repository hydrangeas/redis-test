import { describe, it, expect, beforeEach } from 'vitest';
import { APIAggregate } from '../api.aggregate';
import { APIEndpoint } from '../../value-objects/api-endpoint';
import { EndpointId } from '../../value-objects/endpoint-id';
import { EndpointPath } from '../../value-objects/endpoint-path';
import { HttpMethod } from '../../value-objects/http-method';
import { EndpointType } from '../../value-objects/endpoint-type';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';

describe('APIAggregate', () => {
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
        ['TIER1', new RateLimit(30, 60)],
        ['TIER2', new RateLimit(60, 60)],
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

    it('should fail to add endpoint with duplicate path and method', () => {
      aggregate.addEndpoint(testEndpoint);

      const pathResult = EndpointPath.create('/api/test');
      const typeResult = EndpointType.create('protected');
      
      const duplicateEndpointResult = APIEndpoint.create({
        path: pathResult.getValue(),
        method: HttpMethod.GET,
        type: typeResult.getValue(),
        description: 'Duplicate endpoint',
        isActive: true,
      });
      const duplicateEndpoint = duplicateEndpointResult.getValue();

      const result = aggregate.addEndpoint(duplicateEndpoint);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('DUPLICATE_ENDPOINT');
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
    it('should find endpoint by path and method', () => {
      aggregate.addEndpoint(testEndpoint);
      const pathResult = EndpointPath.create('/api/test');
      const result = aggregate.findMatchingEndpoint(
        pathResult.getValue(),
        HttpMethod.GET
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(testEndpoint);
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
      const tierLevelResult = TierLevel.create('tier1');
      userTier = UserTier.create(tierLevelResult.getValue()).getValue();
      
      // Add default rate limit for tier1
      aggregate.setDefaultRateLimit(userTier, new RateLimit(5, 60));
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

      // 6th request should exceed limit
      const result = await aggregate.processAPIAccess(
        userId,
        testEndpoint.id,
        userTier
      );

      expect(result.isSuccess).toBe(true);
      const checkResult = result.getValue();
      expect(checkResult.isExceeded).toBe(true);
      expect(checkResult.remainingRequests).toBe(0);

      // Should emit both APIAccessRequested and RateLimitExceeded events
      expect(aggregate.domainEvents.length).toBe(2);
      expect(aggregate.domainEvents[0].getEventName()).toBe('APIAccessRequested');
      expect(aggregate.domainEvents[1].getEventName()).toBe('RateLimitExceeded');
    });

    it('should skip rate limit for public endpoints', async () => {
      const publicEndpointResult = APIEndpoint.create({
        path: new EndpointPath('/api/public'),
        method: HttpMethod.GET,
        type: EndpointType.PUBLIC,
        description: 'Public endpoint',
        isActive: true,
      });
      const publicEndpoint = publicEndpointResult.getValue();
      aggregate.addEndpoint(publicEndpoint);

      const result = await aggregate.processAPIAccess(
        userId,
        publicEndpoint.id,
        userTier
      );

      expect(result.isSuccess).toBe(true);
      const checkResult = result.getValue();
      expect(checkResult.isExceeded).toBe(false);
      expect(checkResult.remainingRequests).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should fail for inactive endpoints', async () => {
      testEndpoint.deactivate();

      const result = await aggregate.processAPIAccess(
        userId,
        testEndpoint.id,
        userTier
      );

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_INACTIVE');

      // Should emit InvalidAPIAccess event
      expect(aggregate.domainEvents.length).toBe(1);
      expect(aggregate.domainEvents[0].getEventName()).toBe('InvalidAPIAccess');
    });

    it('should fail for non-existent endpoints', async () => {
      const nonExistentId = EndpointId.generate();

      const result = await aggregate.processAPIAccess(
        userId,
        nonExistentId,
        userTier
      );

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_NOT_FOUND');

      // Should emit InvalidAPIAccess event
      expect(aggregate.domainEvents.length).toBe(1);
      expect(aggregate.domainEvents[0].getEventName()).toBe('InvalidAPIAccess');
    });
  });

  describe('cleanupUserLogs', () => {
    it('should cleanup old logs for user', async () => {
      const userId = new UserId('123e4567-e89b-12d3-a456-426614174000');
      const userTier = new UserTier(TierLevel.TIER1, new RateLimit(5, 60));
      
      aggregate.addEndpoint(testEndpoint);

      // Add some requests
      for (let i = 0; i < 3; i++) {
        await aggregate.processAPIAccess(userId, testEndpoint.id, userTier);
      }

      // Cleanup with 0 retention period (should remove all)
      const result = await aggregate.cleanupUserLogs(userId, 0);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(3);
    });
  });

  describe('cleanupAllLogs', () => {
    it('should cleanup all old logs', async () => {
      const userId1 = new UserId('123e4567-e89b-12d3-a456-426614174000');
      const userId2 = new UserId('223e4567-e89b-12d3-a456-426614174000');
      const userTier = new UserTier(TierLevel.TIER1, new RateLimit(5, 60));
      
      aggregate.addEndpoint(testEndpoint);

      // Add requests from multiple users
      for (let i = 0; i < 3; i++) {
        await aggregate.processAPIAccess(userId1, testEndpoint.id, userTier);
        await aggregate.processAPIAccess(userId2, testEndpoint.id, userTier);
      }

      // Cleanup with 0 retention period (should remove all)
      const result = await aggregate.cleanupAllLogs(0);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(6);
    });
  });

  describe('getEndpointStatistics', () => {
    it('should get endpoint statistics', async () => {
      const userId1 = new UserId('123e4567-e89b-12d3-a456-426614174000');
      const userId2 = new UserId('223e4567-e89b-12d3-a456-426614174000');
      const userTier = new UserTier(TierLevel.TIER1, new RateLimit(5, 60));
      
      aggregate.addEndpoint(testEndpoint);

      // Add requests from multiple users
      await aggregate.processAPIAccess(userId1, testEndpoint.id, userTier);
      await aggregate.processAPIAccess(userId1, testEndpoint.id, userTier);
      await aggregate.processAPIAccess(userId2, testEndpoint.id, userTier);

      const result = aggregate.getEndpointStatistics(testEndpoint.id);

      expect(result.isSuccess).toBe(true);
      const stats = result.getValue();
      expect(stats.totalRequests).toBe(3);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.requestsInLastHour).toBe(3);
    });

    it('should fail for non-existent endpoint', () => {
      const nonExistentId = EndpointId.generate();
      const result = aggregate.getEndpointStatistics(nonExistentId);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ENDPOINT_NOT_FOUND');
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute aggregate from existing data', () => {
      const endpoints = new Map([
        [testEndpoint.id.value, testEndpoint],
      ]);
      const defaultRateLimits = new Map([
        ['TIER1', new RateLimit(60, 60)],
      ]);

      const aggregate = APIAggregate.reconstitute(
        { endpoints, defaultRateLimits },
        'aggregate-id'
      );

      expect(aggregate.endpoints).toBe(endpoints);
      expect(aggregate.defaultRateLimits).toBe(defaultRateLimits);
    });
  });
});