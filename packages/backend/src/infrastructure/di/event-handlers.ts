import { container } from 'tsyringe';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { AuthLogHandler } from '@/infrastructure/event-handlers/auth-log.handler';
// TODO: Enable when NotificationService is implemented
// import { AuthNotificationHandler } from '@/infrastructure/event-handlers/auth-notification.handler';
import { DI_TOKENS } from './tokens';

/**
 * イベントハンドラーをイベントバスに登録
 */
export const registerEventHandlers = (): void => {
  const eventBus = container.resolve<IEventBus>(DI_TOKENS.EventBus);

  // UserAuthenticatedイベントのハンドラー登録
  eventBus.subscribe('UserAuthenticated', container.resolve(AuthLogHandler));

  // TODO: Enable when NotificationService is implemented
  // eventBus.subscribe('UserAuthenticated', container.resolve(AuthNotificationHandler));

  // TokenRefreshedイベントのハンドラー登録
  // TODO: TokenRefreshedハンドラーの実装後に追加

  // UserLoggedOutイベントのハンドラー登録
  // TODO: UserLoggedOutハンドラーの実装後に追加

  // AuthenticationFailedイベントのハンドラー登録
  // TODO: AuthenticationFailedハンドラーの実装後に追加
};
