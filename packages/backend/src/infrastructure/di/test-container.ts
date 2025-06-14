import 'reflect-metadata';
import { container } from 'tsyringe';
import { DI_TOKENS } from './tokens.js';
import type { Logger } from 'pino';

/**
 * Mock implementations for testing
 */
export const createMockLogger = (): Logger => {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn(() => createMockLogger()),
  } as any;
};

export const createMockSupabaseClient = () => {
  return {
    auth: {
      getUser: jest.fn(),
      admin: {
        getUserById: jest.fn(),
      },
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  };
};

export const createMockFileService = () => {
  return {
    readFile: jest.fn(),
    exists: jest.fn(),
    getFilePath: jest.fn(),
  };
};

export const createMockJwtService = () => {
  return {
    decode: jest.fn(),
    verify: jest.fn(),
  };
};

/**
 * Setup the test container with mock implementations
 */
export const setupTestContainer = (): void => {
  // Reset container before setup
  container.reset();

  // Configuration
  const testConfig = {
    app: {
      environment: 'test',
      dataPath: './test-data',
    },
    supabase: {
      url: 'http://localhost:54321',
      anonKey: 'test-anon-key',
      serviceKey: 'test-service-key',
    },
    auth: {
      jwtSecret: 'test-jwt-secret',
    },
  };

  container.register(DI_TOKENS.AppConfig, { useValue: testConfig.app });
  container.register(DI_TOKENS.DatabaseConfig, { useValue: testConfig.supabase });
  container.register(DI_TOKENS.AuthConfig, { useValue: testConfig.auth });

  // Mock services
  container.register(DI_TOKENS.Logger, { useValue: createMockLogger() });
  container.register(DI_TOKENS.SupabaseClient, { useValue: createMockSupabaseClient() });
  container.register(DI_TOKENS.FileService, { useValue: createMockFileService() });
  container.register(DI_TOKENS.JwtService, { useValue: createMockJwtService() });

  // You can add more mock implementations as needed
};

/**
 * Helper to register a mock for a specific token
 */
export const registerMock = <T>(token: symbol, mockImplementation: T): void => {
  container.register(token, { useValue: mockImplementation });
};

/**
 * Helper to clear all registrations
 */
export const clearContainer = (): void => {
  container.reset();
};