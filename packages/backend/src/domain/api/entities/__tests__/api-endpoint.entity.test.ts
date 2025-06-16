import { APIEndpoint, CreateAPIEndpointProps } from '../api-endpoint.entity';
import { RateLimitLog } from '../rate-limit-log.entity';
import { EndpointId } from '../../value-objects/endpoint-id';
import { EndpointPath } from '../../value-objects/endpoint-path';
import { HttpMethod } from '../../value-objects/http-method';
import { EndpointType } from '../../value-objects/endpoint-type';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { ErrorType } from '@/domain/errors/domain-error';

describe('APIEndpoint', () => {
  const validProps: CreateAPIEndpointProps = {
    path: '/api/users/:id',
    method: HttpMethod.GET,
    type: EndpointType.PROTECTED,
    description: 'Get user by ID',
    isActive: true,
  };

  describe('create', () => {
    it('should create an APIEndpoint with valid props', () => {
      const result = APIEndpoint.create(validProps);

      expect(result.isSuccess).toBe(true);
      const endpoint = result.getValue();
      expect(endpoint.path.value).toBe('/api/users/:id');
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.type).toBe(EndpointType.PROTECTED);
      expect(endpoint.description).toBe('Get user by ID');
      expect(endpoint.isActive).toBe(true);
      expect(endpoint.isPublic).toBe(false);
    });

    it('should default isActive to true if not provided', () => {
      const props = { ...validProps };
      delete props.isActive;

      const result = APIEndpoint.create(props);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().isActive).toBe(true);
    });

    it('should create with custom id', () => {
      const customId = EndpointId.create('custom-endpoint-id').getValue();
      const result = APIEndpoint.create(validProps, customId);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().id.value).toBe('custom-endpoint-id');
    });

    it('should fail with invalid path', () => {
      const invalidProps = { ...validProps, path: '' };
      const result = APIEndpoint.create(invalidProps);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_ENDPOINT_PATH');
      expect(result.getError().type).toBe(ErrorType.VALIDATION);
    });

    it('should correctly identify public endpoints', () => {
      const publicProps = { ...validProps, type: EndpointType.PUBLIC };
      const result = APIEndpoint.create(publicProps);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().isPublic).toBe(true);
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct from existing data', () => {
      const pathResult = EndpointPath.create('/api/users/:id');
      expect(pathResult.isSuccess).toBe(true);
      
      const props = {
        id: 'existing-id',
        path: pathResult.getValue(),
        method: HttpMethod.POST,
        type: EndpointType.ADMIN,
        description: 'Admin endpoint',
        isActive: false,
        rateLimitLogs: new Map(),
      };

      const result = APIEndpoint.reconstruct(props);

      expect(result.isSuccess).toBe(true);
      const endpoint = result.getValue();
      expect(endpoint.id.value).toBe('existing-id');
      expect(endpoint.path.value).toBe('/api/users/:id');
      expect(endpoint.method).toBe(HttpMethod.POST);
      expect(endpoint.type).toBe(EndpointType.ADMIN);
      expect(endpoint.isActive).toBe(false);
    });

    it('should reconstruct from existing data without failing on valid empty id', () => {
      const pathResult = EndpointPath.create('/api/users/:id');
      expect(pathResult.isSuccess).toBe(true);
      
      const props = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        path: pathResult.getValue(),
        method: HttpMethod.GET,
        type: EndpointType.PROTECTED,
        isActive: true,
        rateLimitLogs: new Map(),
      };

      const result = APIEndpoint.reconstruct(props);

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('matchesPath', () => {
    it('should match exact paths', () => {
      const result = APIEndpoint.create({ ...validProps, path: '/api/users' });
      const endpoint = result.getValue();
      const testPath = EndpointPath.create('/api/users').getValue();

      expect(endpoint.matchesPath(testPath)).toBe(true);
    });

    it('should match paths with parameters', () => {
      const result = APIEndpoint.create({ ...validProps, path: '/api/users/:id' });
      const endpoint = result.getValue();
      const testPath = EndpointPath.create('/api/users/123').getValue();

      expect(endpoint.matchesPath(testPath)).toBe(true);
    });

    it('should not match different paths', () => {
      const result = APIEndpoint.create({ ...validProps, path: '/api/users' });
      const endpoint = result.getValue();
      const testPath = EndpointPath.create('/api/posts').getValue();

      expect(endpoint.matchesPath(testPath)).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    let endpoint: APIEndpoint;
    let userId: UserId;
    let rateLimit: RateLimit;

    beforeEach(() => {
      const endpointResult = APIEndpoint.create(validProps);
      expect(endpointResult.isSuccess).toBe(true);
      endpoint = endpointResult.getValue();
      
      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      expect(userIdResult.isSuccess).toBe(true);
      userId = userIdResult.getValue();
      
      const rateLimitResult = RateLimit.create(60, 60);
      expect(rateLimitResult.isSuccess).toBe(true);
      rateLimit = rateLimitResult.getValue();
    });

    it('should allow requests within rate limit', () => {
      // Add some logs
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        // Add logs with timestamps within the last minute
        const timestamp = new Date(now.getTime() - i * 1000); // Spread across seconds
        const recordResult = endpoint.recordAccess(userId, `req-${i}`, timestamp);
        expect(recordResult.isSuccess).toBe(true);
      }

      // Check the logs are stored
      const logCount = endpoint.getUserLogCount(userId);
      expect(logCount).toBe(5);

      const result = endpoint.checkRateLimit(userId, rateLimit, now);

      expect(result.isExceeded).toBe(false);
      expect(result.requestCount.count).toBe(5);
      expect(result.remainingRequests).toBe(55);
      expect(result.retryAfterSeconds).toBeUndefined();
    });

    it('should detect rate limit exceeded', () => {
      // Add logs to exceed limit
      const now = new Date();
      for (let i = 0; i < 61; i++) {
        const recordResult = endpoint.recordAccess(userId, `req-${i}`, now);
        expect(recordResult.isSuccess).toBe(true);
      }

      const result = endpoint.checkRateLimit(userId, rateLimit, now);

      expect(result.isExceeded).toBe(true);
      expect(result.requestCount.count).toBe(61);
      expect(result.remainingRequests).toBe(0);
      expect(result.retryAfterSeconds).toBeDefined();
    });

    it('should calculate correct retry after seconds', () => {
      const now = new Date('2024-01-01T00:01:00Z');
      const oldestTime = new Date('2024-01-01T00:00:30Z'); // 30 seconds ago
      
      // Add old request
      const res1 = endpoint.recordAccess(userId, 'req-1', oldestTime);
      expect(res1.isSuccess).toBe(true);
      
      // Add requests to exceed limit
      for (let i = 0; i < 60; i++) {
        const recordResult = endpoint.recordAccess(userId, `req-${i + 2}`, now);
        expect(recordResult.isSuccess).toBe(true);
      }

      const result = endpoint.checkRateLimit(userId, rateLimit, now);

      expect(result.isExceeded).toBe(true);
      expect(result.retryAfterSeconds).toBe(30); // 60 - 30 = 30 seconds until oldest expires
    });

    it('should handle users with no logs', () => {
      const result = endpoint.checkRateLimit(userId, rateLimit);

      expect(result.isExceeded).toBe(false);
      expect(result.requestCount.count).toBe(0);
      expect(result.remainingRequests).toBe(60);
      expect(result.retryAfterSeconds).toBeUndefined();
    });

    it('should only count requests within window', () => {
      const now = new Date('2024-01-01T00:02:00Z');
      
      // Add old requests (outside window)
      const res1 = endpoint.recordAccess(userId, 'req-1', new Date('2024-01-01T00:00:30Z')); // 90 seconds ago
      expect(res1.isSuccess).toBe(true);
      const res2 = endpoint.recordAccess(userId, 'req-2', new Date('2024-01-01T00:00:45Z')); // 75 seconds ago
      expect(res2.isSuccess).toBe(true);
      
      // Add recent requests (inside window)
      const res3 = endpoint.recordAccess(userId, 'req-3', new Date('2024-01-01T00:01:15Z')); // 45 seconds ago
      expect(res3.isSuccess).toBe(true);
      const res4 = endpoint.recordAccess(userId, 'req-4', new Date('2024-01-01T00:01:30Z')); // 30 seconds ago
      expect(res4.isSuccess).toBe(true);

      const result = endpoint.checkRateLimit(userId, rateLimit, now);

      expect(result.requestCount.count).toBe(2); // Only recent requests
      expect(result.remainingRequests).toBe(58);
    });
  });

  describe('recordAccess', () => {
    let endpoint: APIEndpoint;
    let userId: UserId;

    beforeEach(() => {
      const endpointResult = APIEndpoint.create(validProps);
      expect(endpointResult.isSuccess).toBe(true);
      endpoint = endpointResult.getValue();
      
      const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000');
      expect(userIdResult.isSuccess).toBe(true);
      userId = userIdResult.getValue();
    });

    it('should record access log', () => {
      const result = endpoint.recordAccess(userId, 'req-123');

      expect(result.isSuccess).toBe(true);
      expect(endpoint.getUserLogCount(userId)).toBe(1);
    });

    it('should append to existing logs', () => {
      endpoint.recordAccess(userId, 'req-1');
      endpoint.recordAccess(userId, 'req-2');
      endpoint.recordAccess(userId, 'req-3');

      expect(endpoint.getUserLogCount(userId)).toBe(3);
    });

    it('should use provided timestamp', () => {
      const customTime = new Date('2024-01-01T00:00:00Z');
      endpoint.recordAccess(userId, 'req-123', customTime);

      const logs = (endpoint as any).props.rateLimitLogs.get(userId.value);
      expect(logs[0].timestamp).toEqual(customTime);
    });

    it('should handle multiple users independently', () => {
      const userId2Result = UserId.create('550e8400-e29b-41d4-a716-446655440001');
      expect(userId2Result.isSuccess).toBe(true);
      const userId2 = userId2Result.getValue();

      const res1 = endpoint.recordAccess(userId, 'req-1');
      expect(res1.isSuccess).toBe(true);
      const res2 = endpoint.recordAccess(userId, 'req-2');
      expect(res2.isSuccess).toBe(true);
      const res3 = endpoint.recordAccess(userId2, 'req-3');
      expect(res3.isSuccess).toBe(true);

      expect(endpoint.getUserLogCount(userId)).toBe(2);
      expect(endpoint.getUserLogCount(userId2)).toBe(1);
      expect(endpoint.getTotalLogCount()).toBe(3);
    });
  });

  describe('cleanupOldLogs', () => {
    let endpoint: APIEndpoint;
    let userId1: UserId;
    let userId2: UserId;

    beforeEach(() => {
      const endpointResult = APIEndpoint.create(validProps);
      expect(endpointResult.isSuccess).toBe(true);
      endpoint = endpointResult.getValue();
      
      const userId1Result = UserId.create('550e8400-e29b-41d4-a716-446655440001');
      expect(userId1Result.isSuccess).toBe(true);
      userId1 = userId1Result.getValue();
      
      const userId2Result = UserId.create('550e8400-e29b-41d4-a716-446655440002');
      expect(userId2Result.isSuccess).toBe(true);
      userId2 = userId2Result.getValue();
    });

    it('should remove logs older than max age', () => {
      const now = new Date('2024-01-01T00:05:00Z');
      
      // Add old and new logs for user1
      const res1 = endpoint.recordAccess(userId1, 'req-1', new Date('2024-01-01T00:00:00Z')); // 5 minutes ago
      expect(res1.isSuccess).toBe(true);
      const res2 = endpoint.recordAccess(userId1, 'req-2', new Date('2024-01-01T00:04:00Z')); // 1 minute ago
      expect(res2.isSuccess).toBe(true);
      
      // Add logs for user2
      const res3 = endpoint.recordAccess(userId2, 'req-3', new Date('2024-01-01T00:02:00Z')); // 3 minutes ago
      expect(res3.isSuccess).toBe(true);

      endpoint.cleanupOldLogs(240, now); // 240 seconds = 4 minutes

      expect(endpoint.getUserLogCount(userId1)).toBe(1); // Only recent log remains
      expect(endpoint.getUserLogCount(userId2)).toBe(1); // Still within window
    });

    it('should remove user entry if all logs are cleaned up', () => {
      const now = new Date('2024-01-01T00:05:00Z');
      
      // Add only old logs
      const res1 = endpoint.recordAccess(userId1, 'req-1', new Date('2024-01-01T00:00:00Z'));
      expect(res1.isSuccess).toBe(true);
      const res2 = endpoint.recordAccess(userId1, 'req-2', new Date('2024-01-01T00:00:30Z'));
      expect(res2.isSuccess).toBe(true);

      endpoint.cleanupOldLogs(240, now); // All logs are older than 4 minutes

      expect(endpoint.getUserLogCount(userId1)).toBe(0);
      expect((endpoint as any).props.rateLimitLogs.has(userId1.value)).toBe(false);
    });

    it('should handle empty logs map', () => {
      expect(() => {
        endpoint.cleanupOldLogs(300);
      }).not.toThrow();
    });
  });

  describe('activate/deactivate', () => {
    it('should activate endpoint', () => {
      const endpoint = APIEndpoint.create({ ...validProps, isActive: false }).getValue();
      
      expect(endpoint.isActive).toBe(false);
      
      endpoint.activate();
      
      expect(endpoint.isActive).toBe(true);
    });

    it('should deactivate endpoint', () => {
      const endpoint = APIEndpoint.create({ ...validProps, isActive: true }).getValue();
      
      expect(endpoint.isActive).toBe(true);
      
      endpoint.deactivate();
      
      expect(endpoint.isActive).toBe(false);
    });
  });

  describe('log counting', () => {
    let endpoint: APIEndpoint;
    let userId1: UserId;
    let userId2: UserId;

    beforeEach(() => {
      const endpointResult = APIEndpoint.create(validProps);
      expect(endpointResult.isSuccess).toBe(true);
      endpoint = endpointResult.getValue();
      
      const userId1Result = UserId.create('550e8400-e29b-41d4-a716-446655440001');
      expect(userId1Result.isSuccess).toBe(true);
      userId1 = userId1Result.getValue();
      
      const userId2Result = UserId.create('550e8400-e29b-41d4-a716-446655440002');
      expect(userId2Result.isSuccess).toBe(true);
      userId2 = userId2Result.getValue();
    });

    it('should count logs per user', () => {
      endpoint.recordAccess(userId1, 'req-1');
      endpoint.recordAccess(userId1, 'req-2');
      endpoint.recordAccess(userId2, 'req-3');

      expect(endpoint.getUserLogCount(userId1)).toBe(2);
      expect(endpoint.getUserLogCount(userId2)).toBe(1);
    });

    it('should return 0 for users with no logs', () => {
      const userId3Result = UserId.create('550e8400-e29b-41d4-a716-446655440003');
      expect(userId3Result.isSuccess).toBe(true);
      const userId3 = userId3Result.getValue();
      
      expect(endpoint.getUserLogCount(userId3)).toBe(0);
    });

    it('should count total logs across all users', () => {
      endpoint.recordAccess(userId1, 'req-1');
      endpoint.recordAccess(userId1, 'req-2');
      endpoint.recordAccess(userId2, 'req-3');
      endpoint.recordAccess(userId2, 'req-4');
      endpoint.recordAccess(userId2, 'req-5');

      expect(endpoint.getTotalLogCount()).toBe(5);
    });

    it('should return 0 for empty endpoint', () => {
      expect(endpoint.getTotalLogCount()).toBe(0);
    });
  });
});