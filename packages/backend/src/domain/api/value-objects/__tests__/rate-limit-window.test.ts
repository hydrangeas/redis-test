import { describe, it, expect } from 'vitest';
import { RateLimitWindow } from '../rate-limit-window';

describe('RateLimitWindow', () => {
  describe('constructor', () => {
    it('should create a window with valid size', () => {
      const window = new RateLimitWindow(60);
      expect(window.windowSizeSeconds).toBe(60);
    });

    it('should throw for zero window size', () => {
      expect(() => new RateLimitWindow(0)).toThrow('Window size must be positive');
    });

    it('should throw for negative window size', () => {
      expect(() => new RateLimitWindow(-60)).toThrow('Window size must be positive');
    });

    it('should throw for non-integer window size', () => {
      expect(() => new RateLimitWindow(60.5)).toThrow('Window size must be an integer');
    });

    it('should align window to size boundaries', () => {
      const now = new Date('2024-01-01T12:34:56.789Z');
      const window = new RateLimitWindow(60, now);
      
      // Should align to the start of the minute
      expect(window.startTime.toISOString()).toBe('2024-01-01T12:34:00.000Z');
      expect(window.endTime.toISOString()).toBe('2024-01-01T12:35:00.000Z');
    });

    it('should handle different window sizes', () => {
      const now = new Date('2024-01-01T12:34:56.789Z');
      
      // 5 minute window
      const window5min = new RateLimitWindow(300, now);
      expect(window5min.startTime.toISOString()).toBe('2024-01-01T12:30:00.000Z');
      expect(window5min.endTime.toISOString()).toBe('2024-01-01T12:35:00.000Z');
      
      // 1 hour window
      const window1hour = new RateLimitWindow(3600, now);
      expect(window1hour.startTime.toISOString()).toBe('2024-01-01T12:00:00.000Z');
      expect(window1hour.endTime.toISOString()).toBe('2024-01-01T13:00:00.000Z');
    });
  });

  describe('contains', () => {
    it('should return true for timestamps within window', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window = new RateLimitWindow(60, now);
      
      const withinWindow = new Date('2024-01-01T12:00:15.000Z');
      expect(window.contains(withinWindow)).toBe(true);
    });

    it('should return false for timestamps before window', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window = new RateLimitWindow(60, now);
      
      const beforeWindow = new Date('2024-01-01T11:59:59.999Z');
      expect(window.contains(beforeWindow)).toBe(false);
    });

    it('should return false for timestamps after window', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window = new RateLimitWindow(60, now);
      
      const afterWindow = new Date('2024-01-01T12:01:00.001Z');
      expect(window.contains(afterWindow)).toBe(false);
    });

    it('should include start time', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window = new RateLimitWindow(60, now);
      
      expect(window.contains(window.startTime)).toBe(true);
    });

    it('should exclude end time', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window = new RateLimitWindow(60, now);
      
      expect(window.contains(window.endTime)).toBe(false);
    });
  });

  describe('getSecondsUntilExpires', () => {
    it('should calculate seconds until window expires', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window = new RateLimitWindow(60, now);
      
      const timestamp = new Date('2024-01-01T12:00:15.000Z');
      const secondsUntilExpires = window.getSecondsUntilExpires(timestamp);
      
      expect(secondsUntilExpires).toBe(45); // 60 - 15 = 45 seconds
    });

    it('should round up fractional seconds', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window = new RateLimitWindow(60, now);
      
      const timestamp = new Date('2024-01-01T12:00:15.500Z');
      const secondsUntilExpires = window.getSecondsUntilExpires(timestamp);
      
      expect(secondsUntilExpires).toBe(45); // Rounds up 44.5 to 45
    });

    it('should handle timestamp at window start', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window = new RateLimitWindow(60, now);
      
      const secondsUntilExpires = window.getSecondsUntilExpires(window.startTime);
      expect(secondsUntilExpires).toBe(60);
    });

    it('should handle timestamp after window end', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window = new RateLimitWindow(60, now);
      
      const afterWindow = new Date('2024-01-01T12:02:00.000Z');
      const secondsUntilExpires = window.getSecondsUntilExpires(afterWindow);
      
      expect(secondsUntilExpires).toBeLessThan(0);
    });
  });

  describe('equals', () => {
    it('should return true for windows with same size and start time', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window1 = new RateLimitWindow(60, now);
      const window2 = new RateLimitWindow(60, new Date('2024-01-01T12:00:45.000Z'));
      
      expect(window1.equals(window2)).toBe(true);
    });

    it('should return false for different window sizes', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window1 = new RateLimitWindow(60, now);
      const window2 = new RateLimitWindow(120, now);
      
      expect(window1.equals(window2)).toBe(false);
    });

    it('should return false for different start times', () => {
      const window1 = new RateLimitWindow(60, new Date('2024-01-01T12:00:30.000Z'));
      const window2 = new RateLimitWindow(60, new Date('2024-01-01T12:01:30.000Z'));
      
      expect(window1.equals(window2)).toBe(false);
    });

    it('should return false for null', () => {
      const window = new RateLimitWindow(60);
      expect(window.equals(null as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return readable window representation', () => {
      const now = new Date('2024-01-01T12:00:30.000Z');
      const window = new RateLimitWindow(60, now);
      
      expect(window.toString()).toBe('Window[2024-01-01T12:00:00.000Z-2024-01-01T12:01:00.000Z]');
    });
  });

  describe('immutability', () => {
    it('should return copies of dates', () => {
      const window = new RateLimitWindow(60);
      const start1 = window.startTime;
      const start2 = window.startTime;
      
      expect(start1).not.toBe(start2); // Different objects
      expect(start1.getTime()).toBe(start2.getTime()); // Same value
    });

    it('should be immutable', () => {
      const window = new RateLimitWindow(60);
      expect(() => {
        (window as any).windowSizeSeconds = 120;
      }).toThrow();
    });
  });
});