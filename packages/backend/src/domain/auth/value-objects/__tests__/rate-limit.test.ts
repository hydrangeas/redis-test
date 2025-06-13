import { describe, it, expect } from 'vitest';
import { RateLimit } from '../rate-limit';
import { ValidationError } from '../../../errors/exceptions';

describe('RateLimit', () => {
  describe('constructor', () => {
    it('should create valid RateLimit', () => {
      const rateLimit = new RateLimit(100, 60);
      expect(rateLimit.maxRequests).toBe(100);
      expect(rateLimit.windowSeconds).toBe(60);
    });

    it('should be immutable', () => {
      const rateLimit = new RateLimit(100, 60);
      expect(() => {
        (rateLimit as any).maxRequests = 200;
      }).toThrow();
    });

    it('should throw error for non-positive maxRequests', () => {
      expect(() => new RateLimit(0, 60)).toThrow(ValidationError);
      expect(() => new RateLimit(-1, 60)).toThrow(ValidationError);
    });

    it('should throw error for non-positive windowSeconds', () => {
      expect(() => new RateLimit(100, 0)).toThrow(ValidationError);
      expect(() => new RateLimit(100, -1)).toThrow(ValidationError);
    });

    it('should throw error for non-integer values', () => {
      expect(() => new RateLimit(100.5, 60)).toThrow(ValidationError);
      expect(() => new RateLimit(100, 60.5)).toThrow(ValidationError);
    });
  });

  describe('equals', () => {
    it('should return true for equal rate limits', () => {
      const rateLimit1 = new RateLimit(100, 60);
      const rateLimit2 = new RateLimit(100, 60);
      expect(rateLimit1.equals(rateLimit2)).toBe(true);
    });

    it('should return false for different rate limits', () => {
      const rateLimit1 = new RateLimit(100, 60);
      const rateLimit2 = new RateLimit(200, 60);
      const rateLimit3 = new RateLimit(100, 120);
      
      expect(rateLimit1.equals(rateLimit2)).toBe(false);
      expect(rateLimit1.equals(rateLimit3)).toBe(false);
    });
  });

  describe('static factory methods', () => {
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

  describe('getRequestsPerSecond', () => {
    it('should calculate requests per second correctly', () => {
      const rateLimit1 = new RateLimit(60, 60);
      expect(rateLimit1.getRequestsPerSecond()).toBe(1);

      const rateLimit2 = new RateLimit(120, 60);
      expect(rateLimit2.getRequestsPerSecond()).toBe(2);

      const rateLimit3 = new RateLimit(100, 10);
      expect(rateLimit3.getRequestsPerSecond()).toBe(10);
    });
  });

  describe('isMoreRestrictiveThan', () => {
    it('should compare rate limits correctly', () => {
      const tier1 = RateLimit.TIER1_DEFAULT();
      const tier2 = RateLimit.TIER2_DEFAULT();
      const tier3 = RateLimit.TIER3_DEFAULT();

      expect(tier1.isMoreRestrictiveThan(tier2)).toBe(true);
      expect(tier1.isMoreRestrictiveThan(tier3)).toBe(true);
      expect(tier2.isMoreRestrictiveThan(tier3)).toBe(true);
      
      expect(tier3.isMoreRestrictiveThan(tier1)).toBe(false);
      expect(tier2.isMoreRestrictiveThan(tier1)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should format correctly for 60 second window', () => {
      const rateLimit = new RateLimit(100, 60);
      expect(rateLimit.toString()).toBe('100 requests per minute');
    });

    it('should format correctly for other windows', () => {
      const rateLimit = new RateLimit(100, 30);
      expect(rateLimit.toString()).toBe('100 requests per 30 seconds');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const rateLimit = new RateLimit(100, 60);
      const json = rateLimit.toJSON();
      
      expect(json).toEqual({
        maxRequests: 100,
        windowSeconds: 60,
      });
    });

    it('should deserialize from JSON', () => {
      const json = { maxRequests: 100, windowSeconds: 60 };
      const rateLimit = RateLimit.fromJSON(json);
      
      expect(rateLimit.maxRequests).toBe(100);
      expect(rateLimit.windowSeconds).toBe(60);
    });

    it('should maintain equality through serialization', () => {
      const original = new RateLimit(100, 60);
      const json = original.toJSON();
      const restored = RateLimit.fromJSON(json);
      
      expect(original.equals(restored)).toBe(true);
    });
  });
});