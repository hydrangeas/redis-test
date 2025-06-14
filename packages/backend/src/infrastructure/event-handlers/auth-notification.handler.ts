import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-handler.interface';
import { UserAuthenticated } from '@/domain/auth/events/user-authenticated.event';
import { INotificationService } from '@/infrastructure/services/notification.service.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Logger } from 'pino';

/**
 * UserAuthenticated イベントを処理して通知を送信するハンドラー
 */
@injectable()
export class AuthNotificationHandler implements IEventHandler<UserAuthenticated> {
  constructor(
    @inject(DI_TOKENS.NotificationService)
    private readonly notificationService: INotificationService,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger
  ) {}

  async handle(event: UserAuthenticated): Promise<void> {
    try {
      // 新しいデバイスからのログインを検出
      if (await this.isNewDevice(event)) {
        await this.notificationService.sendNewDeviceAlert({
          userId: event.userId,
          device: event.userAgent || 'Unknown device',
          location: await this.getLocationFromIP(event.ipAddress),
          timestamp: event.occurredAt,
        });

        this.logger.info({
          userId: event.userId,
          userAgent: event.userAgent,
        }, 'New device login alert sent');
      }

      // 異常なログインパターンの検出
      if (await this.isSuspiciousLogin(event)) {
        await this.notificationService.sendSecurityAlert({
          userId: event.userId,
          reason: 'Suspicious login pattern detected',
          details: event.getData(),
        });

        this.logger.warn({
          userId: event.userId,
          eventData: event.getData(),
        }, 'Suspicious login alert sent');
      }
    } catch (error) {
      // 通知の失敗はメイン処理に影響させない
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        event: event.getMetadata(),
      }, 'Failed to send authentication notification');
    }
  }

  /**
   * 新しいデバイスからのログインかどうかを判定
   * @param event 認証イベント
   */
  private async isNewDevice(event: UserAuthenticated): Promise<boolean> {
    // 実装: デバイス履歴との照合
    // ここでは簡略化のため、常にfalseを返す
    return false;
  }

  /**
   * IPアドレスから位置情報を取得
   * @param ipAddress IPアドレス
   */
  private async getLocationFromIP(ipAddress?: string): Promise<string> {
    // 実装: IP位置情報サービスとの連携
    // ここでは簡略化のため、固定値を返す
    if (!ipAddress) {
      return 'Unknown location';
    }
    return 'Unknown location';
  }

  /**
   * 疑わしいログインかどうかを判定
   * @param event 認証イベント
   */
  private async isSuspiciousLogin(event: UserAuthenticated): Promise<boolean> {
    // 実装: 異常検知ロジック
    // 例：
    // - 短時間での異なる地域からのログイン
    // - 通常と異なる時間帯のログイン
    // - 異常なユーザーエージェント
    // ここでは簡略化のため、常にfalseを返す
    return false;
  }
}