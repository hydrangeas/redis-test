import { describe, it, expect } from 'vitest';
import { UserTier } from '../user-tier';
import { TierLevel } from '../tier-level';
import { RateLimit } from '../rate-limit';
import { ValidationError } from '../../../errors/exceptions';

describe('UserTier', () => {
  describe('constructor', () => {
    it('should create UserTier with default rate limit', () => {
      const tier = new UserTier(TierLevel.TIER1);
      expect(tier.level).toBe(TierLevel.TIER1);
      expect(tier.rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
    });

    it('should create UserTier with custom rate limit', () => {
      const customRateLimit = new RateLimit(100, 30);
      const tier = new UserTier(TierLevel.TIER2, customRateLimit);
      expect(tier.level).toBe(TierLevel.TIER2);
      expect(tier.rateLimit.equals(customRateLimit)).toBe(true);
    });

    it('should apply correct default rate limits for each tier', () => {
      const tier1 = new UserTier(TierLevel.TIER1);
      const tier2 = new UserTier(TierLevel.TIER2);
      const tier3 = new UserTier(TierLevel.TIER3);

      expect(tier1.rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
      expect(tier2.rateLimit.equals(RateLimit.TIER2_DEFAULT())).toBe(true);
      expect(tier3.rateLimit.equals(RateLimit.TIER3_DEFAULT())).toBe(true);
    });

    it('should be immutable', () => {
      const tier = new UserTier(TierLevel.TIER1);
      expect(() => {
        (tier as any).level = TierLevel.TIER2;
      }).toThrow();
    });

    it('should throw error for invalid tier level', () => {
      expect(() => new UserTier('INVALID' as TierLevel)).toThrow(ValidationError);
    });
  });

  describe('rateLimit accessors', () => {
    it('should return rate limit via getter', () => {
      const tier = new UserTier(TierLevel.TIER1);
      const rateLimit = tier.rateLimit;
      expect(rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
    });

    it('should return rate limit via method', () => {
      const tier = new UserTier(TierLevel.TIER1);
      const rateLimit = tier.getRateLimit();
      expect(rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for equal tiers', () => {
      const tier1 = new UserTier(TierLevel.TIER1);
      const tier2 = new UserTier(TierLevel.TIER1);
      expect(tier1.equals(tier2)).toBe(true);
    });

    it('should return false for different tier levels', () => {
      const tier1 = new UserTier(TierLevel.TIER1);
      const tier2 = new UserTier(TierLevel.TIER2);
      expect(tier1.equals(tier2)).toBe(false);
    });

    it('should return false for same level but different rate limits', () => {
      const customRateLimit = new RateLimit(100, 30);
      const tier1 = new UserTier(TierLevel.TIER1);
      const tier2 = new UserTier(TierLevel.TIER1, customRateLimit);
      expect(tier1.equals(tier2)).toBe(false);
    });
  });

  describe('tier comparisons', () => {
    const tier1 = new UserTier(TierLevel.TIER1);
    const tier2 = new UserTier(TierLevel.TIER2);
    const tier3 = new UserTier(TierLevel.TIER3);

    describe('isHigherThanOrEqualTo', () => {
      it('should return true when comparing same tiers', () => {
        expect(tier1.isHigherThanOrEqualTo(tier1)).toBe(true);
        expect(tier2.isHigherThanOrEqualTo(tier2)).toBe(true);
      });

      it('should return true when comparing higher to lower', () => {
        expect(tier2.isHigherThanOrEqualTo(tier1)).toBe(true);
        expect(tier3.isHigherThanOrEqualTo(tier1)).toBe(true);
        expect(tier3.isHigherThanOrEqualTo(tier2)).toBe(true);
      });

      it('should return false when comparing lower to higher', () => {
        expect(tier1.isHigherThanOrEqualTo(tier2)).toBe(false);
        expect(tier1.isHigherThanOrEqualTo(tier3)).toBe(false);
        expect(tier2.isHigherThanOrEqualTo(tier3)).toBe(false);
      });
    });

    describe('isHigherThan', () => {
      it('should return false when comparing same tiers', () => {
        expect(tier1.isHigherThan(tier1)).toBe(false);
      });

      it('should return true when comparing higher to lower', () => {
        expect(tier2.isHigherThan(tier1)).toBe(true);
        expect(tier3.isHigherThan(tier2)).toBe(true);
      });

      it('should return false when comparing lower to higher', () => {
        expect(tier1.isHigherThan(tier2)).toBe(false);
      });
    });

    describe('isLowerThanOrEqualTo', () => {
      it('should return true when comparing same tiers', () => {
        expect(tier1.isLowerThanOrEqualTo(tier1)).toBe(true);
      });

      it('should return true when comparing lower to higher', () => {
        expect(tier1.isLowerThanOrEqualTo(tier2)).toBe(true);
        expect(tier1.isLowerThanOrEqualTo(tier3)).toBe(true);
      });

      it('should return false when comparing higher to lower', () => {
        expect(tier2.isLowerThanOrEqualTo(tier1)).toBe(false);
        expect(tier3.isLowerThanOrEqualTo(tier1)).toBe(false);
      });
    });

    describe('isLowerThan', () => {
      it('should return false when comparing same tiers', () => {
        expect(tier1.isLowerThan(tier1)).toBe(false);
      });

      it('should return true when comparing lower to higher', () => {
        expect(tier1.isLowerThan(tier2)).toBe(true);
        expect(tier2.isLowerThan(tier3)).toBe(true);
      });

      it('should return false when comparing higher to lower', () => {
        expect(tier2.isLowerThan(tier1)).toBe(false);
      });
    });
  });

  describe('getNextTier', () => {
    it('should return next tier for TIER1', () => {
      const tier = new UserTier(TierLevel.TIER1);
      expect(tier.getNextTier()).toBe(TierLevel.TIER2);
    });

    it('should return next tier for TIER2', () => {
      const tier = new UserTier(TierLevel.TIER2);
      expect(tier.getNextTier()).toBe(TierLevel.TIER3);
    });

    it('should return null for TIER3', () => {
      const tier = new UserTier(TierLevel.TIER3);
      expect(tier.getNextTier()).toBeNull();
    });
  });

  describe('toString', () => {
    it('should format tier information', () => {
      const tier = new UserTier(TierLevel.TIER1);
      expect(tier.toString()).toBe('TIER1 (60 requests per minute)');
    });

    it('should include custom rate limit in string', () => {
      const customRateLimit = new RateLimit(100, 30);
      const tier = new UserTier(TierLevel.TIER2, customRateLimit);
      expect(tier.toString()).toBe('TIER2 (100 requests per 30 seconds)');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const tier = new UserTier(TierLevel.TIER2);
      const json = tier.toJSON();
      
      expect(json).toEqual({
        level: TierLevel.TIER2,
        rateLimit: {
          maxRequests: 120,
          windowSeconds: 60,
        },
      });
    });

    it('should deserialize from JSON with default rate limit', () => {
      const json = { level: 'TIER2' };
      const tier = UserTier.fromJSON(json);
      
      expect(tier.level).toBe(TierLevel.TIER2);
      expect(tier.rateLimit.equals(RateLimit.TIER2_DEFAULT())).toBe(true);
    });

    it('should deserialize from JSON with custom rate limit', () => {
      const json = {
        level: 'TIER1',
        rateLimit: { maxRequests: 100, windowSeconds: 30 },
      };
      const tier = UserTier.fromJSON(json);
      
      expect(tier.level).toBe(TierLevel.TIER1);
      expect(tier.rateLimit.maxRequests).toBe(100);
      expect(tier.rateLimit.windowSeconds).toBe(30);
    });

    it('should maintain equality through serialization', () => {
      const original = new UserTier(TierLevel.TIER2, new RateLimit(100, 30));
      const json = original.toJSON();
      const restored = UserTier.fromJSON(json);
      
      expect(original.equals(restored)).toBe(true);
    });
  });

  describe('createDefaultTier', () => {
    it('should create TIER1 with default settings', () => {
      const tier = UserTier.createDefaultTier();
      expect(tier.level).toBe(TierLevel.TIER1);
      expect(tier.rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
    });
  });
});