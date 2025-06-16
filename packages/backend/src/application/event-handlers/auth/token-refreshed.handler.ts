import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { TokenRefreshed } from '@/domain/auth/events/token-refreshed.event';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { Logger } from 'pino';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { AuthEventType } from '@/domain/log/value-objects/auth-event';
import { AuthResult } from '@/domain/log/value-objects';

/**
 * トークンリフレッシュイベントのハンドラー
 * 認証ログへの記録を行う
 */
@injectable()
export class TokenRefreshedHandler implements IEventHandler<TokenRefreshed> {
  constructor(
    @inject(DI_TOKENS.AuthLogRepository)
    private readonly authLogRepository: IAuthLogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async handle(event: TokenRefreshed): Promise<void> {
    try {
      this.logger.info(
        {
          eventId: event.eventId,
          userId: event.userId,
          refreshCount: event.refreshCount,
        },
        'Handling TokenRefreshed event',
      );

      // UserIdの作成
      const userIdResult = UserId.create(event.userId);
      if (userIdResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: userIdResult.error,
          },
          'Invalid userId in TokenRefreshed event',
        );
        return;
      }

      // 認証ログエントリの作成
      const logEntryResult = AuthLogEntry.create({
        userId: userIdResult.getValue(),
        eventType: AuthEventType.TOKEN_REFRESH,
        result: AuthResult.SUCCESS,
        sessionId: event.sessionId,
        metadata: {
          oldTokenId: event.oldTokenId,
          newTokenId: event.newTokenId,
          refreshCount: event.refreshCount,
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
          'Failed to create AuthLogEntry for token refresh',
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
          'Failed to save token refresh log',
        );
        return;
      }

      this.logger.info(
        {
          eventId: event.eventId,
          logId: logEntryResult.getValue().id.value,
        },
        'TokenRefreshed event handled successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          eventId: event.eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error handling TokenRefreshed event',
      );
      throw error;
    }
  }
}
