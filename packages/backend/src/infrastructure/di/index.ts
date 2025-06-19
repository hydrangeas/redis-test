/**
 * Dependency Injection module exports
 * This module provides all DI-related functionality for the application
 */

export { DI_TOKENS, LifecycleScope, createToken } from './tokens';
export type { DIToken } from './tokens';
export { setupDI, setupTestDI } from './container';
export { createTestContainer, MockFactory, DITestUtils } from './test-container';
export {
  // Lifecycle decorators
  Injectable,
  Singleton,
  Scoped,

  // Injection decorators
  Inject,
  InjectLogger,
  InjectEnvConfig,
  InjectEventBus,
  InjectSupabaseClient,

  // Repository injectors
  InjectUserRepository,
  InjectAuthLogRepository,
  InjectAPILogRepository,
  InjectRateLimitRepository,
  InjectOpenDataRepository,

  // Service injectors
  InjectAuthenticationService,
  InjectRateLimitService,
  InjectDataAccessService,
  InjectJWTService,

  // Use case injectors
  InjectAuthenticationUseCase,
  InjectDataAccessUseCase,
  InjectRateLimitUseCase,

  // Utilities
  createInjectionDecorator,
  RegisterInterfaces,
  DIMetadata,
  PostConstruct,
  executePostConstruct,
  LazyInject,
} from './decorators';

// Re-export TSyringe utilities for convenience
import { container } from 'tsyringe';

import { setupDI } from './container';

import type { ValueProvider } from 'tsyringe';

// Import setupDI for local use

export { container };

/**
 * Initialize the DI container for the application
 */
export function initializeContainer(): void {
  setupDI();
}

/**
 * Get a service from the container
 */
export function getService<T>(token: symbol): T {
  return container.resolve<T>(token);
}

/**
 * Check if a service is registered in the container
 */
export function isServiceRegistered(token: symbol): boolean {
  return container.isRegistered(token);
}

/**
 * Register a service in the container
 */
export function registerService<T>(
  token: symbol,
  provider: { useClass?: new (...args: unknown[]) => T; useValue?: T; useFactory?: () => T },
): void {
  container.register(token, provider as ValueProvider<T>);
}

/**
 * Clear all registrations (useful for testing)
 */
export function clearContainer(): void {
  container.reset();
}
