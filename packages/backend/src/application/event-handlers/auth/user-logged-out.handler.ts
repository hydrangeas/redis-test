import { Logger } from 'pino';

import { injectable, inject } from 'tsyringe';

import { AuthEvent, EventType } from '@/domain/log/value-objects/auth-event';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { AuthResult } from '@/domain/log/value-objects';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import { Provider } from '@/domain/log/value-objects/provider';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserLoggedOut } from '@/domain/auth/events/user-logged-out.event';

import { DI_TOKENS } from '@/infrastructure/di/tokens';

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
            error: userIdResult.getError(),
          },
          'Invalid userId in UserLoggedOut event',
        );
        return;
      }

      // Create AuthEvent
      const authEventResult = AuthEvent.create(EventType.LOGOUT, event.reason || 'User logged out');
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

      // Create Provider (default for logout)
      const providerResult = Provider.create('session');
      if (providerResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: providerResult.getError(),
          },
          'Failed to create Provider',
        );
        return;
      }

      // Create dummy IP and UserAgent for logout
      const ipAddressResult = IPAddress.create('0.0.0.0');
      const userAgentResult = UserAgent.create('User Logout');

      if (ipAddressResult.isFailure || userAgentResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: ipAddressResult.isFailure ? ipAddressResult.getError() : userAgentResult.getError(),
          },
          'Failed to create IP or UserAgent',
        );
        return;
      }

      // 認証ログエントリの作成
      const logEntryResult = AuthLogEntry.create({
        userId: userIdResult.getValue(),
        event: authEventResult.getValue(),
        provider: providerResult.getValue(),
        ipAddress: ipAddressResult.getValue(),
        userAgent: userAgentResult.getValue(),
        timestamp: new Date(),
        result: AuthResult.SUCCESS,
        metadata: {
          sessionId: event.sessionId,
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
            error: logEntryResult.getError(),
          },
          'Failed to create AuthLogEntry for logout',
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
