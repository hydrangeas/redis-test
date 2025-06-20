// TODO: Implement NotificationService and add NotificationService token to DI_TOKENS before enabling this handler

/*
import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-handler.interface';
import { UserAuthenticated } from '@/domain/auth/events/user-authenticated.event';
import { INotificationService } from '@/infrastructure/services/notification.service.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Logger } from 'pino';

@injectable()
export class AuthNotificationHandler implements IEventHandler<UserAuthenticated> {
  constructor(
    @inject(DI_TOKENS.NotificationService)
    private readonly notificationService: INotificationService,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async handle(event: UserAuthenticated): Promise<void> {
    try {
      // 新しいデバイスからのログインを検出
      if (await this.isNewDevice(event)) {
        await this.notificationService.sendNewDeviceAlert({
          userId: event.userId,
          deviceInfo: event.userAgent,
          ipAddress: event.ipAddress,
          timestamp: event.occurredAt,
        });
      }

      // 異常なログインパターンを検出
      if (await this.isAnomalousLogin(event)) {
        await this.notificationService.sendSecurityAlert({
          userId: event.userId,
          reason: 'Anomalous login pattern detected',
          details: {
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            timestamp: event.occurredAt,
          },
        });
      }

      this.logger.info({
        eventId: event.id,
        userId: event.userId,
        eventType: 'UserAuthenticated',
        notificationsSent: true,
      }, 'Notifications sent for authentication event');
    } catch (error) {
      this.logger.error({
        eventId: event.id,
        userId: event.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Failed to send authentication notifications');
      // 通知の失敗はクリティカルではないので、エラーを再スローしない
    }
  }

  private async isNewDevice(event: UserAuthenticated): Promise<boolean> {
    // TODO: デバイス履歴をチェックする実装
    return false;
  }

  private async isAnomalousLogin(event: UserAuthenticated): Promise<boolean> {
    // TODO: 異常検知ロジックの実装
    return false;
  }
}
*/

// Temporary export to avoid compilation errors
export class AuthNotificationHandler {}