import { describe, it, expect } from 'vitest';
import { RequestCount } from '../request-count';

describe('RequestCount', () => {
  describe('constructor', () => {
    it('should create with valid count', () => {
      const count = new RequestCount(5);
      expect(count.count).toBe(5);
    });

    it('should create with zero count', () => {
      const count = new RequestCount(0);
      expect(count.count).toBe(0);
    });

    it('should throw for negative count', () => {
      expect(() => new RequestCount(-1)).toThrow('Request count cannot be negative');
    });

    it('should throw for non-integer count', () => {
      expect(() => new RequestCount(3.14)).toThrow('Request count must be an integer');
    });
  });

  describe('exceeds', () => {
    it('should return true when count equals limit', () => {
      const count = new RequestCount(5);
      expect(count.exceeds(5)).toBe(true);
    });

    it('should return true when count exceeds limit', () => {
      const count = new RequestCount(10);
      expect(count.exceeds(5)).toBe(true);
    });

    it('should return false when count is below limit', () => {
      const count = new RequestCount(3);
      expect(count.exceeds(5)).toBe(false);
    });

    it('should handle zero limit correctly', () => {
      const count = new RequestCount(0);
      expect(count.exceeds(0)).toBe(true);

      const count2 = new RequestCount(1);
      expect(count2.exceeds(0)).toBe(true);
    });
  });

  describe('add', () => {
    it('should add counts correctly', () => {
      const count1 = new RequestCount(5);
      const count2 = count1.add(3);
      expect(count2.count).toBe(8);
      // Original should be unchanged
      expect(count1.count).toBe(5);
    });

    it('should handle adding zero', () => {
      const count = new RequestCount(5);
      const result = count.add(0);
      expect(result.count).toBe(5);
    });

    it('should handle adding negative numbers', () => {
      const count = new RequestCount(5);
      const result = count.add(-2);
      expect(result.count).toBe(3);
    });

    it('should throw when result would be negative', () => {
      const count = new RequestCount(5);
      expect(() => count.add(-10)).toThrow('Request count cannot be negative');
    });
  });

  describe('equals', () => {
    it('should return true for same counts', () => {
      const count1 = new RequestCount(5);
      const count2 = new RequestCount(5);
      expect(count1.equals(count2)).toBe(true);
    });

    it('should return false for different counts', () => {
      const count1 = new RequestCount(5);
      const count2 = new RequestCount(3);
      expect(count1.equals(count2)).toBe(false);
    });

    it('should return false for null', () => {
      const count = new RequestCount(5);
      expect(count.equals(null as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation of count', () => {
      const count = new RequestCount(42);
      expect(count.toString()).toBe('42');
    });

    it('should handle zero', () => {
      const count = new RequestCount(0);
      expect(count.toString()).toBe('0');
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const count = new RequestCount(5);
      expect(() => {
        (count as any).count = 10;
      }).toThrow();
    });
  });
});
