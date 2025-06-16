/**
 * Test container configuration for dependency injection
 * This module provides utilities for setting up test environments with mocked dependencies
 */

import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import { DI_TOKENS } from './tokens';
import { Logger } from 'pino';
import { createLogger } from '../logging';
import { EnvConfig } from '../config/env.config';
import path from 'path';
import { Result } from '@/domain/shared/result';
import { vi } from 'vitest';

/**
 * Default test environment configuration
 */
export const TEST_ENV_CONFIG: EnvConfig = {
  NODE_ENV: 'development' as const,
  PORT: 8080,
  HOST: '0.0.0.0',
  LOG_LEVEL: 'error' as const,
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  JWT_SECRET: 'test-secret-at-least-32-characters-long',
  API_BASE_URL: 'http://localhost:8080',
  FRONTEND_URL: 'http://localhost:3000',
  RATE_LIMIT_TIER1: 60,
  RATE_LIMIT_TIER2: 120,
  RATE_LIMIT_TIER3: 300,
  RATE_LIMIT_WINDOW: 60,
  DATA_DIRECTORY: './test-data',
  // Optional backward compatibility fields
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'test-anon-key',
};

/**
 * Test container factory with sensible defaults
 */
export class TestContainerFactory {
  /**
   * Create a new test container with all dependencies mocked
   */
  static create(overrides?: Partial<EnvConfig>): DependencyContainer {
    // Reset container to ensure clean state
    container.reset();

    // Register test environment config
    const envConfig = { ...TEST_ENV_CONFIG, ...overrides };
    container.register<EnvConfig>(DI_TOKENS.EnvConfig, {
      useValue: envConfig,
    });

    // Register test logger (silent by default)
    const testLogger = createLogger(envConfig);
    container.register<Logger>(DI_TOKENS.Logger, {
      useValue: testLogger,
    });

    // Register test data directory
    container.register<string>(DI_TOKENS.DataDirectory, {
      useValue: path.resolve(process.cwd(), envConfig.DATA_DIRECTORY),
    });

    // Register common mocks
    this.registerMockServices(container);
    this.registerMockRepositories(container);
    this.registerMockUseCases(container);

    return container;
  }

  /**
   * Register mock services
   */
  private static registerMockServices(container: DependencyContainer): void {
    // Mock JWT Service
    container.register(DI_TOKENS.JwtService, {
      useValue: {
        generateAccessToken: vi.fn().mockResolvedValue(Result.ok('test-access-token')),
        generateRefreshToken: vi.fn().mockResolvedValue(Result.ok('test-refresh-token')),
        verifyAccessToken: vi.fn().mockResolvedValue(
          Result.ok({
            sub: 'test-user',
            tier: 'tier1',
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        ),
        verifyRefreshToken: vi.fn().mockResolvedValue(Result.ok({ sub: 'test-user' })),
        decodeToken: vi.fn().mockReturnValue({ sub: 'test-user' }),
      },
    });

    // Mock Rate Limit Service
    container.register(DI_TOKENS.RateLimitService, {
      useValue: {
        checkLimit: vi.fn().mockResolvedValue({
          allowed: true,
          limit: 60,
          remaining: 59,
          resetAt: new Date(Date.now() + 60000),
          retryAfter: undefined,
        }),
        recordUsage: vi.fn().mockResolvedValue(undefined),
        getUsageStatus: vi.fn().mockResolvedValue({
          currentCount: 1,
          limit: 60,
          windowStart: new Date(),
          windowEnd: new Date(Date.now() + 60000),
        }),
        resetLimit: vi.fn().mockResolvedValue(undefined),
      },
    });

    // Mock Event Bus
    container.register(DI_TOKENS.EventBus, {
      useValue: {
        publish: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      },
    });

    // Mock Event Store
    container.register(DI_TOKENS.EventStore, {
      useValue: {
        append: vi.fn().mockResolvedValue(undefined),
        getEvents: vi.fn().mockResolvedValue([]),
        getEventsByAggregateId: vi.fn().mockResolvedValue([]),
        getEventsByType: vi.fn().mockResolvedValue([]),
      },
    });
  }

  /**
   * Register mock repositories
   */
  private static registerMockRepositories(container: DependencyContainer): void {
    // Mock Auth Log Repository
    container.register(DI_TOKENS.AuthLogRepository, {
      useValue: {
        save: vi.fn().mockResolvedValue(Result.ok(undefined)),
        findById: vi.fn().mockResolvedValue(Result.ok(null)),
        findByUserId: vi.fn().mockResolvedValue(Result.ok([])),
        findByEventType: vi.fn().mockResolvedValue(Result.ok([])),
        findByIPAddress: vi.fn().mockResolvedValue(Result.ok([])),
        findFailures: vi.fn().mockResolvedValue(Result.ok([])),
        findSuspiciousActivities: vi.fn().mockResolvedValue(Result.ok([])),
        getStatistics: vi.fn().mockResolvedValue(
          Result.ok({
            totalAttempts: 0,
            successfulLogins: 0,
            failedLogins: 0,
            uniqueUsers: 0,
            suspiciousActivities: 0,
            loginsByProvider: new Map(),
            tokenRefreshCount: 0,
          }),
        ),
        deleteOldLogs: vi.fn().mockResolvedValue(Result.ok(0)),
      },
    });

    // Mock API Log Repository
    container.register(DI_TOKENS.APILogRepository, {
      useValue: {
        save: vi.fn().mockResolvedValue(Result.ok(undefined)),
        findById: vi.fn().mockResolvedValue(Result.ok(null)),
        findByUserId: vi.fn().mockResolvedValue(Result.ok([])),
        findByTimeRange: vi.fn().mockResolvedValue(Result.ok([])),
        findErrors: vi.fn().mockResolvedValue(Result.ok([])),
        getStatistics: vi.fn().mockResolvedValue(
          Result.ok({
            totalRequests: 0,
            uniqueUsers: 0,
            errorCount: 0,
            averageResponseTime: 0,
            requestsByEndpoint: new Map(),
            requestsByStatus: new Map(),
          }),
        ),
        deleteOldLogs: vi.fn().mockResolvedValue(Result.ok(0)),
      },
    });

    // Mock Rate Limit Log Repository
    container.register(DI_TOKENS.RateLimitLogRepository, {
      useValue: {
        save: vi.fn().mockResolvedValue(Result.ok(undefined)),
        findByUserId: vi.fn().mockResolvedValue(Result.ok([])),
        countInWindow: vi.fn().mockResolvedValue(Result.ok(0)),
        deleteOlderThan: vi.fn().mockResolvedValue(Result.ok(undefined)),
        deleteByUserId: vi.fn().mockResolvedValue(Result.ok(undefined)),
      },
    });

    // Mock User Repository
    container.register(DI_TOKENS.UserRepository, {
      useValue: {
        findById: vi.fn().mockResolvedValue(Result.ok(null)),
        findByEmail: vi.fn().mockResolvedValue(Result.ok(null)),
        save: vi.fn().mockResolvedValue(Result.ok(undefined)),
        update: vi.fn().mockResolvedValue(Result.ok(undefined)),
        delete: vi.fn().mockResolvedValue(Result.ok(undefined)),
      },
    });
  }

  /**
   * Register mock use cases
   */
  private static registerMockUseCases(container: DependencyContainer): void {
    // These can be overridden in specific tests as needed
    // The default behavior is to return successful results
  }
}

/**
 * Helper function to create a test container with custom mocks
 */
export function createTestContainer(
  customMocks?: Record<string | symbol, any>,
  envOverrides?: Partial<EnvConfig>,
): DependencyContainer {
  const testContainer = TestContainerFactory.create(envOverrides);

  // Apply custom mocks
  if (customMocks) {
    Object.getOwnPropertySymbols(customMocks).forEach((token) => {
      testContainer.register(token, {
        useValue: customMocks[token],
      });
    });

    Object.keys(customMocks).forEach((key) => {
      const token = Symbol.for(key);
      testContainer.register(token, {
        useValue: customMocks[key],
      });
    });
  }

  return testContainer;
}

/**
 * Mock factory for creating mock instances with type safety
 */
export class MockFactory {
  /**
   * Create a mock logger
   */
  static createMockLogger(): Logger {
    return {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as any;
  }

  /**
   * Create a mock event bus
   */
  static createMockEventBus() {
    return {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    };
  }

  /**
   * Create a mock repository with common methods
   */
  static createMockRepository<T>() {
    return {
      save: vi.fn().mockResolvedValue(Result.ok(undefined)),
      findById: vi.fn().mockResolvedValue(Result.ok(null)),
      findAll: vi.fn().mockResolvedValue(Result.ok([])),
      update: vi.fn().mockResolvedValue(Result.ok(undefined)),
      delete: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };
  }
}

/**
 * Test utilities for dependency injection
 */
export class DITestUtils {
  /**
   * Spy on a service method
   */
  static spyOn<T>(container: DependencyContainer, token: symbol, method: keyof T): any {
    const service = container.resolve<T>(token);
    return vi.spyOn(service as any, method as string);
  }

  /**
   * Replace a service with a mock
   */
  static replaceMock<T>(container: DependencyContainer, token: symbol, mock: T): void {
    container.register(token, {
      useValue: mock,
    });
  }

  /**
   * Get a resolved service from the container
   */
  static resolve<T>(container: DependencyContainer, token: symbol): T {
    return container.resolve<T>(token);
  }
}
