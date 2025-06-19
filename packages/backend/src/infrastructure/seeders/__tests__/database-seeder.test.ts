import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseSeeder } from '../database-seeder';
import { Logger } from 'pino';
import { SupabaseClient } from '@supabase/supabase-js';

describe('DatabaseSeeder', () => {
  let seeder: DatabaseSeeder;
  let mockSupabase: any;
  let mockLogger: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: 'user1', email: 'tier1@example.com' },
                { id: 'user2', email: 'tier2@example.com' },
              ],
            },
            error: null,
          }),
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-user' } },
            error: null,
          }),
          deleteUser: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        },
      },
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    seeder = new DatabaseSeeder(
      mockSupabase as unknown as SupabaseClient,
      mockLogger as unknown as Logger,
    );
  });

  describe('seed', () => {
    it('should execute all seeding steps in order', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const cleanupSpy = vi.spyOn(seeder as any, 'cleanup');
      const seedUsersSpy = vi.spyOn(seeder as any, 'seedUsers');
      const seedApiKeysSpy = vi.spyOn(seeder as any, 'seedApiKeys');
      const seedRateLimitLogsSpy = vi.spyOn(seeder as any, 'seedRateLimitLogs');
      const seedAuthLogsSpy = vi.spyOn(seeder as any, 'seedAuthLogs');
      const seedApiLogsSpy = vi.spyOn(seeder as any, 'seedApiLogs');

      await seeder.seed();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(seedUsersSpy).toHaveBeenCalled();
      expect(seedApiKeysSpy).toHaveBeenCalled();
      expect(seedRateLimitLogsSpy).toHaveBeenCalled();
      expect(seedAuthLogsSpy).toHaveBeenCalled();
      expect(seedApiLogsSpy).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Database seeding completed successfully');

      process.env.NODE_ENV = originalEnv;
    });

    it('should skip cleanup in non-development environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const cleanupSpy = vi.spyOn(seeder as any, 'cleanup');
      await seeder.seed();

      expect(cleanupSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors and rethrow', async () => {
      const error = new Error('Seeding failed');
      vi.spyOn(seeder as any, 'seedUsers').mockRejectedValue(error);

      await expect(seeder.seed()).rejects.toThrow('Seeding failed');
      expect(mockLogger.error).toHaveBeenCalledWith({ error }, 'Database seeding failed');
    });
  });

  describe('cleanup', () => {
    it('should clean up tables in correct order', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({ error: null }),
      });

      await (seeder as any).cleanup();

      const tables = ['api_logs', 'auth_logs', 'rate_limit_logs'];
      tables.forEach((table) => {
        expect(mockSupabase.from).toHaveBeenCalledWith(table);
      });
    });

    it('should delete test users', async () => {
      await (seeder as any).cleanup();

      expect(mockSupabase.auth.admin.listUsers).toHaveBeenCalled();
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('user1');
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('user2');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({ error: new Error('Cleanup failed') }),
      });

      await (seeder as any).cleanup();

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('seedUsers', () => {
    it('should create test users with correct tiers', async () => {
      await (seeder as any).seedUsers();

      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'tier1@example.com',
          password: 'password123',
          app_metadata: { tier: 'tier1' },
        }),
      );

      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'tier2@example.com',
          password: 'password123',
          app_metadata: { tier: 'tier2' },
        }),
      );

      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'tier3@example.com',
          password: 'password123',
          app_metadata: { tier: 'tier3' },
        }),
      );
    });

    it('should handle existing users gracefully', async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'User already been registered' },
      });

      await (seeder as any).seedUsers();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'tier1@example.com' }),
        'User already exists, skipping',
      );
    });
  });

  describe('seedApiKeys', () => {
    it('should create API keys for test users', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      await (seeder as any).seedApiKeys();

      expect(mockSupabase.from).toHaveBeenCalledWith('api_keys');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user1',
          key_prefix: expect.stringMatching(/^nara_/),
        }),
      );
    });

    it('should skip users with existing API keys', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'existing-key' }], error: null }),
        insert: vi.fn(),
      });

      await (seeder as any).seedApiKeys();

      expect(mockSupabase.insert).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user1' }),
        'API key already exists',
      );
    });
  });

  describe('helper methods', () => {
    it('should generate API keys with correct prefix', () => {
      const key = (seeder as any).generateApiKey();
      expect(key).toMatch(/^nara_[a-zA-Z0-9]{32}$/);
    });

    it('should hash API keys', async () => {
      const key = 'test-key';
      const hash = await (seeder as any).hashApiKey(key);
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA256 hex length
    });

    it('should return correct error messages', () => {
      expect((seeder as any).getErrorMessage(404)).toBe('Resource not found');
      expect((seeder as any).getErrorMessage(429)).toBe('Rate limit exceeded');
      expect((seeder as any).getErrorMessage(500)).toBe('Internal server error');
      expect((seeder as any).getErrorMessage(999)).toBe('Unknown error');
    });
  });
});
