import { describe, it, expect } from 'vitest';
import { TierLevel, TierLevelOrder, isValidTierLevel, parseTierLevel } from '../tier-level';

describe('TierLevel', () => {
  describe('enum values', () => {
    it('should have correct tier levels', () => {
      expect(TierLevel.TIER1).toBe('TIER1');
      expect(TierLevel.TIER2).toBe('TIER2');
      expect(TierLevel.TIER3).toBe('TIER3');
    });
  });

  describe('TierLevelOrder', () => {
    it('should have correct order values', () => {
      expect(TierLevelOrder[TierLevel.TIER1]).toBe(1);
      expect(TierLevelOrder[TierLevel.TIER2]).toBe(2);
      expect(TierLevelOrder[TierLevel.TIER3]).toBe(3);
    });

    it('should maintain hierarchy', () => {
      expect(TierLevelOrder[TierLevel.TIER1]).toBeLessThan(TierLevelOrder[TierLevel.TIER2]);
      expect(TierLevelOrder[TierLevel.TIER2]).toBeLessThan(TierLevelOrder[TierLevel.TIER3]);
    });
  });

  describe('isValidTierLevel', () => {
    it('should return true for valid tier levels', () => {
      expect(isValidTierLevel('TIER1')).toBe(true);
      expect(isValidTierLevel('TIER2')).toBe(true);
      expect(isValidTierLevel('TIER3')).toBe(true);
    });

    it('should return false for invalid tier levels', () => {
      expect(isValidTierLevel('TIER4')).toBe(false);
      expect(isValidTierLevel('tier1')).toBe(false);
      expect(isValidTierLevel('INVALID')).toBe(false);
      expect(isValidTierLevel('')).toBe(false);
    });
  });

  describe('parseTierLevel', () => {
    it('should parse valid tier levels case-insensitively', () => {
      expect(parseTierLevel('tier1')).toBe(TierLevel.TIER1);
      expect(parseTierLevel('TIER2')).toBe(TierLevel.TIER2);
      expect(parseTierLevel('TiEr3')).toBe(TierLevel.TIER3);
    });

    it('should throw error for invalid tier levels', () => {
      expect(() => parseTierLevel('TIER4')).toThrow('Invalid tier level: TIER4');
      expect(() => parseTierLevel('invalid')).toThrow('Invalid tier level: invalid');
      expect(() => parseTierLevel('')).toThrow('Invalid tier level: ');
    });
  });
});