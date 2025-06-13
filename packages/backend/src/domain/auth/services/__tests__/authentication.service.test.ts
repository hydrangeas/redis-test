import { describe, it, expect, beforeEach } from 'vitest';
import { AuthenticationService } from '../authentication.service';
import { TokenPayload } from '../../types/token-payload';
import { TierLevel } from '../../value-objects/tier-level';

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(() => {
    service = new AuthenticationService();
  });

  const createValidPayload = (overrides?: Partial<TokenPayload>): TokenPayload => ({
    sub: '550e8400-e29b-41d4-a716-446655440000',
    app_metadata: {
      tier: 'tier2',
    },
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1時間後
    iat: Math.floor(Date.now() / 1000),
    iss: 'https://your-project.supabase.co/auth/v1',
    ...overrides,
  });

  describe('validateAccessToken', () => {
    it('should return authenticated user for valid token', async () => {
      const payload = createValidPayload();
      const result = await service.validateAccessToken(payload);

      expect(result.isSuccess).toBe(true);
      const user = result.getValue();
      expect(user.userId.value).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(user.tier.level).toBe(TierLevel.TIER2);
    });

    it('should fail for expired token', async () => {
      const payload = createValidPayload({
        exp: Math.floor(Date.now() / 1000) - 3600, // 1時間前
      });
      const result = await service.validateAccessToken(payload);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('TOKEN_EXPIRED');
    });

    it('should fail for null payload', async () => {
      const result = await service.validateAccessToken(null);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_TOKEN');
    });

    it('should fail for invalid user ID in token', async () => {
      const payload = createValidPayload({
        sub: 'invalid-uuid',
      });
      const result = await service.validateAccessToken(payload);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('TOKEN_EXTRACTION_FAILED');
    });
  });

  describe('extractUserFromToken', () => {
    it('should default to TIER1 for missing tier', () => {
      const payload = createValidPayload({
        app_metadata: {},
      });
      
      const user = service.extractUserFromToken(payload);
      expect(user.tier.level).toBe(TierLevel.TIER1);
    });

    it('should handle various tier formats', () => {
      const testCases = [
        { input: 'tier1', expected: TierLevel.TIER1 },
        { input: 'TIER2', expected: TierLevel.TIER2 },
        { input: 'Tier3', expected: TierLevel.TIER3 },
        { input: 'unknown', expected: TierLevel.TIER1 },
      ];

      testCases.forEach(({ input, expected }) => {
        const payload = createValidPayload({
          app_metadata: { tier: input },
        });
        const user = service.extractUserFromToken(payload);
        expect(user.tier.level).toBe(expected);
      });
    });

    it('should throw for invalid user ID', () => {
      const payload = createValidPayload({
        sub: 'not-a-uuid',
      });

      expect(() => service.extractUserFromToken(payload))
        .toThrow('Invalid user ID in token');
    });
  });

  describe('token expiration', () => {
    it('should detect expired token with past timestamp', async () => {
      const payload = createValidPayload({
        exp: Math.floor(Date.now() / 1000) - 1, // 1秒前
      });
      const result = await service.validateAccessToken(payload);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('TOKEN_EXPIRED');
      expect(result.getError().details?.expiredAt).toBeDefined();
    });

    it('should accept token expiring in future', async () => {
      const payload = createValidPayload({
        exp: Math.floor(Date.now() / 1000) + 60, // 60秒後
      });
      const result = await service.validateAccessToken(payload);

      expect(result.isSuccess).toBe(true);
    });

    it('should treat missing exp as expired', async () => {
      const payload = createValidPayload();
      // @ts-ignore - intentionally removing required field for test
      delete payload.exp;

      const result = await service.validateAccessToken(payload);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('edge cases', () => {
    it('should handle app_metadata with non-string tier', () => {
      const payload = createValidPayload({
        app_metadata: {
          tier: 2 as any, // 数値を渡す
        },
      });

      const user = service.extractUserFromToken(payload);
      expect(user.tier.level).toBe(TierLevel.TIER1); // 数値はデフォルトにフォールバック
    });

    it('should handle completely missing app_metadata', () => {
      const payload = createValidPayload();
      // @ts-ignore - intentionally removing required field for test
      delete payload.app_metadata;

      const user = service.extractUserFromToken(payload);
      expect(user.tier.level).toBe(TierLevel.TIER1);
    });
  });
});