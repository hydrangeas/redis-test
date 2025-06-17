// Auth Event Handlers
export * from './auth';

// API Event Handlers
export * from './api';

// Data Event Handlers
export * from './data';

// Event Handler Registration

import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { EventLogger } from '@/infrastructure/logging';

import { APIAccessRequestedHandler } from './api/api-access-requested.handler';
import { RateLimitExceededHandler } from './api/rate-limit-exceeded.handler';
import { AuthenticationFailedHandler } from './auth/authentication-failed.handler';
import { TokenRefreshedHandler } from './auth/token-refreshed.handler';
import { UserAuthenticatedHandler } from './auth/user-authenticated.handler';
import { UserLoggedOutHandler } from './auth/user-logged-out.handler';
import { DataResourceNotFoundHandler } from './data/data-resource-not-found.handler';
import { DataRetrievedHandler } from './data/data-retrieved.handler';

import type { IEventBus } from '@/domain/interfaces/event-bus.interface';
import type { DependencyContainer } from 'tsyringe';

/**
 * すべてのイベントハンドラーをEventBusに登録
 */
export function registerEventHandlers(container: DependencyContainer): void {
  const eventBus = container.resolve<IEventBus>(DI_TOKENS.EventBus);

  // Universal Event Logger - すべてのイベントをログに記録
  const eventLogger = container.resolve(EventLogger);

  // Auth Event Handlers
  const userAuthenticatedHandler = container.resolve(UserAuthenticatedHandler);
  eventBus.subscribe('UserAuthenticated', userAuthenticatedHandler);
  eventBus.subscribe('UserAuthenticated', eventLogger);

  const tokenRefreshedHandler = container.resolve(TokenRefreshedHandler);
  eventBus.subscribe('TokenRefreshed', tokenRefreshedHandler);
  eventBus.subscribe('TokenRefreshed', eventLogger);

  const userLoggedOutHandler = container.resolve(UserLoggedOutHandler);
  eventBus.subscribe('UserLoggedOut', userLoggedOutHandler);
  eventBus.subscribe('UserLoggedOut', eventLogger);

  const authenticationFailedHandler = container.resolve(AuthenticationFailedHandler);
  eventBus.subscribe('AuthenticationFailed', authenticationFailedHandler);
  eventBus.subscribe('AuthenticationFailed', eventLogger);

  // API Event Handlers
  const apiAccessRequestedHandler = container.resolve(APIAccessRequestedHandler);
  eventBus.subscribe('APIAccessRequested', apiAccessRequestedHandler);
  eventBus.subscribe('APIAccessRequested', eventLogger);

  const rateLimitExceededHandler = container.resolve(RateLimitExceededHandler);
  eventBus.subscribe('RateLimitExceeded', rateLimitExceededHandler);
  eventBus.subscribe('RateLimitExceeded', eventLogger);

  // Data Event Handlers
  const dataRetrievedHandler = container.resolve(DataRetrievedHandler);
  eventBus.subscribe('DataRetrieved', dataRetrievedHandler);
  eventBus.subscribe('DataRetrieved', eventLogger);

  const dataResourceNotFoundHandler = container.resolve(DataResourceNotFoundHandler);
  eventBus.subscribe('DataResourceNotFound', dataResourceNotFoundHandler);
  eventBus.subscribe('DataResourceNotFound', eventLogger);
}
