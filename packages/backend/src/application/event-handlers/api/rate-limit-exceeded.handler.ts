import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { RateLimitExceeded } from '@/domain/api/events/rate-limit-exceeded.event';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { Logger } from 'pino';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { AuthEvent, EventType } from '@/domain/log/value-objects/auth-event';
import { Provider } from '@/domain/log/value-objects/provider';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { AuthResult } from '@/domain/log/value-objects';

/**
 * レート制限超過イベントのハンドラー
 * セキュリティログへの記録を行う
 */
@injectable()
export class RateLimitExceededHandler implements IEventHandler<RateLimitExceeded> {
  constructor(
    @inject(DI_TOKENS.AuthLogRepository)
    private readonly authLogRepository: IAuthLogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger
  ) {}

  async handle(event: RateLimitExceeded): Promise<void> {
    try {
      this.logger.warn({
        eventId: event.eventId,
        userId: event.userId,
        endpointId: event.endpointId,
        requestCount: event.requestCount,
        rateLimit: event.rateLimit,
      }, 'Handling RateLimitExceeded event');

      // UserIdの作成
      const userIdResult = UserId.create(event.userId);
      if (userIdResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
          error: userIdResult.error,
        }, 'Invalid userId in RateLimitExceeded event');
        return;
      }

      // AuthEvent作成
      const authEvent = new AuthEvent(EventType.RATE_LIMIT_CHECK);
      
      // Provider, IPAddress, UserAgentを作成（メタデータから取得、または適切なデフォルト値を使用）
      const providerResult = Provider.create('api_key'); // API経由のアクセスはapi_keyプロバイダーとして記録
      if (providerResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
          error: providerResult.error,
        }, 'Failed to create Provider');
        return;
      }
      
      const ipAddressResult = IPAddress.create('0.0.0.0'); // デフォルトIP（実際の実装では適切な値を使用）
      if (ipAddressResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
          error: ipAddressResult.error,
        }, 'Failed to create IPAddress');
        return;
      }
      
      const userAgentResult = UserAgent.create('API Rate Limiter'); // デフォルトUA
      if (userAgentResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
          error: userAgentResult.error,
        }, 'Failed to create UserAgent');
        return;
      }

      // セキュリティイベントとして認証ログに記録
      const logEntryResult = AuthLogEntry.create({
        userId: userIdResult.getValue(),
        event: authEvent,
        provider: providerResult.getValue(),
        ipAddress: ipAddressResult.getValue(),
        userAgent: userAgentResult.getValue(),
        timestamp: new Date(),
        result: AuthResult.BLOCKED,
        errorMessage: `Rate limit exceeded: ${event.requestCount}/${event.rateLimit} requests`,
        metadata: {
          endpointId: event.endpointId,
          requestCount: event.requestCount,
          rateLimit: event.rateLimit,
          requestTime: event.requestTime.toISOString(),
          eventId: event.eventId,
          aggregateId: event.aggregateId,
        },
      });

      if (logEntryResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
          error: logEntryResult.error,
        }, 'Failed to create AuthLogEntry for rate limit exceeded');
        return;
      }

      // ログの保存
      const saveResult = await this.authLogRepository.save(logEntryResult.getValue());
      if (saveResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
          error: saveResult.getError(),
        }, 'Failed to save rate limit exceeded log');
        return;
      }

      // 異常なアクセスパターンの検出
      const recentBlocksResult = await this.authLogRepository.findByEventType({
        eventType: EventType.RATE_LIMIT_CHECK,
        userId: userIdResult.getValue(),
        result: AuthResult.BLOCKED,
        limit: 10,
      });

      if (recentBlocksResult.isSuccess && recentBlocksResult.getValue().length >= 5) {
        this.logger.error({
          eventId: event.eventId,
          userId: event.userId,
          blockCount: recentBlocksResult.getValue().length,
        }, 'Multiple rate limit violations detected for user');
      }

      this.logger.info({
        eventId: event.eventId,
        logId: logEntryResult.getValue().id.value,
      }, 'RateLimitExceeded event handled successfully');

    } catch (error) {
      this.logger.error({
        eventId: event.eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error handling RateLimitExceeded event');
      throw error;
    }
  }
}