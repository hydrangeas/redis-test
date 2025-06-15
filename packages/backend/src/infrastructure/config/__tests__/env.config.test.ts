import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv, EnvValidationError, resetEnvConfig, getEnvConfig } from '../env.config';

describe('Environment Configuration', () => {
  // Save original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env for each test
    process.env = { ...originalEnv };
    resetEnvConfig();
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
    resetEnvConfig();
  });

  describe('validateEnv', () => {
    it('should validate valid environment variables', () => {
      const validEnv = {
        NODE_ENV: 'development',
        PORT: '8080',
        HOST: '0.0.0.0',
        LOG_LEVEL: 'info',
        PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
        API_BASE_URL: 'http://localhost:8080',
        FRONTEND_URL: 'http://localhost:3000',
        RATE_LIMIT_TIER1: '60',
        RATE_LIMIT_TIER2: '120',
        RATE_LIMIT_TIER3: '300',
        RATE_LIMIT_WINDOW: '60',
        DATA_DIRECTORY: './data',
      };

      const config = validateEnv(validEnv);

      expect(config.NODE_ENV).toBe('development');
      expect(config.PORT).toBe(8080);
      expect(config.HOST).toBe('0.0.0.0');
      expect(config.LOG_LEVEL).toBe('info');
      expect(config.PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
      expect(config.JWT_SECRET).toBe('a-very-long-secret-key-that-is-at-least-32-chars');
      expect(config.RATE_LIMIT_TIER1).toBe(60);
    });

    it('should use default values when optional fields are missing', () => {
      const minimalEnv = {
        PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
      };

      const config = validateEnv(minimalEnv);

      expect(config.NODE_ENV).toBe('development');
      expect(config.PORT).toBe(8080);
      expect(config.HOST).toBe('0.0.0.0');
      expect(config.LOG_LEVEL).toBe('info');
      expect(config.API_BASE_URL).toBe('http://localhost:8080');
      expect(config.FRONTEND_URL).toBe('http://localhost:3000');
      expect(config.RATE_LIMIT_TIER1).toBe(60);
      expect(config.RATE_LIMIT_TIER2).toBe(120);
      expect(config.RATE_LIMIT_TIER3).toBe(300);
      expect(config.RATE_LIMIT_WINDOW).toBe(60);
      expect(config.DATA_DIRECTORY).toBe('./data');
    });

    it('should handle backward compatibility for SUPABASE_URL', () => {
      const envWithOldNames = {
        NODE_ENV: 'development',
        SUPABASE_URL: 'https://old.supabase.co',
        SUPABASE_ANON_KEY: 'old-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
      };

      // Set env before calling getEnvConfig
      process.env = envWithOldNames;
      resetEnvConfig();
      
      const config = getEnvConfig();
      
      // The backward compatibility mapping should work
      expect(config.PUBLIC_SUPABASE_URL).toBe('https://old.supabase.co');
      expect(config.PUBLIC_SUPABASE_ANON_KEY).toBe('old-anon-key');
    });

    it('should throw EnvValidationError for missing required fields', () => {
      const invalidEnv = {
        NODE_ENV: 'development',
      };

      expect(() => validateEnv(invalidEnv)).toThrow(EnvValidationError);
    });

    it('should validate NODE_ENV enum values', () => {
      const validEnvs = ['development', 'staging', 'production'];
      
      validEnvs.forEach(env => {
        const config = validateEnv({
          NODE_ENV: env,
          PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
          PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
          JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
        });
        expect(config.NODE_ENV).toBe(env);
      });

      expect(() => validateEnv({
        NODE_ENV: 'invalid',
        PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
      })).toThrow();
    });

    it('should validate URL formats', () => {
      const envWithInvalidUrl = {
        PUBLIC_SUPABASE_URL: 'not-a-url',
        PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
      };

      expect(() => validateEnv(envWithInvalidUrl)).toThrow(EnvValidationError);
    });

    it('should validate JWT secret length', () => {
      const envWithShortSecret = {
        PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'too-short',
      };

      expect(() => validateEnv(envWithShortSecret)).toThrow(EnvValidationError);
    });

    it('should validate numeric values', () => {
      const envWithInvalidNumbers = {
        PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
        PORT: 'not-a-number',
      };

      expect(() => validateEnv(envWithInvalidNumbers)).toThrow(EnvValidationError);
    });

    it('should validate positive numbers for rate limits', () => {
      const envWithNegativeRateLimit = {
        PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
        RATE_LIMIT_TIER1: '-1',
      };

      expect(() => validateEnv(envWithNegativeRateLimit)).toThrow(EnvValidationError);
    });

    it('should validate LOG_LEVEL enum values', () => {
      const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
      
      validLevels.forEach(level => {
        const config = validateEnv({
          LOG_LEVEL: level,
          PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
          PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
          JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
        });
        expect(config.LOG_LEVEL).toBe(level);
      });

      expect(() => validateEnv({
        LOG_LEVEL: 'invalid',
        PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
      })).toThrow();
    });
  });

  describe('getEnvConfig', () => {
    it('should return singleton instance', () => {
      process.env = {
        PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
      };

      const config1 = getEnvConfig();
      const config2 = getEnvConfig();

      expect(config1).toBe(config2);
    });

    it('should handle backward compatibility mapping', () => {
      process.env = {
        NODE_ENV: 'development',
        SUPABASE_URL: 'https://old.supabase.co',
        SUPABASE_ANON_KEY: 'old-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
      };

      const config = getEnvConfig();

      expect(config.PUBLIC_SUPABASE_URL).toBe('https://old.supabase.co');
      expect(config.PUBLIC_SUPABASE_ANON_KEY).toBe('old-anon-key');
    });
  });

  describe('resetEnvConfig', () => {
    it('should reset singleton instance', () => {
      process.env = {
        PUBLIC_SUPABASE_URL: 'https://test1.supabase.co',
        PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'a-very-long-secret-key-that-is-at-least-32-chars',
      };

      const config1 = getEnvConfig();
      expect(config1.PUBLIC_SUPABASE_URL).toBe('https://test1.supabase.co');

      // Change env and reset
      process.env.PUBLIC_SUPABASE_URL = 'https://test2.supabase.co';
      resetEnvConfig();

      const config2 = getEnvConfig();
      expect(config2.PUBLIC_SUPABASE_URL).toBe('https://test2.supabase.co');
      expect(config1).not.toBe(config2);
    });
  });
});