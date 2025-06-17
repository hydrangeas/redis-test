import { Logger } from 'pino';

import { injectable, inject } from 'tsyringe';

import { AuthEvent, EventType } from '@/domain/log/value-objects/auth-event';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { AuthResult } from '@/domain/log/value-objects';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import { Provider } from '@/domain/log/value-objects/provider';
import { TokenRefreshed } from '@/domain/auth/events/token-refreshed.event';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { UserId } from '@/domain/auth/value-objects/user-id';

import { DI_TOKENS } from '@/infrastructure/di/tokens';

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
            error: userIdResult.getError(),
          },
          'Invalid userId in TokenRefreshed event',
        );
        return;
      }

      // 認証ログエントリの作成
      // Create AuthEvent
      const authEventResult = AuthEvent.create(EventType.TOKEN_REFRESH, 'Token refreshed successfully');
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

      // Create Provider (default for token refresh)
      const providerResult = Provider.create('jwt');
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

      // Create dummy IP and UserAgent for token refresh
      const ipAddressResult = IPAddress.create('0.0.0.0');
      const userAgentResult = UserAgent.create('Token Refresh');

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
            error: logEntryResult.getError(),
          },
          'Failed to create AuthLogEntry for token refresh',
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
