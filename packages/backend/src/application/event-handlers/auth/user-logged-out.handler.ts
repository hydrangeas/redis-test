import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { UserLoggedOut } from '@/domain/auth/events/user-logged-out.event';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { Logger } from 'pino';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { AuthEventType } from '@/domain/log/value-objects/auth-event';
import { AuthResult } from '@/domain/log/value-objects';

/**
 * ユーザーログアウトイベントのハンドラー
 * 認証ログへの記録を行う
 */
@injectable()
export class UserLoggedOutHandler implements IEventHandler<UserLoggedOut> {
  constructor(
    @inject(DI_TOKENS.AuthLogRepository)
    private readonly authLogRepository: IAuthLogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async handle(event: UserLoggedOut): Promise<void> {
    try {
      this.logger.info(
        {
          eventId: event.eventId,
          userId: event.userId,
          reason: event.reason,
          allSessions: event.allSessions,
        },
        'Handling UserLoggedOut event',
      );

      // UserIdの作成
      const userIdResult = UserId.create(event.userId);
      if (userIdResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: userIdResult.error,
          },
          'Invalid userId in UserLoggedOut event',
        );
        return;
      }

      // 認証ログエントリの作成
      const logEntryResult = AuthLogEntry.create({
        userId: userIdResult.getValue(),
        eventType: AuthEventType.LOGOUT,
        result: AuthResult.SUCCESS,
        sessionId: event.sessionId,
        metadata: {
          reason: event.reason,
          allSessions: event.allSessions,
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
          'Failed to create AuthLogEntry for logout',
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
          'Failed to save logout log',
        );
        return;
      }

      this.logger.info(
        {
          eventId: event.eventId,
          logId: logEntryResult.getValue().id.value,
        },
        'UserLoggedOut event handled successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          eventId: event.eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error handling UserLoggedOut event',
      );
      throw error;
    }
  }
}
