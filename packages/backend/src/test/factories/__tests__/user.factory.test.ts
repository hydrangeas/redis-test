import { describe, it, expect } from 'vitest';
import { UserFactory } from '../user.factory';

describe('UserFactory', () => {
  describe('create', () => {
    it('should create a user with default values', () => {
      const user = UserFactory.create();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user.aud).toBe('authenticated');
      expect(user.role).toBe('authenticated');
      expect(user.app_metadata.tier).toMatch(/^tier[1-3]$/);
      expect(user.user_metadata).toHaveProperty('name');
    });

    it('should override values when provided', () => {
      const overrides = {
        email: 'custom@example.com',
        app_metadata: {
          provider: 'email',
          providers: ['email'],
          tier: 'tier2',
        },
      };

      const user = UserFactory.create(overrides);

      expect(user.email).toBe('custom@example.com');
      expect(user.app_metadata.tier).toBe('tier2');
    });
  });

  describe('createMany', () => {
    it('should create multiple users', () => {
      const users = UserFactory.createMany(5);

      expect(users).toHaveLength(5);
      users.forEach(user => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
      });

      // 各ユーザーが異なるIDを持つことを確認
      const ids = new Set(users.map(u => u.id));
      expect(ids.size).toBe(5);
    });
  });

  describe('tier-specific creators', () => {
    it('should create tier1 user', () => {
      const user = UserFactory.createTier1User();

      expect(user.email).toBe('tier1@example.com');
      expect(user.app_metadata.tier).toBe('tier1');
      expect(user.user_metadata.name).toBe('Tier1 Test User');
    });

    it('should create tier2 user', () => {
      const user = UserFactory.createTier2User();

      expect(user.email).toBe('tier2@example.com');
      expect(user.app_metadata.tier).toBe('tier2');
      expect(user.user_metadata.name).toBe('Tier2 Test User');
    });

    it('should create tier3 user', () => {
      const user = UserFactory.createTier3User();

      expect(user.email).toBe('tier3@example.com');
      expect(user.app_metadata.tier).toBe('tier3');
      expect(user.user_metadata.name).toBe('Tier3 Test User');
    });
  });
});