import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { Logger } from 'pino';
import { setupTestDI } from '../container';
import { DI_TOKENS } from '../tokens';
import type { EnvConfig } from '../../config';

describe('DI Container', () => {
  beforeEach(() => {
    container.reset();
  });

  describe('setupTestDI', () => {
    it('should register test environment configuration', () => {
      setupTestDI();
      
      const config = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);
      
      expect(config).toBeDefined();
      expect(config.NODE_ENV).toBe('development');
      expect(config.LOG_LEVEL).toBe('error');
      expect(config.SUPABASE_URL).toBe('http://localhost:54321');
    });

    it('should register error-level logger for tests', () => {
      setupTestDI();
      
      const logger = container.resolve<Logger>(DI_TOKENS.Logger);
      
      expect(logger).toBeDefined();
      expect(logger.level).toBe('error');
    });

    it('should register test data directory', () => {
      setupTestDI();
      
      const dataDir = container.resolve<string>(DI_TOKENS.DataDirectory);
      
      expect(dataDir).toBeDefined();
      expect(dataDir).toContain('test-data');
    });

    it('should reset container before setup', () => {
      // First setup
      setupTestDI();
      const config1 = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);
      
      // Second setup should reset and create new instances
      setupTestDI();
      const config2 = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);
      
      // Should be different instances due to reset
      expect(config1).not.toBe(config2);
      expect(config2.NODE_ENV).toBe('development');
    });
  });

  describe('Token registration', () => {
    it('should have all required tokens defined', () => {
      expect(DI_TOKENS.Logger).toBeDefined();
      expect(DI_TOKENS.EventBus).toBeDefined();
      expect(DI_TOKENS.EnvConfig).toBeDefined();
      expect(DI_TOKENS.DataDirectory).toBeDefined();
      expect(DI_TOKENS.SupabaseClient).toBeDefined();
      expect(DI_TOKENS.UserRepository).toBeDefined();
      expect(DI_TOKENS.RateLimitRepository).toBeDefined();
      expect(DI_TOKENS.AuthenticationService).toBeDefined();
      expect(DI_TOKENS.RateLimitService).toBeDefined();
      expect(DI_TOKENS.AuthenticationUseCase).toBeDefined();
      expect(DI_TOKENS.DataRetrievalUseCase).toBeDefined();
      expect(DI_TOKENS.JwtService).toBeDefined();
      expect(DI_TOKENS.FileStorageService).toBeDefined();
    });

    it('should use Symbol.for for global registration', () => {
      // Symbols created with Symbol.for are global
      const loggerSymbol = Symbol.for('Logger');
      expect(DI_TOKENS.Logger).toBe(loggerSymbol);
    });
  });
});