// Auth Event Handlers
export * from './auth';

// API Event Handlers
export * from './api';

// Data Event Handlers
export * from './data';

// Event Handler Registration
import { DependencyContainer } from 'tsyringe';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

// Auth Handlers
import { UserAuthenticatedHandler } from './auth/user-authenticated.handler';
import { TokenRefreshedHandler } from './auth/token-refreshed.handler';
import { UserLoggedOutHandler } from './auth/user-logged-out.handler';
import { AuthenticationFailedHandler } from './auth/authentication-failed.handler';

// API Handlers
import { APIAccessRequestedHandler } from './api/api-access-requested.handler';
import { RateLimitExceededHandler } from './api/rate-limit-exceeded.handler';

// Data Handlers
import { DataRetrievedHandler } from './data/data-retrieved.handler';
import { DataResourceNotFoundHandler } from './data/data-resource-not-found.handler';

/**
 * すべてのイベントハンドラーをEventBusに登録
 */
export function registerEventHandlers(container: DependencyContainer): void {
  const eventBus = container.resolve<IEventBus>(DI_TOKENS.EventBus);

  // Auth Event Handlers
  const userAuthenticatedHandler = container.resolve(UserAuthenticatedHandler);
  eventBus.subscribe('UserAuthenticated', userAuthenticatedHandler);

  const tokenRefreshedHandler = container.resolve(TokenRefreshedHandler);
  eventBus.subscribe('TokenRefreshed', tokenRefreshedHandler);

  const userLoggedOutHandler = container.resolve(UserLoggedOutHandler);
  eventBus.subscribe('UserLoggedOut', userLoggedOutHandler);

  const authenticationFailedHandler = container.resolve(AuthenticationFailedHandler);
  eventBus.subscribe('AuthenticationFailed', authenticationFailedHandler);

  // API Event Handlers
  const apiAccessRequestedHandler = container.resolve(APIAccessRequestedHandler);
  eventBus.subscribe('APIAccessRequested', apiAccessRequestedHandler);

  const rateLimitExceededHandler = container.resolve(RateLimitExceededHandler);
  eventBus.subscribe('RateLimitExceeded', rateLimitExceededHandler);

  // Data Event Handlers
  const dataRetrievedHandler = container.resolve(DataRetrievedHandler);
  eventBus.subscribe('DataRetrieved', dataRetrievedHandler);

  const dataResourceNotFoundHandler = container.resolve(DataResourceNotFoundHandler);
  eventBus.subscribe('DataResourceNotFound', dataResourceNotFoundHandler);
}