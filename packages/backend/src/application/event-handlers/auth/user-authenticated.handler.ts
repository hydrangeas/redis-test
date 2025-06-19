import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { UserAuthenticated } from '@/domain/auth/events/user-authenticated.event';
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
 * ユーザー認証成功イベントのハンドラー
 * 認証ログへの記録を行う
 */
@injectable()
export class UserAuthenticatedHandler implements IEventHandler<UserAuthenticated> {
  constructor(
    @inject(DI_TOKENS.AuthLogRepository)
    private readonly authLogRepository: IAuthLogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async handle(event: UserAuthenticated): Promise<void> {
    try {
      this.logger.info(
        {
          eventId: event.eventId,
          userId: event.userId,
          provider: event.provider,
          tier: event.tier,
        },
        'Handling UserAuthenticated event',
      );

      // Value Objectsの作成
      const userIdResult = UserId.create(event.userId);
      if (userIdResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: userIdResult.getError(),
          },
          'Invalid userId in UserAuthenticated event',
        );
        return;
      }

      const providerResult = Provider.create(event.provider);
      if (providerResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: providerResult.getError(),
          },
          'Invalid provider in UserAuthenticated event',
        );
        return;
      }

      // IPアドレスの作成（オプション）
      let ipAddress: IpAddress | undefined;
      if (event.ipAddress) {
        const ipResult = IpAddress.create(event.ipAddress);
        if (ipResult.isSuccess) {
          ipAddress = ipResult.getValue();
        } else {
          this.logger.warn(
            {
              eventId: event.eventId,
              ipAddress: event.ipAddress,
              error: ipResult.getError(),
            },
            'Invalid IP address in UserAuthenticated event',
          );
        }
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
            'Invalid user agent in UserAuthenticated event',
          );
        }
      }

      // Create AuthEvent
      const authEventResult = AuthEvent.create(EventType.LOGIN, 'User authenticated successfully');
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
        userId: userIdResult.getValue(),
        event: authEventResult.getValue(),
        provider: providerResult.getValue(),
        ipAddress: ipAddress || IpAddress.create('0.0.0.0').getValue(),
        userAgent: userAgent || UserAgent.create('Unknown').getValue(),
        timestamp: new Date(),
        result: AuthResult.SUCCESS,
        metadata: {
          sessionId: event.sessionId,
          tier: event.tier,
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
          'Failed to create AuthLogEntry',
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
          'Failed to save auth log',
        );
        return;
      }

      this.logger.info(
        {
          eventId: event.eventId,
          logId: logEntryResult.getValue().id.value,
        },
        'UserAuthenticated event handled successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          eventId: event.eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error handling UserAuthenticated event',
      );
      throw error;
    }
  }
}
