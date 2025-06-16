import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { AuthenticationFailed } from '@/domain/auth/events/authentication-failed.event';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { Logger } from 'pino';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { AuthEventType } from '@/domain/log/value-objects/auth-event';
import { Provider } from '@/domain/log/value-objects/provider';
import { IPAddress as IpAddress } from '@/domain/log/value-objects/ip-address';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { AuthResult } from '@/domain/log/value-objects';

/**
 * 認証失敗イベントのハンドラー
 * 認証ログへの記録を行う
 */
@injectable()
export class AuthenticationFailedHandler implements IEventHandler<AuthenticationFailed> {
  constructor(
    @inject(DI_TOKENS.AuthLogRepository)
    private readonly authLogRepository: IAuthLogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async handle(event: AuthenticationFailed): Promise<void> {
    try {
      this.logger.info(
        {
          eventId: event.eventId,
          provider: event.provider,
          reason: event.reason,
          ipAddress: event.ipAddress,
        },
        'Handling AuthenticationFailed event',
      );

      // Providerの作成
      const providerResult = Provider.create(event.provider);
      if (providerResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: providerResult.error,
          },
          'Invalid provider in AuthenticationFailed event',
        );
        return;
      }

      // IPアドレスの作成
      const ipResult = IpAddress.create(event.ipAddress);
      if (ipResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: ipResult.error,
          },
          'Invalid IP address in AuthenticationFailed event',
        );
        return;
      }

      // UserAgentの作成（オプション）
      let userAgent: UserAgent | undefined;
      if (event.userAgent) {
        const uaResult = UserAgent.create(event.userAgent);
        if (uaResult.isSuccess) {
          userAgent = uaResult.getValue();
        } else {
          this.logger.warn(
            {
              eventId: event.eventId,
              userAgent: event.userAgent,
              error: uaResult.error,
            },
            'Invalid user agent in AuthenticationFailed event',
          );
        }
      }

      // UserIdの作成（オプション - 試行されたユーザーID）
      let userId: UserId | undefined;
      if (event.attemptedUserId) {
        const userIdResult = UserId.create(event.attemptedUserId);
        if (userIdResult.isSuccess) {
          userId = userIdResult.getValue();
        } else {
          this.logger.warn(
            {
              eventId: event.eventId,
              attemptedUserId: event.attemptedUserId,
              error: userIdResult.error,
            },
            'Invalid attempted userId in AuthenticationFailed event',
          );
        }
      }

      // 認証ログエントリの作成
      const logEntryResult = AuthLogEntry.create({
        userId,
        eventType: AuthEventType.LOGIN,
        provider: providerResult.getValue(),
        ipAddress: ipResult.getValue(),
        userAgent,
        result: AuthResult.FAILED,
        errorMessage: event.reason,
        metadata: {
          eventId: event.eventId,
          aggregateId: event.aggregateId,
        },
      });

      if (logEntryResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: logEntryResult.error,
          },
          'Failed to create AuthLogEntry for authentication failure',
        );
        return;
      }

      // ログの保存
      const saveResult = await this.authLogRepository.save(logEntryResult.getValue());
      if (saveResult.isFailure()) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: saveResult.error,
          },
          'Failed to save authentication failure log',
        );
        return;
      }

      // セキュリティ警告の確認（同一IPからの複数の失敗など）
      const recentFailuresResult = await this.authLogRepository.findFailures({
        ipAddress: ipResult.getValue(),
        limit: 10,
      });

      if (recentFailuresResult.isSuccess() && recentFailuresResult.getValue().length >= 5) {
        this.logger.warn(
          {
            eventId: event.eventId,
            ipAddress: event.ipAddress,
            failureCount: recentFailuresResult.getValue().length,
          },
          'Multiple authentication failures detected from same IP',
        );
      }

      this.logger.info(
        {
          eventId: event.eventId,
          logId: logEntryResult.getValue().id.value,
        },
        'AuthenticationFailed event handled successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          eventId: event.eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error handling AuthenticationFailed event',
      );
      throw error;
    }
  }
}
