import { describe, it, expect } from 'vitest';
import { UserTier } from '../user-tier';
import { TierLevel } from '../tier-level';
import { RateLimit } from '../rate-limit';

describe('UserTier', () => {
  describe('create (Result pattern)', () => {
    it('should create UserTier with default rate limit', () => {
      const result = UserTier.create(TierLevel.TIER1);

      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);

      const tier = result.getValue();
      expect(tier.level).toBe(TierLevel.TIER1);
      expect(tier.rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
    });

    it('should create UserTier with custom rate limit', () => {
      const customRateLimit = RateLimit.fromValues(100, 30);
      const result = UserTier.create(TierLevel.TIER2, customRateLimit);

      expect(result.isSuccess).toBe(true);

      const tier = result.getValue();
      expect(tier.level).toBe(TierLevel.TIER2);
      expect(tier.rateLimit.equals(customRateLimit)).toBe(true);
    });

    it('should apply correct default rate limits for each tier', () => {
      const tier1Result = UserTier.create(TierLevel.TIER1);
      const tier2Result = UserTier.create(TierLevel.TIER2);
      const tier3Result = UserTier.create(TierLevel.TIER3);

      expect(tier1Result.isSuccess).toBe(true);
      expect(tier2Result.isSuccess).toBe(true);
      expect(tier3Result.isSuccess).toBe(true);

      const tier1 = tier1Result.getValue();
      const tier2 = tier2Result.getValue();
      const tier3 = tier3Result.getValue();

      expect(tier1.rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
      expect(tier2.rateLimit.equals(RateLimit.TIER2_DEFAULT())).toBe(true);
      expect(tier3.rateLimit.equals(RateLimit.TIER3_DEFAULT())).toBe(true);
    });

    it('should return Result.fail for null or undefined tier level', () => {
      const resultNull = UserTier.create(null as any);
      const resultUndefined = UserTier.create(undefined as any);

      expect(resultNull.isFailure).toBe(true);
      expect(resultUndefined.isFailure).toBe(true);

      expect(resultNull.getError().code).toBe('INVALID_TIER_LEVEL');
      expect(resultUndefined.getError().code).toBe('INVALID_TIER_LEVEL');
    });

    it('should return Result.fail for invalid tier level', () => {
      const result = UserTier.create('INVALID' as TierLevel);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_TIER_LEVEL');
      expect(result.getError().message).toContain('Invalid tier level');
    });
  });

  describe('createDefault (exception pattern)', () => {
    it('should create UserTier with default rate limit', () => {
      const tier = UserTier.createDefault(TierLevel.TIER1);

      expect(tier.level).toBe(TierLevel.TIER1);
      expect(tier.rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
    });

    it('should throw error for invalid tier level', () => {
      expect(() => UserTier.createDefault('INVALID' as TierLevel)).toThrow(Error);
    });
  });

  describe('rateLimit accessors', () => {
    it('should return rate limit via getter', () => {
      const tier = UserTier.createDefault(TierLevel.TIER1);
      const rateLimit = tier.rateLimit;

      expect(rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
    });

    it('should return rate limit via getRateLimit method', () => {
      const tier = UserTier.createDefault(TierLevel.TIER1);
      const rateLimit = tier.getRateLimit();

      expect(rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
    });
  });

  describe('tier comparison methods', () => {
    it('should correctly determine if tier is higher than or equal to another', () => {
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);
      const tier3 = UserTier.createDefault(TierLevel.TIER3);

      expect(tier3.isHigherThanOrEqualTo(tier1)).toBe(true);
      expect(tier3.isHigherThanOrEqualTo(tier2)).toBe(true);
      expect(tier3.isHigherThanOrEqualTo(tier3)).toBe(true);

      expect(tier2.isHigherThanOrEqualTo(tier1)).toBe(true);
      expect(tier2.isHigherThanOrEqualTo(tier2)).toBe(true);
      expect(tier2.isHigherThanOrEqualTo(tier3)).toBe(false);

      expect(tier1.isHigherThanOrEqualTo(tier1)).toBe(true);
      expect(tier1.isHigherThanOrEqualTo(tier2)).toBe(false);
      expect(tier1.isHigherThanOrEqualTo(tier3)).toBe(false);
    });

    it('should correctly determine if tier meets requirement', () => {
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);
      const tier3 = UserTier.createDefault(TierLevel.TIER3);

      expect(tier1.meetsRequirement(TierLevel.TIER1)).toBe(true);
      expect(tier1.meetsRequirement(TierLevel.TIER2)).toBe(false);
      expect(tier1.meetsRequirement(TierLevel.TIER3)).toBe(false);

      expect(tier2.meetsRequirement(TierLevel.TIER1)).toBe(true);
      expect(tier2.meetsRequirement(TierLevel.TIER2)).toBe(true);
      expect(tier2.meetsRequirement(TierLevel.TIER3)).toBe(false);

      expect(tier3.meetsRequirement(TierLevel.TIER1)).toBe(true);
      expect(tier3.meetsRequirement(TierLevel.TIER2)).toBe(true);
      expect(tier3.meetsRequirement(TierLevel.TIER3)).toBe(true);
    });

    it('should correctly determine if tier is higher than another', () => {
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);
      const tier3 = UserTier.createDefault(TierLevel.TIER3);

      expect(tier3.isHigherThan(tier2)).toBe(true);
      expect(tier3.isHigherThan(tier1)).toBe(true);
      expect(tier2.isHigherThan(tier1)).toBe(true);

      expect(tier1.isHigherThan(tier2)).toBe(false);
      expect(tier1.isHigherThan(tier3)).toBe(false);
      expect(tier2.isHigherThan(tier3)).toBe(false);

      expect(tier1.isHigherThan(tier1)).toBe(false);
    });

    it('should correctly determine if tier is lower than or equal to another', () => {
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);
      const tier3 = UserTier.createDefault(TierLevel.TIER3);

      expect(tier1.isLowerThanOrEqualTo(tier1)).toBe(true);
      expect(tier1.isLowerThanOrEqualTo(tier2)).toBe(true);
      expect(tier1.isLowerThanOrEqualTo(tier3)).toBe(true);

      expect(tier2.isLowerThanOrEqualTo(tier1)).toBe(false);
      expect(tier2.isLowerThanOrEqualTo(tier2)).toBe(true);
      expect(tier2.isLowerThanOrEqualTo(tier3)).toBe(true);
    });

    it('should correctly determine if tier is lower than another', () => {
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);
      const tier3 = UserTier.createDefault(TierLevel.TIER3);

      expect(tier1.isLowerThan(tier2)).toBe(true);
      expect(tier1.isLowerThan(tier3)).toBe(true);
      expect(tier2.isLowerThan(tier3)).toBe(true);

      expect(tier3.isLowerThan(tier2)).toBe(false);
      expect(tier3.isLowerThan(tier1)).toBe(false);
      expect(tier2.isLowerThan(tier1)).toBe(false);

      expect(tier1.isLowerThan(tier1)).toBe(false);
    });
  });

  describe('tier upgrade methods', () => {
    it('should get next tier level', () => {
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);
      const tier3 = UserTier.createDefault(TierLevel.TIER3);

      expect(tier1.getNextTier()).toBe(TierLevel.TIER2);
      expect(tier2.getNextTier()).toBe(TierLevel.TIER3);
      expect(tier3.getNextTier()).toBe(null);
    });

    it('should upgrade tier successfully', () => {
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const upgradeResult = tier1.upgrade();

      expect(upgradeResult.isSuccess).toBe(true);

      const upgradedTier = upgradeResult.getValue();
      expect(upgradedTier.level).toBe(TierLevel.TIER2);
      expect(upgradedTier.rateLimit.equals(RateLimit.TIER2_DEFAULT())).toBe(true);
    });

    it('should fail to upgrade from highest tier', () => {
      const tier3 = UserTier.createDefault(TierLevel.TIER3);
      const upgradeResult = tier3.upgrade();

      expect(upgradeResult.isFailure).toBe(true);
      expect(upgradeResult.getError().code).toBe('ALREADY_MAX_TIER');
      expect(upgradeResult.getError().message).toContain('already at the highest tier');
    });
  });

  describe('equals', () => {
    it('should return true for equal tiers', () => {
      const tier1a = UserTier.createDefault(TierLevel.TIER1);
      const tier1b = UserTier.createDefault(TierLevel.TIER1);

      expect(tier1a.equals(tier1b)).toBe(true);
    });

    it('should return false for different tier levels', () => {
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);

      expect(tier1.equals(tier2)).toBe(false);
    });

    it('should return false for same tier level with different rate limits', () => {
      const tier1a = UserTier.createDefault(TierLevel.TIER1);
      const customRateLimit = RateLimit.fromValues(100, 30);
      const tier1bResult = UserTier.create(TierLevel.TIER1, customRateLimit);
      const tier1b = tier1bResult.getValue();

      expect(tier1a.equals(tier1b)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      const tier = UserTier.createDefault(TierLevel.TIER1);

      expect(tier.equals(null as any)).toBe(false);
      expect(tier.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should format tier string correctly', () => {
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);
      const tier3 = UserTier.createDefault(TierLevel.TIER3);

      expect(tier1.toString()).toBe('TIER1 (60 requests/minute)');
      expect(tier2.toString()).toBe('TIER2 (120 requests/minute)');
      expect(tier3.toString()).toBe('TIER3 (300 requests/minute)');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const tier = UserTier.createDefault(TierLevel.TIER2);
      const json = tier.toJSON();

      expect(json).toEqual({
        level: 'TIER2',
        rateLimit: {
          maxRequests: 120,
          windowSeconds: 60,
        },
      });
    });

    it('should deserialize from JSON', () => {
      const json = {
        level: 'TIER2',
        rateLimit: {
          maxRequests: 120,
          windowSeconds: 60,
        },
      };

      const tier = UserTier.fromJSON(json);

      expect(tier.level).toBe(TierLevel.TIER2);
      expect(tier.rateLimit.maxRequests).toBe(120);
      expect(tier.rateLimit.windowSeconds).toBe(60);
    });

    it('should deserialize with default rate limit if not provided', () => {
      const json = {
        level: 'TIER1',
      };

      const tier = UserTier.fromJSON(json);

      expect(tier.level).toBe(TierLevel.TIER1);
      expect(tier.rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => UserTier.fromJSON({ level: 'INVALID' })).toThrow(Error);
    });
  });

  describe('createDefaultTier', () => {
    it('should create default TIER1 tier', () => {
      const tier = UserTier.createDefaultTier();

      expect(tier.level).toBe(TierLevel.TIER1);
      expect(tier.rateLimit.equals(RateLimit.TIER1_DEFAULT())).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const tier = UserTier.createDefault(TierLevel.TIER1);

      expect(() => {
        (tier as any)._level = TierLevel.TIER2;
      }).toThrow();

      expect(() => {
        (tier as any)._rateLimit = RateLimit.TIER2_DEFAULT();
      }).toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle tier upgrade scenario', () => {
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);

      expect(tier2.isHigherThanOrEqualTo(tier1)).toBe(true);
      expect(tier1.isHigherThanOrEqualTo(tier2)).toBe(false);

      // Rate limit verification
      expect(tier1.rateLimit.maxRequests).toBe(60);
      expect(tier2.rateLimit.maxRequests).toBe(120);
    });

    it('should handle custom rate limit preservation through serialization', () => {
      const customRateLimit = RateLimit.fromValues(150, 45);
      const originalResult = UserTier.create(TierLevel.TIER2, customRateLimit);
      const original = originalResult.getValue();

      const json = original.toJSON();
      const restored = UserTier.fromJSON(json);

      expect(restored.equals(original)).toBe(true);
      expect(restored.rateLimit.maxRequests).toBe(150);
      expect(restored.rateLimit.windowSeconds).toBe(45);
    });
  });
});
