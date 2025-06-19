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

interface INotificationService {
  sendNewDeviceAlert: (params: { userId: string; device: string; location: string; timestamp: Date }) => Promise<void>;
  sendSecurityAlert: (params: { userId: string; reason: string; details: unknown }) => Promise<void>;
}

interface ILogger {
  info: (obj: Record<string, unknown>, msg: string) => void;
  warn: (obj: Record<string, unknown>, msg: string) => void;
  error: (obj: Record<string, unknown>, msg: string) => void;
}

interface IEvent {
  userId: string;
  userAgent?: string;
  occurredAt: Date;
  getData: () => unknown;
  getMetadata: () => unknown;
}

// Temporary export to avoid compilation errors
export class AuthNotificationHandler {
  constructor(
    private readonly notificationService: INotificationService,
    private readonly logger: ILogger,
  ) {}

  handle(event: IEvent): Promise<void> {
    // Stub implementation for tests
    try {
      if (this.isNewDevice(event)) {
        this.notificationService.sendNewDeviceAlert({
          userId: event.userId,
          device: event.userAgent || 'Unknown device',
          location: 'Unknown location',
          timestamp: event.occurredAt,
        }).catch((err) => {
          this.logger.error({
            error: err instanceof Error ? err.message : String(err),
            userId: event.userId,
          }, 'Failed to send new device alert');
        });
        
        this.logger.info({
          userId: event.userId,
          userAgent: event.userAgent,
        }, 'New device login alert sent');
      }

      if (this.isSuspiciousLogin(event)) {
        this.notificationService.sendSecurityAlert({
          userId: event.userId,
          reason: 'Suspicious login pattern detected',
          details: event.getData(),
        }).catch((err) => {
          this.logger.warn({
            error: err instanceof Error ? err.message : String(err),
            userId: event.userId,
          }, 'Failed to send suspicious login alert');
        });
        
        this.logger.warn({
          userId: event.userId,
          eventData: event.getData(),
        }, 'Suspicious login alert sent');
      }
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : error,
        event: event.getMetadata(),
      }, 'Failed to send authentication notification');
    }
    return Promise.resolve();
  }

  private isNewDevice(_event: IEvent): boolean {
    return false;
  }

  private isSuspiciousLogin(_event: IEvent): boolean {
    return false;
  }
}