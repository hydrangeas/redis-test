import { describe, it, expect } from 'vitest';
import { RateLimit } from '../rate-limit';

describe('RateLimit', () => {
  describe('create (Result pattern)', () => {
    it('should create valid RateLimit with Result.ok', () => {
      const result = RateLimit.create(100, 60);

      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);

      const rateLimit = result.getValue();
      expect(rateLimit.maxRequests).toBe(100);
      expect(rateLimit.windowSeconds).toBe(60);
    });

    it('should return Result.fail for null or undefined maxRequests', () => {
      const resultNull = RateLimit.create(null as any, 60);
      const resultUndefined = RateLimit.create(undefined as any, 60);

      expect(resultNull.isFailure).toBe(true);
      expect(resultUndefined.isFailure).toBe(true);

      expect(resultNull.getError().code).toBe('INVALID_MAX_REQUESTS');
      expect(resultUndefined.getError().code).toBe('INVALID_MAX_REQUESTS');
    });

    it('should return Result.fail for null or undefined windowSeconds', () => {
      const resultNull = RateLimit.create(100, null as any);
      const resultUndefined = RateLimit.create(100, undefined as any);

      expect(resultNull.isFailure).toBe(true);
      expect(resultUndefined.isFailure).toBe(true);

      expect(resultNull.getError().code).toBe('INVALID_WINDOW_SECONDS');
      expect(resultUndefined.getError().code).toBe('INVALID_WINDOW_SECONDS');
    });

    it('should return Result.fail for non-integer maxRequests', () => {
      const result = RateLimit.create(100.5, 60);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_MAX_REQUESTS');
      expect(result.getError().message).toContain('must be an integer');
    });

    it('should return Result.fail for non-integer windowSeconds', () => {
      const result = RateLimit.create(100, 60.5);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_WINDOW_SECONDS');
      expect(result.getError().message).toContain('must be an integer');
    });

    it('should return Result.fail for zero or negative maxRequests', () => {
      const result1 = RateLimit.create(0, 60);
      const result2 = RateLimit.create(-10, 60);

      expect(result1.isFailure).toBe(true);
      expect(result2.isFailure).toBe(true);

      expect(result1.getError().code).toBe('INVALID_MAX_REQUESTS');
      expect(result1.getError().message).toContain('must be positive');
    });

    it('should return Result.fail for zero or negative windowSeconds', () => {
      const result1 = RateLimit.create(100, 0);
      const result2 = RateLimit.create(100, -10);

      expect(result1.isFailure).toBe(true);
      expect(result2.isFailure).toBe(true);

      expect(result1.getError().code).toBe('INVALID_WINDOW_SECONDS');
      expect(result1.getError().message).toContain('must be positive');
    });

    it('should return Result.fail for maxRequests exceeding limit', () => {
      const result = RateLimit.create(10001, 60);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('MAX_REQUESTS_TOO_HIGH');
      expect(result.getError().message).toContain('cannot exceed 10000');
    });

    it('should return Result.fail for windowSeconds exceeding 24 hours', () => {
      const result = RateLimit.create(100, 86401);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('WINDOW_SECONDS_TOO_HIGH');
      expect(result.getError().message).toContain('cannot exceed 86400');
    });

    it('should accept edge case values', () => {
      const result1 = RateLimit.create(1, 1);
      const result2 = RateLimit.create(10000, 86400);

      expect(result1.isSuccess).toBe(true);
      expect(result2.isSuccess).toBe(true);
    });
  });

  describe('fromValues (exception pattern)', () => {
    it('should create valid RateLimit', () => {
      const rateLimit = RateLimit.fromValues(100, 60);

      expect(rateLimit.maxRequests).toBe(100);
      expect(rateLimit.windowSeconds).toBe(60);
    });

    it('should throw error for invalid values', () => {
      expect(() => RateLimit.fromValues(0, 60)).toThrow(Error);
      expect(() => RateLimit.fromValues(100, 0)).toThrow(Error);
      expect(() => RateLimit.fromValues(100.5, 60)).toThrow(Error);
    });
  });

  describe('default rate limits', () => {
    it('should create TIER1 default rate limit', () => {
      const rateLimit = RateLimit.TIER1_DEFAULT();

      expect(rateLimit.maxRequests).toBe(60);
      expect(rateLimit.windowSeconds).toBe(60);
    });

    it('should create TIER2 default rate limit', () => {
      const rateLimit = RateLimit.TIER2_DEFAULT();

      expect(rateLimit.maxRequests).toBe(120);
      expect(rateLimit.windowSeconds).toBe(60);
    });

    it('should create TIER3 default rate limit', () => {
      const rateLimit = RateLimit.TIER3_DEFAULT();

      expect(rateLimit.maxRequests).toBe(300);
      expect(rateLimit.windowSeconds).toBe(60);
    });
  });

  describe('equals', () => {
    it('should return true for equal RateLimits', () => {
      const rateLimit1 = RateLimit.fromValues(100, 60);
      const rateLimit2 = RateLimit.fromValues(100, 60);

      expect(rateLimit1.equals(rateLimit2)).toBe(true);
    });

    it('should return false for different maxRequests', () => {
      const rateLimit1 = RateLimit.fromValues(100, 60);
      const rateLimit2 = RateLimit.fromValues(200, 60);

      expect(rateLimit1.equals(rateLimit2)).toBe(false);
    });

    it('should return false for different windowSeconds', () => {
      const rateLimit1 = RateLimit.fromValues(100, 60);
      const rateLimit2 = RateLimit.fromValues(100, 120);

      expect(rateLimit1.equals(rateLimit2)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      const rateLimit = RateLimit.fromValues(100, 60);

      expect(rateLimit.equals(null as any)).toBe(false);
      expect(rateLimit.equals(undefined as any)).toBe(false);
    });
  });

  describe('getRequestsPerMinute', () => {
    it('should calculate requests per minute correctly', () => {
      const rateLimit1 = RateLimit.fromValues(60, 60); // 60 req/min
      const rateLimit2 = RateLimit.fromValues(300, 300); // 60 req/min
      const rateLimit3 = RateLimit.fromValues(10, 30); // 20 req/min

      expect(rateLimit1.getRequestsPerMinute()).toBe(60);
      expect(rateLimit2.getRequestsPerMinute()).toBe(60);
      expect(rateLimit3.getRequestsPerMinute()).toBe(20);
    });
  });

  describe('comparison methods', () => {
    it('should correctly compare strictness', () => {
      const strict = RateLimit.fromValues(30, 60); // 30 req/min
      const loose = RateLimit.fromValues(120, 60); // 120 req/min

      expect(strict.isStricterThan(loose)).toBe(true);
      expect(loose.isStricterThan(strict)).toBe(false);
      expect(strict.isStricterThan(strict)).toBe(false);
    });

    it('should correctly compare looseness', () => {
      const strict = RateLimit.fromValues(30, 60); // 30 req/min
      const loose = RateLimit.fromValues(120, 60); // 120 req/min

      expect(loose.isLooserThan(strict)).toBe(true);
      expect(strict.isLooserThan(loose)).toBe(false);
      expect(loose.isLooserThan(loose)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should format as requests/minute for 60 second window', () => {
      const rateLimit = RateLimit.fromValues(100, 60);

      expect(rateLimit.toString()).toBe('100 requests/minute');
    });

    it('should format as requests/hour for 3600 second window', () => {
      const rateLimit = RateLimit.fromValues(1000, 3600);

      expect(rateLimit.toString()).toBe('1000 requests/hour');
    });

    it('should format as requests/Xs for other windows', () => {
      const rateLimit = RateLimit.fromValues(50, 30);

      expect(rateLimit.toString()).toBe('50 requests/30s');
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should serialize to JSON', () => {
      const rateLimit = RateLimit.fromValues(100, 60);
      const json = rateLimit.toJSON();

      expect(json).toEqual({
        maxRequests: 100,
        windowSeconds: 60,
      });
    });

    it('should deserialize from JSON', () => {
      const json = {
        maxRequests: 100,
        windowSeconds: 60,
      };

      const rateLimit = RateLimit.fromJSON(json);

      expect(rateLimit.maxRequests).toBe(100);
      expect(rateLimit.windowSeconds).toBe(60);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => RateLimit.fromJSON({ maxRequests: 0, windowSeconds: 60 })).toThrow(Error);
      expect(() => RateLimit.fromJSON({ maxRequests: 100, windowSeconds: 0 })).toThrow(Error);
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const rateLimit = RateLimit.fromValues(100, 60);

      expect(() => {
        (rateLimit as any)._maxRequests = 200;
      }).toThrow();

      expect(() => {
        (rateLimit as any)._windowSeconds = 120;
      }).toThrow();
    });
  });
});
