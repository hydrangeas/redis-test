import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-handler.interface';
import { UserAuthenticated } from '@/domain/auth/events/user-authenticated.event';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { AuthLogEntry, AuthResult } from '@/domain/log/entities/auth-log-entry';
import { LogId } from '@/domain/log/value-objects/log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { AuthEvent, EventType } from '@/domain/log/value-objects/auth-event';
import { Provider } from '@/domain/log/value-objects/provider';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Logger } from 'pino';

/**
 * UserAuthenticated イベントを処理して認証ログを記録するハンドラー
 */
@injectable()
export class AuthLogHandler implements IEventHandler<UserAuthenticated> {
  constructor(
    @inject(DI_TOKENS.AuthLogRepository)
    private readonly authLogRepository: IAuthLogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async handle(event: UserAuthenticated): Promise<void> {
    try {
      // AuthEventの作成
      const authEventResult = AuthEvent.create(
        EventType.LOGIN_SUCCESS,
        'User authenticated successfully',
      );
      if (authEventResult.isFailure) {
        this.logger.error(
          {
            error: authEventResult.error,
            event: event.getMetadata(),
          },
          'Failed to create auth event',
        );
        return;
      }

      // UserIdの作成
      const userIdResult = UserId.create(event.userId);
      if (userIdResult.isFailure) {
        this.logger.error(
          {
            error: userIdResult.error,
            event: event.getMetadata(),
          },
          'Failed to create user id',
        );
        return;
      }

      // Providerの作成
      const providerResult = Provider.create(event.provider);
      if (providerResult.isFailure) {
        this.logger.error(
          {
            error: providerResult.error,
            event: event.getMetadata(),
          },
          'Failed to create provider',
        );
        return;
      }

      // IPAddressの作成
      const ipAddressResult = event.ipAddress
        ? IPAddress.create(event.ipAddress)
        : IPAddress.unknown();
      if (ipAddressResult.isFailure) {
        this.logger.error(
          {
            error: ipAddressResult.error,
            event: event.getMetadata(),
          },
          'Failed to create IP address',
        );
        return;
      }

      // UserAgentの作成
      const userAgentResult = event.userAgent
        ? UserAgent.create(event.userAgent)
        : UserAgent.unknown();
      if (userAgentResult.isFailure) {
        this.logger.error(
          {
            error: userAgentResult.error,
            event: event.getMetadata(),
          },
          'Failed to create user agent',
        );
        return;
      }

      // ログエントリの作成
      const logEntryResult = AuthLogEntry.create({
        userId: userIdResult.getValue(),
        event: authEventResult.getValue(),
        provider: providerResult.getValue(),
        ipAddress: ipAddressResult.getValue(),
        userAgent: userAgentResult.getValue(),
        timestamp: event.occurredAt,
        result: AuthResult.SUCCESS,
        metadata: {
          tier: event.tier,
          sessionId: event.sessionId,
          eventId: event.eventId,
        },
      });

      if (logEntryResult.isFailure) {
        this.logger.error(
          {
            error: logEntryResult.error,
            event: event.getMetadata(),
          },
          'Failed to create log entry',
        );
        return;
      }

      // リポジトリに保存
      const saveResult = await this.authLogRepository.save(logEntryResult.getValue());

      if (saveResult.isFailure) {
        this.logger.error(
          {
            error: saveResult.error,
            event: event.getMetadata(),
          },
          'Failed to save authentication log',
        );
        return;
      }

      this.logger.info(
        {
          event: event.getMetadata(),
          logId: logEntryResult.getValue().id.value,
        },
        'Authentication event logged successfully',
      );
    } catch (error) {
      // ログ記録の失敗はメイン処理に影響させない
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          event: event.getMetadata(),
        },
        'Failed to log authentication event',
      );
    }
  }
}
