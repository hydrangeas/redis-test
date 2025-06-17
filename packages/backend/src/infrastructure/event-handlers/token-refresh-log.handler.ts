import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-handler.interface';
import { TokenRefreshed } from '@/domain/auth/events/token-refreshed.event';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { AuthResult } from '@/domain/log/value-objects/auth-result';
import { AuthEvent } from '@/domain/log/value-objects/auth-event';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { Provider } from '@/domain/log/value-objects/provider';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import type { Logger } from 'pino';

@injectable()
export class TokenRefreshLogHandler implements IEventHandler<TokenRefreshed> {
  constructor(
    @inject(DI_TOKENS.AuthLogRepository)
    private readonly authLogRepository: IAuthLogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async handle(event: TokenRefreshed): Promise<void> {
    try {
      // UserIdの作成
      const userIdResult = UserId.create(event.userId);
      if (userIdResult.isFailure) {
        this.logger.error(
          {
            userId: event.userId,
            error: userIdResult.getError().message,
          },
          'Invalid user ID in token refresh event',
        );
        return;
      }

      // AuthEventの作成
      const authEventResult = AuthEvent.tokenRefresh();
      if (authEventResult.isFailure) {
        this.logger.error(
          {
            error: authEventResult.getError().message,
          },
          'Failed to create auth event',
        );
        return;
      }

      // Providerの作成
      const providerResult = Provider.create('JWT');
      if (providerResult.isFailure) {
        this.logger.error(
          {
            error: providerResult.getError().message,
          },
          'Failed to create provider',
        );
        return;
      }

      // IPAddressとUserAgentは不明（リフレッシュ時は通常IPが取得できない）
      const ipAddressResult = IPAddress.unknown();
      if (ipAddressResult.isFailure) {
        this.logger.error(
          {
            error: ipAddressResult.getError().message,
          },
          'Failed to create IP address',
        );
        return;
      }

      const userAgentResult = UserAgent.unknown();
      if (userAgentResult.isFailure) {
        this.logger.error(
          {
            error: userAgentResult.getError().message,
          },
          'Failed to create user agent',
        );
        return;
      }

      // AuthLogEntryの作成
      const logEntryResult = AuthLogEntry.create({
        userId: userIdResult.getValue(),
        event: authEventResult.getValue(),
        provider: providerResult.getValue(),
        ipAddress: ipAddressResult.getValue(),
        userAgent: userAgentResult.getValue(),
        timestamp: event.occurredAt,
        result: AuthResult.SUCCESS,
        metadata: {
          sessionId: event.sessionId,
          oldTokenId: event.oldTokenId,
          newTokenId: event.newTokenId,
          refreshCount: event.refreshCount,
        },
      });

      if (logEntryResult.isFailure) {
        this.logger.error(
          {
            error: logEntryResult.getError().message,
            event: event.getMetadata(),
          },
          'Failed to create auth log entry',
        );
        return;
      }

      // ログエントリの保存
      const saveResult = await this.authLogRepository.save(logEntryResult.getValue());
      if (saveResult.isFailure) {
        this.logger.error(
          {
            error: saveResult.getError().message,
            event: event.getMetadata(),
          },
          'Failed to save auth log entry',
        );
        return;
      }

      this.logger.info(
        {
          userId: event.userId,
          sessionId: event.sessionId,
          refreshCount: event.refreshCount,
        },
        'Token refresh logged successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          event: event.getMetadata(),
        },
        'Failed to handle token refresh event',
      );
    }
  }
}
