import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LogAggregate } from '../log.aggregate';
import { LogId } from '../../value-objects/log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { ApiPath } from '@/domain/api/value-objects/api-path';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { RequestInfo } from '../../value-objects/request-info';
import { ResponseInfo } from '../../value-objects/response-info';
import { AuthEvent, EventType } from '../../value-objects/auth-event';
import { Provider } from '../../value-objects/provider';
import { IPAddress } from '../../value-objects/ip-address';
import { UserAgent } from '../../value-objects/user-agent';
import { AuthResult } from '../../value-objects';
import {
  APIAccessLoggedEvent,
  AuthEventLoggedEvent,
  SecurityAlertRaisedEvent,
  PerformanceIssueDetectedEvent,
} from '../../events';

describe('LogAggregate', () => {
  let aggregate: LogAggregate;
  const validUserId = UserId.generate();
  const validEndpoint = new Endpoint(HttpMethod.GET, new ApiPath('/api/data/test.json'));
  
  beforeEach(() => {
    const result = LogAggregate.create();
    aggregate = result.getValue()!;
  });

  describe('create', () => {
    it('should create with default retention days', () => {
      const result = LogAggregate.create();
      
      expect(result.isSuccess).toBe(true);
      const aggregate = result.getValue()!;
      expect(aggregate.retentionDays).toBe(90);
      expect(aggregate.apiLogs).toHaveLength(0);
      expect(aggregate.authLogs).toHaveLength(0);
    });

    it('should create with custom retention days', () => {
      const result = LogAggregate.create(30);
      
      expect(result.isSuccess).toBe(true);
      const aggregate = result.getValue()!;
      expect(aggregate.retentionDays).toBe(30);
    });

    it('should fail with invalid retention days', () => {
      const result1 = LogAggregate.create(0);
      const result2 = LogAggregate.create(366);
      
      expect(result1.isFailure).toBe(true);
      expect(result1.getError().code).toBe('INVALID_RETENTION_DAYS');
      expect(result2.isFailure).toBe(true);
    });
  });

  describe('logAPIAccess', () => {
    it('should log successful API access', () => {
      const requestInfo = new RequestInfo({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        headers: {},
        body: null,
      });
      
      const responseInfo = new ResponseInfo({
        statusCode: 200,
        responseTime: 100,
        size: 1024,
        headers: {},
      });

      const result = aggregate.logAPIAccess(
        validUserId,
        validEndpoint,
        requestInfo,
        responseInfo
      );

      expect(result.isSuccess).toBe(true);
      expect(aggregate.apiLogs).toHaveLength(1);
      
      const log = aggregate.apiLogs[0];
      expect(log.userId?.equals(validUserId)).toBe(true);
      expect(log.endpoint.path.value).toBe('/api/data/test.json');
      expect(log.responseInfo.statusCode).toBe(200);
      expect(log.isSuccess).toBe(true);
    });

    it('should emit APIAccessLoggedEvent', () => {
      const requestInfo = new RequestInfo({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        headers: {},
        body: null,
      });
      
      const responseInfo = new ResponseInfo({
        statusCode: 200,
        responseTime: 100,
        size: 1024,
        headers: {},
      });

      aggregate.logAPIAccess(
        validUserId,
        validEndpoint,
        requestInfo,
        responseInfo
      );

      const events = aggregate.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(APIAccessLoggedEvent);
      
      const event = events[0] as APIAccessLoggedEvent;
      expect(event.userId).toBe(validUserId.value);
      expect(event.path).toBe('/api/data/test.json');
      expect(event.statusCode).toBe(200);
    });

    it('should emit PerformanceIssueDetectedEvent for slow response', () => {
      const requestInfo = new RequestInfo({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        headers: {},
        body: null,
      });
      
      const responseInfo = new ResponseInfo({
        statusCode: 200,
        responseTime: 2000, // Slow response
        size: 1024,
        headers: {},
      });

      aggregate.logAPIAccess(
        validUserId,
        validEndpoint,
        requestInfo,
        responseInfo
      );

      const events = aggregate.domainEvents;
      expect(events).toHaveLength(2);
      
      const perfEvent = events.find(e => e instanceof PerformanceIssueDetectedEvent) as PerformanceIssueDetectedEvent;
      expect(perfEvent).toBeDefined();
      expect(perfEvent.endpoint).toBe('/api/data/test.json');
      expect(perfEvent.responseTime).toBe(2000);
      expect(perfEvent.issueType).toBe('SLOW_RESPONSE');
    });

    it('should log API access with error', () => {
      const requestInfo = new RequestInfo({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        headers: {},
        body: null,
      });
      
      const responseInfo = new ResponseInfo({
        statusCode: 404,
        responseTime: 50,
        size: 0,
        headers: {},
      });

      const result = aggregate.logAPIAccess(
        validUserId,
        validEndpoint,
        requestInfo,
        responseInfo,
        'NOT_FOUND'
      );

      expect(result.isSuccess).toBe(true);
      const log = aggregate.apiLogs[0];
      expect(log.isError).toBe(true);
      expect(log.isNotFound).toBe(true);
      expect(log.error).toBe('NOT_FOUND');
    });

    it('should enforce log limit', () => {
      const requestInfo = new RequestInfo({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        headers: {},
        body: null,
      });
      
      const responseInfo = new ResponseInfo({
        statusCode: 200,
        responseTime: 100,
        size: 1024,
        headers: {},
      });

      // Add logs up to the limit
      for (let i = 0; i < 10000; i++) {
        aggregate.logAPIAccess(
          validUserId,
          validEndpoint,
          requestInfo,
          responseInfo
        );
      }

      // Try to add one more
      const result = aggregate.logAPIAccess(
        validUserId,
        validEndpoint,
        requestInfo,
        responseInfo
      );

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('API_LOG_LIMIT_EXCEEDED');
    });
  });

  describe('logAuthEvent', () => {
    it('should log successful authentication', () => {
      const event = new AuthEvent(EventType.LOGIN_SUCCESS);
      const provider = new Provider('google');
      const ipAddress = new IPAddress('192.168.1.1');
      const userAgent = new UserAgent('Mozilla/5.0');

      const result = aggregate.logAuthEvent(
        event,
        provider,
        ipAddress,
        userAgent,
        AuthResult.SUCCESS,
        validUserId
      );

      expect(result.isSuccess).toBe(true);
      expect(aggregate.authLogs).toHaveLength(1);
      
      const log = aggregate.authLogs[0];
      expect(log.userId?.equals(validUserId)).toBe(true);
      expect(log.event.type).toBe(EventType.LOGIN_SUCCESS);
      expect(log.result).toBe(AuthResult.SUCCESS);
    });

    it('should emit AuthEventLoggedEvent', () => {
      const event = new AuthEvent(EventType.LOGIN_SUCCESS);
      const provider = new Provider('google');
      const ipAddress = new IPAddress('192.168.1.1');
      const userAgent = new UserAgent('Mozilla/5.0');

      aggregate.logAuthEvent(
        event,
        provider,
        ipAddress,
        userAgent,
        AuthResult.SUCCESS,
        validUserId
      );

      const events = aggregate.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(AuthEventLoggedEvent);
      
      const authEvent = events[0] as AuthEventLoggedEvent;
      expect(authEvent.userId).toBe(validUserId.value);
      expect(authEvent.eventType).toBe(EventType.LOGIN_SUCCESS);
      expect(authEvent.result).toBe(AuthResult.SUCCESS);
    });

    it('should log failed authentication', () => {
      const event = new AuthEvent(EventType.LOGIN_FAILED);
      const provider = new Provider('google');
      const ipAddress = new IPAddress('192.168.1.1');
      const userAgent = new UserAgent('Mozilla/5.0');

      const result = aggregate.logAuthEvent(
        event,
        provider,
        ipAddress,
        userAgent,
        AuthResult.FAILED,
        undefined,
        'Invalid credentials'
      );

      expect(result.isSuccess).toBe(true);
      const log = aggregate.authLogs[0];
      expect(log.result).toBe(AuthResult.FAILED);
      expect(log.errorMessage).toBe('Invalid credentials');
    });

    it('should emit SecurityAlertRaisedEvent for multiple failures', () => {
      const event = new AuthEvent(EventType.LOGIN_FAILED);
      const provider = new Provider('google');
      const ipAddress = new IPAddress('192.168.1.1');
      const userAgent = new UserAgent('Mozilla/5.0');

      // Log 5 failures from same IP
      for (let i = 0; i < 5; i++) {
        aggregate.logAuthEvent(
          event,
          provider,
          ipAddress,
          userAgent,
          AuthResult.FAILED,
          undefined,
          'Invalid credentials'
        );
      }

      // 6th failure should trigger security alert
      aggregate.logAuthEvent(
        event,
        provider,
        ipAddress,
        userAgent,
        AuthResult.FAILED,
        undefined,
        'Invalid credentials'
      );

      const events = aggregate.domainEvents;
      const securityAlert = events.find(e => e instanceof SecurityAlertRaisedEvent) as SecurityAlertRaisedEvent;
      
      expect(securityAlert).toBeDefined();
      expect(securityAlert.alertType).toBe('MULTIPLE_AUTH_FAILURES');
      expect(securityAlert.details.ipAddress).toBe('192.168.1.1');
      expect(securityAlert.details.failureCount).toBeGreaterThanOrEqual(5);
    });
  });

  describe('cleanupOldLogs', () => {
    beforeEach(() => {
      // Add some logs with different timestamps
      const requestInfo = new RequestInfo({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        headers: {},
        body: null,
      });
      
      const responseInfo = new ResponseInfo({
        statusCode: 200,
        responseTime: 100,
        size: 1024,
        headers: {},
      });

      // Add current log
      aggregate.logAPIAccess(
        validUserId,
        validEndpoint,
        requestInfo,
        responseInfo
      );

      // Mock old log by manipulating the timestamp
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days old
      
      // We need to access the internal props to add old logs for testing
      // In real usage, logs would be reconstructed from repository
      const oldApiLog = aggregate.apiLogs[0];
      Object.defineProperty(oldApiLog, 'timestamp', {
        value: oldDate,
        writable: false,
        configurable: true,
      });
    });

    it('should remove logs older than retention period', () => {
      expect(aggregate.apiLogs).toHaveLength(1);
      
      const result = aggregate.cleanupOldLogs();
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(1); // 1 log removed
      expect(aggregate.apiLogs).toHaveLength(0);
      expect(aggregate.lastCleanedAt).toBeDefined();
    });
  });

  describe('getUserAPIStats', () => {
    beforeEach(() => {
      const requestInfo = new RequestInfo({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        headers: {},
        body: null,
      });

      // Add successful requests
      for (let i = 0; i < 3; i++) {
        aggregate.logAPIAccess(
          validUserId,
          validEndpoint,
          requestInfo,
          new ResponseInfo({
            statusCode: 200,
            responseTime: 100 + i * 50,
            size: 1024,
            headers: {},
          })
        );
      }

      // Add failed request
      aggregate.logAPIAccess(
        validUserId,
        new Endpoint(HttpMethod.GET, new ApiPath('/api/data/other.json')),
        requestInfo,
        new ResponseInfo({
          statusCode: 404,
          responseTime: 50,
          size: 0,
          headers: {},
        })
      );
    });

    it('should calculate user API statistics', () => {
      const stats = aggregate.getUserAPIStats(validUserId);

      expect(stats.totalRequests).toBe(4);
      expect(stats.successfulRequests).toBe(3);
      expect(stats.failedRequests).toBe(1);
      expect(stats.averageResponseTime).toBe(125); // (100 + 150 + 200 + 50) / 4
      expect(stats.endpointUsage.get('/api/data/test.json')).toBe(3);
      expect(stats.endpointUsage.get('/api/data/other.json')).toBe(1);
    });

    it('should return empty stats for unknown user', () => {
      const unknownUser = UserId.generate();
      const stats = aggregate.getUserAPIStats(unknownUser);

      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.endpointUsage.size).toBe(0);
    });
  });

  describe('getUserAuthHistory', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01'));
      const provider = new Provider('google');
      const ipAddress = new IPAddress('192.168.1.1');
      const userAgent = new UserAgent('Mozilla/5.0');

      // Add multiple auth events
      const events = [
        { event: new AuthEvent(EventType.LOGIN_SUCCESS), result: AuthResult.SUCCESS },
        { event: new AuthEvent(EventType.LOGIN_FAILED), result: AuthResult.FAILED },
        { event: new AuthEvent(EventType.LOGOUT), result: AuthResult.SUCCESS },
      ];

      events.forEach(({ event, result }, index) => {
        // Add a small delay between events to ensure different timestamps
        vi.setSystemTime(new Date(Date.now() + index * 1000));
        
        aggregate.logAuthEvent(
          event,
          provider,
          ipAddress,
          userAgent,
          result,
          validUserId,
          result === AuthResult.FAILED ? 'Invalid password' : undefined
        );
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return user auth history', () => {
      const history = aggregate.getUserAuthHistory(validUserId);

      expect(history).toHaveLength(3);
      // Should be ordered by most recent first
      expect(history[0].event.type).toBe(EventType.LOGOUT);
      expect(history[1].event.type).toBe(EventType.LOGIN_FAILED);
      expect(history[2].event.type).toBe(EventType.LOGIN_SUCCESS);
    });

    it('should limit history results', () => {
      const history = aggregate.getUserAuthHistory(validUserId, 2);

      expect(history).toHaveLength(2);
      expect(history[0].event.type).toBe(EventType.LOGOUT);
      expect(history[1].event.type).toBe(EventType.LOGIN_FAILED);
    });
  });

  describe('getEndpointPerformanceStats', () => {
    beforeEach(() => {
      const requestInfo = new RequestInfo({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        headers: {},
        body: null,
      });

      // Add requests with various response times
      const responseTimes = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
      
      responseTimes.forEach((time, index) => {
        aggregate.logAPIAccess(
          validUserId,
          validEndpoint,
          requestInfo,
          new ResponseInfo({
            statusCode: index < 8 ? 200 : 500, // Last 2 are errors
            responseTime: time,
            size: 1024,
            headers: {},
          })
        );
      });
    });

    it('should calculate endpoint performance statistics', () => {
      const stats = aggregate.getEndpointPerformanceStats('/api/data/test.json');

      expect(stats.requestCount).toBe(10);
      expect(stats.averageResponseTime).toBe(275); // Average of all times
      expect(stats.p95ResponseTime).toBe(500); // 95th percentile
      expect(stats.p99ResponseTime).toBe(500); // 99th percentile
      expect(stats.errorRate).toBe(20); // 2 errors out of 10
    });

    it('should return empty stats for unknown endpoint', () => {
      const stats = aggregate.getEndpointPerformanceStats('/unknown/endpoint');

      expect(stats.requestCount).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.p95ResponseTime).toBe(0);
      expect(stats.p99ResponseTime).toBe(0);
      expect(stats.errorRate).toBe(0);
    });
  });

  describe('getSecuritySummary', () => {
    beforeEach(() => {
      const provider = new Provider('google');
      const userAgent = new UserAgent('Mozilla/5.0');

      // Add various auth events
      const scenarios = [
        { ip: '192.168.1.1', result: AuthResult.SUCCESS, count: 2 },
        { ip: '192.168.1.2', result: AuthResult.FAILED, count: 4 },
        { ip: '192.168.1.3', result: AuthResult.FAILED, count: 2 },
        { ip: '192.168.1.4', result: AuthResult.BLOCKED, count: 1 },
      ];

      scenarios.forEach(({ ip, result, count }) => {
        for (let i = 0; i < count; i++) {
          aggregate.logAuthEvent(
            new AuthEvent(result === AuthResult.SUCCESS ? EventType.LOGIN_SUCCESS : EventType.LOGIN_FAILED),
            provider,
            new IPAddress(ip),
            userAgent,
            result,
            result === AuthResult.SUCCESS ? validUserId : undefined,
            result === AuthResult.FAILED ? 'Invalid credentials' : undefined
          );
        }
      });
    });

    it('should generate security summary', () => {
      const summary = aggregate.getSecuritySummary();

      expect(summary.totalAuthAttempts).toBe(9);
      expect(summary.successfulAuths).toBe(2);
      expect(summary.failedAuths).toBe(6);
      expect(summary.blockedAuths).toBe(1);
      expect(summary.suspiciousIPs).toContain('192.168.1.2'); // 4 failures
      expect(summary.suspiciousIPs).not.toContain('192.168.1.3'); // Only 2 failures
      expect(summary.topFailureReasons.get('Invalid credentials')).toBe(6);
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct aggregate from existing data', () => {
      const id = LogId.generate();
      const result = LogAggregate.reconstruct(id, [], [], 30);

      expect(result.isSuccess).toBe(true);
      const aggregate = result.getValue()!;
      expect(aggregate.id.equals(id)).toBe(true);
      expect(aggregate.retentionDays).toBe(30);
    });

    it('should fail with invalid retention days', () => {
      const id = LogId.generate();
      const result = LogAggregate.reconstruct(id, [], [], 500);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_RETENTION_DAYS');
    });
  });
});