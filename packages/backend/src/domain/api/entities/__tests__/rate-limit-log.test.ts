import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimitLog } from '../rate-limit-log.entity';
import { RateLimitLogId } from '../../value-objects/rate-limit-log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { EndpointId } from '../../value-objects/endpoint-id';
import { RequestCount } from '../../value-objects/request-count';

describe('RateLimitLog', () => {
  let userId: UserId;
  let endpointId: EndpointId;
  let requestedAt: Date;
  let requestCount: RequestCount;

  beforeEach(() => {
    userId = UserId.generate();
    endpointId = EndpointId.generate();
    requestedAt = new Date();
    requestCount = RequestCount.create(1).getValue();
  });

  describe('create', () => {
    it('should create a rate limit log with valid props', () => {
      const result = RateLimitLog.create({
        userId,
        endpointId,
        requestCount,
        requestedAt,
      });

      expect(result.isSuccess).toBe(true);
      const log = result.getValue();
      expect(log.userId).toBe(userId);
      expect(log.endpointId).toBe(endpointId);
      expect(log.requestCount).toBe(requestCount);
      expect(log.requestedAt).toEqual(requestedAt);
      expect(log.requestMetadata).toBeUndefined();
    });

    it('should create a rate limit log with metadata', () => {
      const metadata = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        method: 'GET',
      };

      const result = RateLimitLog.create({
        userId,
        endpointId,
        requestCount,
        requestedAt,
        requestMetadata: metadata,
      });

      expect(result.isSuccess).toBe(true);
      const log = result.getValue();
      expect(log.requestMetadata).toEqual(metadata);
    });

    it('should fail when userId is null', () => {
      const result = RateLimitLog.create({
        userId: null as any,
        endpointId,
        requestCount,
        requestedAt,
      });

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toContain('userId is null or undefined');
    });

    it('should fail when endpointId is null', () => {
      const result = RateLimitLog.create({
        userId,
        endpointId: null as any,
        requestCount,
        requestedAt,
      });

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toContain('endpointId is null or undefined');
    });

    it('should fail when requestedAt is null', () => {
      const result = RateLimitLog.create({
        userId,
        endpointId,
        requestCount,
        requestedAt: null as any,
      });

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toContain('requestedAt is null or undefined');
    });

    it('should fail when requestedAt is in the future', () => {
      const futureTimestamp = new Date(Date.now() + 60000); // 1 minute in future

      const result = RateLimitLog.create({
        userId,
        endpointId,
        requestCount,
        requestedAt: futureTimestamp,
      });

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Requested at cannot be in the future');
    });

    it('should create with custom id', () => {
      const customId = RateLimitLogId.generate();
      const result = RateLimitLog.create(
        {
          userId,
          endpointId,
          requestCount,
          requestedAt,
        },
        customId
      );

      expect(result.isSuccess).toBe(true);
      const log = result.getValue();
      expect(log.id).toBe(customId);
    });
  });

  describe('isWithinWindow', () => {
    it('should return true when log is within window', () => {
      const log = RateLimitLog.create({
        userId,
        endpointId,
        requestCount,
        requestedAt,
      }).getValue();

      const windowStart = new Date(requestedAt.getTime() - 30000); // 30 seconds before
      const windowEnd = new Date(requestedAt.getTime() + 30000); // 30 seconds after

      expect(log.isWithinWindow(windowStart, windowEnd)).toBe(true);
    });

    it('should return false when log is before window', () => {
      const log = RateLimitLog.create({
        userId,
        endpointId,
        requestCount,
        requestedAt,
      }).getValue();

      const windowStart = new Date(requestedAt.getTime() + 10000); // 10 seconds after log
      const windowEnd = new Date(requestedAt.getTime() + 60000); // 60 seconds after log

      expect(log.isWithinWindow(windowStart, windowEnd)).toBe(false);
    });

    it('should return false when log is after window', () => {
      const log = RateLimitLog.create({
        userId,
        endpointId,
        requestCount,
        requestedAt,
      }).getValue();

      const windowStart = new Date(requestedAt.getTime() - 60000); // 60 seconds before log
      const windowEnd = new Date(requestedAt.getTime() - 10000); // 10 seconds before log

      expect(log.isWithinWindow(windowStart, windowEnd)).toBe(false);
    });

    it('should include start time but exclude end time', () => {
      const log = RateLimitLog.create({
        userId,
        endpointId,
        requestCount,
        requestedAt,
      }).getValue();

      // Log timestamp exactly at window start
      const windowStart = requestedAt;
      const windowEnd = new Date(requestedAt.getTime() + 60000);
      expect(log.isWithinWindow(windowStart, windowEnd)).toBe(true);

      // Log timestamp exactly at window end
      const windowStart2 = new Date(requestedAt.getTime() - 60000);
      const windowEnd2 = requestedAt;
      expect(log.isWithinWindow(windowStart2, windowEnd2)).toBe(false);
    });
  });

  describe('getAgeInSeconds', () => {
    it('should calculate age in seconds from current time', () => {
      const pastTimestamp = new Date(Date.now() - 30000); // 30 seconds ago
      const log = RateLimitLog.create({
        userId,
        endpointId,
        requestCount,
        requestedAt: pastTimestamp,
      }).getValue();

      const age = log.getAgeInSeconds();
      expect(age).toBeGreaterThanOrEqual(29);
      expect(age).toBeLessThanOrEqual(31);
    });

    it('should calculate age from specified time', () => {
      const logTime = new Date('2024-01-01T00:00:00Z');
      const currentTime = new Date('2024-01-01T00:01:00Z'); // 60 seconds later

      const log = RateLimitLog.create({
        userId,
        endpointId,
        requestCount,
        requestedAt: logTime,
      }).getValue();

      expect(log.getAgeInSeconds(currentTime)).toBe(60);
    });

    it('should return 0 for just created log', () => {
      const now = new Date();
      const log = RateLimitLog.create({
        userId,
        endpointId,
        requestCount,
        requestedAt: now,
      }).getValue();

      expect(log.getAgeInSeconds(now)).toBe(0);
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute from existing data', () => {
      const id = RateLimitLogId.generate();
      const props = {
        userId,
        endpointId,
        requestCount,
        requestedAt,
        requestMetadata: {
          ip: '192.168.1.1',
          userAgent: 'test',
        },
      };

      const log = RateLimitLog.reconstitute(props, id);

      expect(log.id).toBe(id);
      expect(log.userId).toBe(userId);
      expect(log.endpointId).toBe(endpointId);
      expect(log.requestCount).toBe(requestCount);
      expect(log.requestedAt).toEqual(requestedAt);
      expect(log.requestMetadata).toEqual(props.requestMetadata);
    });
  });
});