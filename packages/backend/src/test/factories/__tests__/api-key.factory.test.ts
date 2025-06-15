import { describe, it, expect } from 'vitest';
import { ApiKeyFactory } from '../api-key.factory';

describe('ApiKeyFactory', () => {
  describe('generateRawKey', () => {
    it('should generate a key with correct prefix', () => {
      const key = ApiKeyFactory.generateRawKey();

      expect(key).toMatch(/^nara_[a-zA-Z0-9]{32}$/);
      expect(key).toHaveLength(37); // 'nara_' (5) + 32 chars
    });

    it('should generate unique keys', () => {
      const keys = new Set(Array.from({ length: 100 }, () => ApiKeyFactory.generateRawKey()));
      expect(keys.size).toBe(100);
    });
  });

  describe('hashKey', () => {
    it('should hash keys consistently', () => {
      const key = 'nara_test123';
      const hash1 = ApiKeyFactory.hashKey(key);
      const hash2 = ApiKeyFactory.hashKey(key);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex string
    });

    it('should produce different hashes for different keys', () => {
      const hash1 = ApiKeyFactory.hashKey('nara_test123');
      const hash2 = ApiKeyFactory.hashKey('nara_test456');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('create', () => {
    const userId = 'test-user-id';

    it('should create an API key with raw key', () => {
      const apiKey = ApiKeyFactory.create(userId);

      expect(apiKey.user_id).toBe(userId);
      expect(apiKey.key_prefix).toHaveLength(8);
      expect(apiKey.key_hash).toHaveLength(64);
      expect(apiKey.raw_key).toMatch(/^nara_[a-zA-Z0-9]{32}$/);
      expect(apiKey.key_prefix).toBe(apiKey.raw_key?.substring(0, 8));
    });

    it('should hash the raw key correctly', () => {
      const apiKey = ApiKeyFactory.create(userId);
      const expectedHash = ApiKeyFactory.hashKey(apiKey.raw_key!);

      expect(apiKey.key_hash).toBe(expectedHash);
    });
  });

  describe('createMany', () => {
    it('should create multiple API keys', () => {
      const userId = 'test-user-id';
      const keys = ApiKeyFactory.createMany(userId, 3);

      expect(keys).toHaveLength(3);
      keys.forEach(key => {
        expect(key.user_id).toBe(userId);
        expect(key.raw_key).toBeDefined();
      });

      // 各キーが異なることを確認
      const rawKeys = new Set(keys.map(k => k.raw_key));
      expect(rawKeys.size).toBe(3);
    });
  });

  describe('specialized creators', () => {
    const userId = 'test-user-id';

    it('should create expired key', () => {
      const apiKey = ApiKeyFactory.createExpired(userId);

      expect(apiKey.last_used_at).toBeInstanceOf(Date);
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      // past({ years: 2 }) means "within the past 2 years", not "2 years ago"
      expect(apiKey.last_used_at!.getTime()).toBeLessThan(now.getTime());
      expect(apiKey.last_used_at!.getTime()).toBeGreaterThan(oneYearAgo.getFullYear() - 2);
    });

    it('should create never used key', () => {
      const apiKey = ApiKeyFactory.createNeverUsed(userId);

      expect(apiKey.last_used_at).toBeNull();
    });
  });
});