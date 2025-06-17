import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { AuthenticationFailed } from '@/domain/auth/events/authentication-failed.event';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { AuthResult } from '@/domain/log/value-objects';
import { AuthEvent, EventType } from '@/domain/log/value-objects/auth-event';
import { IPAddress as IpAddress } from '@/domain/log/value-objects/ip-address';
import { Provider } from '@/domain/log/value-objects/provider';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

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
            error: providerResult.getError(),
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
            error: ipResult.getError(),
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
              error: uaResult.getError(),
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
              error: userIdResult.getError(),
            },
            'Invalid attempted userId in AuthenticationFailed event',
          );
        }
      }

      // Create AuthEvent
      const authEventResult = AuthEvent.create(EventType.LOGIN_FAILED, event.reason);
      if (authEventResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: authEventResult.getError(),
          },
          'Failed to create AuthEvent',
        );
        return;
      }

      // 認証ログエントリの作成
      const logEntryResult = AuthLogEntry.create({
        userId,
        event: authEventResult.getValue(),
        provider: providerResult.getValue(),
        ipAddress: ipResult.getValue(),
        userAgent: userAgent || UserAgent.create('Unknown').getValue(),
        timestamp: new Date(),
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
            error: logEntryResult.getError(),
          },
          'Failed to create AuthLogEntry for authentication failure',
        );
        return;
      }

      // ログの保存
      const saveResult = await this.authLogRepository.save(logEntryResult.getValue());
      if (saveResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: saveResult.getError(),
          },
          'Failed to save authentication failure log',
        );
        return;
      }

      // セキュリティ警告の確認（同一IPからの複数の失敗など）
      const recentFailuresResult = await this.authLogRepository.findByIPAddress(
        ipResult.getValue(),
        undefined,
        10,
      );

      if (recentFailuresResult.isSuccess && recentFailuresResult.getValue().length >= 5) {
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
