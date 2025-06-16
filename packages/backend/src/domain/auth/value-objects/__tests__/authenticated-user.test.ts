import { describe, it, expect } from 'vitest';
import { AuthenticatedUser } from '../authenticated-user';
import { UserId } from '../user-id';
import { UserTier } from '../user-tier';
import { TierLevel } from '../tier-level';

describe('AuthenticatedUser', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('constructor', () => {
    it('should create authenticated user', () => {
      const userIdResult = UserId.create(validUuid);
      const tier = UserTier.createDefault(TierLevel.TIER2);
      const user = new AuthenticatedUser(userIdResult.getValue(), tier);

      expect(user.userId).toBe(userIdResult.getValue());
      expect(user.tier).toBe(tier);
      expect(Object.isFrozen(user)).toBe(true);
    });

    it('should throw error if userId is missing', () => {
      const tier = UserTier.createDefault(TierLevel.TIER1);
      expect(() => new AuthenticatedUser(null as any, tier)).toThrow('UserId is required');
    });

    it('should throw error if tier is missing', () => {
      const userIdResult = UserId.create(validUuid);
      expect(() => new AuthenticatedUser(userIdResult.getValue(), null as any)).toThrow(
        'UserTier is required',
      );
    });
  });

  describe('canAccessEndpoint', () => {
    it('should allow access to lower or equal tier endpoints', () => {
      const userIdResult = UserId.create(validUuid);
      const tier = UserTier.createDefault(TierLevel.TIER2);
      const user = new AuthenticatedUser(userIdResult.getValue(), tier);

      expect(user.canAccessEndpoint(TierLevel.TIER1)).toBe(true);
      expect(user.canAccessEndpoint(TierLevel.TIER2)).toBe(true);
      expect(user.canAccessEndpoint(TierLevel.TIER3)).toBe(false);
    });

    it('should work for TIER1 users', () => {
      const userIdResult = UserId.create(validUuid);
      const tier = UserTier.createDefault(TierLevel.TIER1);
      const user = new AuthenticatedUser(userIdResult.getValue(), tier);

      expect(user.canAccessEndpoint(TierLevel.TIER1)).toBe(true);
      expect(user.canAccessEndpoint(TierLevel.TIER2)).toBe(false);
      expect(user.canAccessEndpoint(TierLevel.TIER3)).toBe(false);
    });

    it('should work for TIER3 users', () => {
      const userIdResult = UserId.create(validUuid);
      const tier = UserTier.createDefault(TierLevel.TIER3);
      const user = new AuthenticatedUser(userIdResult.getValue(), tier);

      expect(user.canAccessEndpoint(TierLevel.TIER1)).toBe(true);
      expect(user.canAccessEndpoint(TierLevel.TIER2)).toBe(true);
      expect(user.canAccessEndpoint(TierLevel.TIER3)).toBe(true);
    });
  });

  describe('getRateLimit', () => {
    it('should return tier rate limit', () => {
      const userIdResult = UserId.create(validUuid);
      const tier = UserTier.createDefault(TierLevel.TIER2);
      const user = new AuthenticatedUser(userIdResult.getValue(), tier);

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
      const userIdResult = UserId.create(validUuid);
      const tier = UserTier.createDefault(TierLevel.TIER1);

      const user1 = new AuthenticatedUser(userIdResult.getValue(), tier);
      const user2 = new AuthenticatedUser(userIdResult.getValue(), tier);

      expect(user1.equals(user2)).toBe(true);
    });

    it('should return false for different userId', () => {
      const userId1Result = UserId.create(validUuid);
      const userId2Result = UserId.create('650e8400-e29b-41d4-a716-446655440000');
      const tier = UserTier.createDefault(TierLevel.TIER1);

      const user1 = new AuthenticatedUser(userId1Result.getValue(), tier);
      const user2 = new AuthenticatedUser(userId2Result.getValue(), tier);

      expect(user1.equals(user2)).toBe(false);
    });

    it('should return false for different tier', () => {
      const userIdResult = UserId.create(validUuid);
      const tier1 = UserTier.createDefault(TierLevel.TIER1);
      const tier2 = UserTier.createDefault(TierLevel.TIER2);

      const user1 = new AuthenticatedUser(userIdResult.getValue(), tier1);
      const user2 = new AuthenticatedUser(userIdResult.getValue(), tier2);

      expect(user1.equals(user2)).toBe(false);
    });

    it('should return false for null', () => {
      const userIdResult = UserId.create(validUuid);
      const tier = UserTier.createDefault(TierLevel.TIER1);
      const user = new AuthenticatedUser(userIdResult.getValue(), tier);

      expect(user.equals(null as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const userIdResult = UserId.create(validUuid);
      const tier = UserTier.createDefault(TierLevel.TIER2);
      const user = new AuthenticatedUser(userIdResult.getValue(), tier);

      expect(user.toString()).toBe(`AuthenticatedUser(${validUuid}, TIER2 (120 requests/minute))`);
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const userIdResult = UserId.create(validUuid);
      const tier = UserTier.createDefault(TierLevel.TIER2);
      const user = new AuthenticatedUser(userIdResult.getValue(), tier);

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
      const userIdResult = UserId.create(validUuid);
      const original = new AuthenticatedUser(
        userIdResult.getValue(),
        UserTier.createDefault(TierLevel.TIER1),
      );

      const json = original.toJSON();
      const restored = AuthenticatedUser.fromJSON(json);

      expect(restored.equals(original)).toBe(true);
    });

    it('should throw error for invalid userId in fromJSON', () => {
      const json = {
        userId: 'invalid-uuid',
        tier: {
          level: 'TIER1',
          rateLimit: {
            maxRequests: 60,
            windowSeconds: 60,
          },
        },
      };

      expect(() => AuthenticatedUser.fromJSON(json)).toThrow();
    });
  });
});
