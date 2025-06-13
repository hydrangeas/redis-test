import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv, resetEnvConfig, EnvValidationError } from './env.config';

describe('EnvConfig', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    // 環境変数をリセット
    process.env = {};
    resetEnvConfig();
  });
  
  afterEach(() => {
    // 元の環境変数を復元
    process.env = originalEnv;
    resetEnvConfig();
  });
  
  describe('validateEnv', () => {
    it('should validate valid environment variables', () => {
      const env = {
        NODE_ENV: 'development',
        PORT: '3000',
        HOST: 'localhost',
        LOG_LEVEL: 'info',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        JWT_SECRET: 'a-very-secret-key-that-is-at-least-32-characters',
        API_BASE_URL: 'http://localhost:3000',
        FRONTEND_URL: 'http://localhost:8080',
        RATE_LIMIT_TIER1: '60',
        RATE_LIMIT_TIER2: '120',
        RATE_LIMIT_TIER3: '300',
        RATE_LIMIT_WINDOW: '60',
      };
      
      const config = validateEnv(env);
      
      expect(config.NODE_ENV).toBe('development');
      expect(config.PORT).toBe(3000);
      expect(config.SUPABASE_URL).toBe('https://example.supabase.co');
      expect(config.RATE_LIMIT_TIER1).toBe(60);
    });
    
    it('should use default values for optional fields', () => {
      const env = {
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        JWT_SECRET: 'a-very-secret-key-that-is-at-least-32-characters',
      };
      
      const config = validateEnv(env);
      
      expect(config.NODE_ENV).toBe('development');
      expect(config.PORT).toBe(8080);
      expect(config.HOST).toBe('0.0.0.0');
      expect(config.LOG_LEVEL).toBe('info');
      expect(config.RATE_LIMIT_TIER1).toBe(60);
    });
    
    it('should throw EnvValidationError for missing required fields', () => {
      const env = {
        NODE_ENV: 'development',
      };
      
      expect(() => validateEnv(env)).toThrow(EnvValidationError);
    });
    
    it('should validate URL format', () => {
      const env = {
        SUPABASE_URL: 'not-a-url',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        JWT_SECRET: 'a-very-secret-key-that-is-at-least-32-characters',
      };
      
      expect(() => validateEnv(env)).toThrow(EnvValidationError);
    });
    
    it('should validate JWT secret length', () => {
      const env = {
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        JWT_SECRET: 'too-short',
      };
      
      expect(() => validateEnv(env)).toThrow(EnvValidationError);
    });
    
    it('should validate NODE_ENV values', () => {
      const env = {
        NODE_ENV: 'invalid',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        JWT_SECRET: 'a-very-secret-key-that-is-at-least-32-characters',
      };
      
      expect(() => validateEnv(env)).toThrow(EnvValidationError);
    });
    
    it('should validate LOG_LEVEL values', () => {
      const env = {
        LOG_LEVEL: 'invalid',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        JWT_SECRET: 'a-very-secret-key-that-is-at-least-32-characters',
      };
      
      expect(() => validateEnv(env)).toThrow(EnvValidationError);
    });
    
    it('should convert string numbers to numbers', () => {
      const env = {
        PORT: '3000',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        JWT_SECRET: 'a-very-secret-key-that-is-at-least-32-characters',
        RATE_LIMIT_TIER1: '100',
      };
      
      const config = validateEnv(env);
      
      expect(config.PORT).toBe(3000);
      expect(config.RATE_LIMIT_TIER1).toBe(100);
      expect(typeof config.PORT).toBe('number');
      expect(typeof config.RATE_LIMIT_TIER1).toBe('number');
    });
  });
});