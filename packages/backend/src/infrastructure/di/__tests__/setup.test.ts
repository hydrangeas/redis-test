import { describe, it, expect, beforeEach, vi } from 'vitest';
import { container } from 'tsyringe';
import { DI_TOKENS } from '../tokens.js';
import { clearContainer, setupTestContainer } from '../test-container.js';

describe('DI Container Setup', () => {
  beforeEach(() => {
    clearContainer();
  });

  it('should setup test container with mock implementations', () => {
    setupTestContainer();

    // Check that mocks are registered
    const logger = container.resolve(DI_TOKENS.Logger);
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(vi.isMockFunction(logger.info)).toBe(true);

    const supabaseClient = container.resolve(DI_TOKENS.SupabaseClient);
    expect(supabaseClient).toBeDefined();
    expect(supabaseClient.auth).toBeDefined();
    expect(vi.isMockFunction(supabaseClient.auth.getUser)).toBe(true);
  });

  it('should register configuration in test container', () => {
    setupTestContainer();

    const appConfig = container.resolve(DI_TOKENS.AppConfig);
    expect(appConfig).toEqual({
      environment: 'test',
      dataPath: './test-data',
    });

    const dbConfig = container.resolve(DI_TOKENS.DatabaseConfig);
    expect(dbConfig).toEqual({
      url: 'http://localhost:54321',
      anonKey: 'test-anon-key',
      serviceKey: 'test-service-key',
    });

    const authConfig = container.resolve(DI_TOKENS.AuthConfig);
    expect(authConfig).toEqual({
      jwtSecret: 'test-jwt-secret',
    });
  });

  it('should clear container', () => {
    setupTestContainer();
    const logger = container.resolve(DI_TOKENS.Logger);
    expect(logger).toBeDefined();

    clearContainer();
    
    // After clearing, resolving should throw
    expect(() => container.resolve(DI_TOKENS.Logger)).toThrow();
  });
});