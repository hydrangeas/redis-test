import { describe, it, expect } from 'vitest';
import { AuthenticatedUser } from '../authenticated-user';
import { UserId } from '../user-id';
import { UserTier } from '../user-tier';
import { TierLevel } from '../tier-level';
import { ValidationError } from '../../../errors/validation-error';

describe('AuthenticatedUser', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('constructor', () => {
    it('should create authenticated user', () => {
      const userId = new UserId(validUuid);
      const tier = new UserTier(TierLevel.TIER2);
      const user = new AuthenticatedUser(userId, tier);

      expect(user.userId).toBe(userId);
      expect(user.tier).toBe(tier);
      expect(Object.isFrozen(user)).toBe(true);
    });

    it('should throw error if userId is missing', () => {
      const tier = new UserTier(TierLevel.TIER1);
      expect(() => new AuthenticatedUser(null as any, tier)).toThrow(ValidationError);
      expect(() => new AuthenticatedUser(null as any, tier)).toThrow('UserId is required');
    });

    it('should throw error if tier is missing', () => {
      const userId = new UserId(validUuid);
      expect(() => new AuthenticatedUser(userId, null as any)).toThrow(ValidationError);
      expect(() => new AuthenticatedUser(userId, null as any)).toThrow('UserTier is required');
    });
  });

  describe('canAccessEndpoint', () => {
    it('should allow access to lower or equal tier endpoints', () => {
      const userId = new UserId(validUuid);
      const tier = new UserTier(TierLevel.TIER2);
      const user = new AuthenticatedUser(userId, tier);

      expect(user.canAccessEndpoint(TierLevel.TIER1)).toBe(true);
      expect(user.canAccessEndpoint(TierLevel.TIER2)).toBe(true);
      expect(user.canAccessEndpoint(TierLevel.TIER3)).toBe(false);
    });

    it('should work for TIER1 users', () => {
      const userId = new UserId(validUuid);
      const tier = new UserTier(TierLevel.TIER1);
      const user = new AuthenticatedUser(userId, tier);

      expect(user.canAccessEndpoint(TierLevel.TIER1)).toBe(true);
      expect(user.canAccessEndpoint(TierLevel.TIER2)).toBe(false);
      expect(user.canAccessEndpoint(TierLevel.TIER3)).toBe(false);
    });

    it('should work for TIER3 users', () => {
      const userId = new UserId(validUuid);
      const tier = new UserTier(TierLevel.TIER3);
      const user = new AuthenticatedUser(userId, tier);

      expect(user.canAccessEndpoint(TierLevel.TIER1)).toBe(true);
      expect(user.canAccessEndpoint(TierLevel.TIER2)).toBe(true);
      expect(user.canAccessEndpoint(TierLevel.TIER3)).toBe(true);
    });
  });

  describe('getRateLimit', () => {
    it('should return tier rate limit', () => {
      const userId = new UserId(validUuid);
      const tier = new UserTier(TierLevel.TIER2);
      const user = new AuthenticatedUser(userId, tier);

      const rateLimit = user.getRateLimit();
      expect(rateLimit.maxRequests).toBe(120);
      expect(rateLimit.windowSeconds).toBe(60);
    });
  });

  describe('fromTokenPayload', () => {
    it('should create user from JWT payload', () => {
      const user = AuthenticatedUser.fromTokenPayload(validUuid, 'tier2');

      expect(user.userId.value).toBe(validUuid);
      expect(user.tier.level).toBe(TierLevel.TIER2);
    });

    it('should handle lowercase tier', () => {
      const user = AuthenticatedUser.fromTokenPayload(validUuid, 'tier3');

      expect(user.tier.level).toBe(TierLevel.TIER3);
    });

    it('should handle uppercase tier', () => {
      const user = AuthenticatedUser.fromTokenPayload(validUuid, 'TIER1');

      expect(user.tier.level).toBe(TierLevel.TIER1);
    });

    it('should default to TIER1 for unknown tier', () => {
      const user = AuthenticatedUser.fromTokenPayload(validUuid, 'unknown');

      expect(user.tier.level).toBe(TierLevel.TIER1);
    });

    it('should default to TIER1 for empty tier', () => {
      const user = AuthenticatedUser.fromTokenPayload(validUuid, '');

      expect(user.tier.level).toBe(TierLevel.TIER1);
    });
  });

  describe('equals', () => {
    it('should return true for same user and tier', () => {
      const userId = new UserId(validUuid);
      const tier = new UserTier(TierLevel.TIER1);

      const user1 = new AuthenticatedUser(userId, tier);
      const user2 = new AuthenticatedUser(userId, tier);

      expect(user1.equals(user2)).toBe(true);
    });

    it('should return false for different userId', () => {
      const userId1 = new UserId(validUuid);
      const userId2 = new UserId('650e8400-e29b-41d4-a716-446655440000');
      const tier = new UserTier(TierLevel.TIER1);

      const user1 = new AuthenticatedUser(userId1, tier);
      const user2 = new AuthenticatedUser(userId2, tier);

      expect(user1.equals(user2)).toBe(false);
    });

    it('should return false for different tier', () => {
      const userId = new UserId(validUuid);
      const tier1 = new UserTier(TierLevel.TIER1);
      const tier2 = new UserTier(TierLevel.TIER2);

      const user1 = new AuthenticatedUser(userId, tier1);
      const user2 = new AuthenticatedUser(userId, tier2);

      expect(user1.equals(user2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const userId = new UserId(validUuid);
      const tier = new UserTier(TierLevel.TIER2);
      const user = new AuthenticatedUser(userId, tier);

      expect(user.toString()).toBe(
        `AuthenticatedUser(${validUuid}, TIER2 (120 requests per minute))`,
      );
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const userId = new UserId(validUuid);
      const tier = new UserTier(TierLevel.TIER2);
      const user = new AuthenticatedUser(userId, tier);

      const json = user.toJSON();
      expect(json).toEqual({
        userId: validUuid,
        tier: {
          level: 'TIER2',
          rateLimit: {
            maxRequests: 120,
            windowSeconds: 60,
          },
        },
      });
    });

    it('should deserialize from JSON', () => {
      const json = {
        userId: validUuid,
        tier: {
          level: 'TIER3',
          rateLimit: {
            maxRequests: 300,
            windowSeconds: 60,
          },
        },
      };

      const user = AuthenticatedUser.fromJSON(json);
      expect(user.userId.value).toBe(validUuid);
      expect(user.tier.level).toBe(TierLevel.TIER3);
      expect(user.getRateLimit().maxRequests).toBe(300);
    });

    it('should round trip correctly', () => {
      const original = new AuthenticatedUser(
        new UserId(validUuid),
        new UserTier(TierLevel.TIER1),
      );

      const json = original.toJSON();
      const restored = AuthenticatedUser.fromJSON(json);

      expect(restored.equals(original)).toBe(true);
    });
  });
});