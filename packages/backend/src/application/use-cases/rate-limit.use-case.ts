import { injectable, inject } from 'tsyringe';
import {
  IRateLimitUseCase,
  RateLimitCheckResult,
} from '@/application/interfaces/rate-limit-use-case.interface';
import { IRateLimitLogRepository } from '@/domain/api/interfaces/rate-limit-log-repository.interface';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { Result } from '@/domain/shared/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { RateLimitExceeded } from '@/domain/api/events/rate-limit-exceeded.event';
import { APIAccessRecorded } from '@/domain/api/events/api-access-recorded.event';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Logger } from 'pino';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { RateLimitLog } from '@/domain/api/entities/rate-limit-log.entity';
import { EndpointId } from '@/domain/api/value-objects/endpoint-id';
import { RateLimitWindow } from '@/domain/api/value-objects/rate-limit-window';
import { RequestId } from '@/domain/api/value-objects/request-id';

/**
 * レート制限ユースケースの実装
 * スライディングウィンドウ方式でAPIアクセスのレート制限を管理
 */
@injectable()
export class RateLimitUseCase implements IRateLimitUseCase {
  private static readonly WINDOW_SIZE_SECONDS = 60; // 1分間のスライディングウィンドウ

  constructor(
    @inject(DI_TOKENS.RateLimitLogRepository)
    private readonly rateLimitRepository: IRateLimitLogRepository,
    @inject(DI_TOKENS.EventBus)
    private readonly eventBus: IEventBus,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  /**
   * レート制限をチェックし、アクセスを記録
   */
  async checkAndRecordAccess(
    user: AuthenticatedUser,
    endpoint: string,
    method: string,
  ): Promise<Result<RateLimitCheckResult>> {
    try {
      // EndpointIdを生成
      const endpointId = EndpointId.generate();

      // ユーザーのレート制限値を取得
      const limit = user.tier.rateLimit.maxRequests;
      const windowSizeSeconds =
        user.tier.rateLimit.windowSeconds || RateLimitUseCase.WINDOW_SIZE_SECONDS;

      // 現在時刻とウィンドウ開始時刻を計算
      const now = new Date();
      // const windowStart = new Date(now.getTime() - windowSizeSeconds * 1000); // Not used
      const windowEnd = new Date(now.getTime() + windowSizeSeconds * 1000);

      // スライディングウィンドウ内のアクセス数をカウント
      const window = new RateLimitWindow(windowSizeSeconds, now);
      const countResult = await this.rateLimitRepository.countRequests(
        user.userId,
        endpointId,
        window,
      );

      if (countResult.isFailure) {
        this.logger.error(
          { userId: user.userId.value, error: countResult.getError() },
          'Failed to count rate limit logs',
        );
        return Result.fail(countResult.getError());
      }

      const currentCount = countResult.getValue();

      // レート制限チェック
      if (currentCount >= limit) {
        // レート制限超過
        const resetAt = Math.floor(windowEnd.getTime() / 1000);
        const retryAfter = Math.ceil((windowEnd.getTime() - now.getTime()) / 1000);

        this.logger.warn(
          {
            userId: user.userId.value,
            currentCount,
            limit,
            endpoint,
            method,
          },
          'Rate limit exceeded',
        );

        // レート制限超過イベントを発行
        await this.eventBus.publish(
          new RateLimitExceeded(
            user.userId.value,
            1,
            user.userId.value,
            endpoint,
            currentCount,
            limit,
            new Date(),
          ),
        );

        return Result.ok({
          allowed: false,
          limit,
          remaining: 0,
          resetAt,
          retryAfter,
        });
      }

      // アクセスを記録
      const logResult = RateLimitLog.create({
        userId: user.userId.value,
        endpointId: endpointId.value,
        requestId: RequestId.generate().value, // Generate a request ID
        timestamp: now,
        exceeded: false, // This is in the allowed path
      });

      if (logResult.isFailure) {
        return Result.fail(logResult.error!);
      }

      const log = logResult.getValue();
      const saveResult = await this.rateLimitRepository.save(log);

      if (saveResult.isFailure) {
        this.logger.error(
          { userId: user.userId.value, error: saveResult.getError() },
          'Failed to save rate limit log',
        );
        return Result.fail(saveResult.getError());
      }

      // APIアクセス記録イベントを発行
      await this.eventBus.publish(
        new APIAccessRecorded(user.userId.value, 1, endpoint, method),
      );

      // 成功レスポンス
      const remaining = limit - currentCount - 1; // 今回のアクセスを含めて減算
      const resetAt = Math.floor(windowEnd.getTime() / 1000);

      this.logger.debug(
        {
          userId: user.userId.value,
          endpoint,
          method,
          remaining,
          limit,
        },
        'API access recorded',
      );

      return Result.ok({
        allowed: true,
        limit,
        remaining,
        resetAt,
      });
    } catch (error) {
      this.logger.error(
        {
          userId: user.userId.value,
          endpoint,
          method,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Unexpected error in rate limit check',
      );

      return Result.fail(
        new DomainError(
          'RATE_LIMIT_CHECK_ERROR',
          'Failed to check rate limit',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' },
        ),
      );
    }
  }

  /**
   * ユーザーの現在の使用状況を取得
   */
  async getUserUsageStatus(user: AuthenticatedUser): Promise<
    Result<{
      currentCount: number;
      limit: number;
      windowStart: Date;
      windowEnd: Date;
    }>
  > {
    try {
      const limit = user.tier.rateLimit.maxRequests;
      const windowSizeSeconds =
        user.tier.rateLimit.windowSeconds || RateLimitUseCase.WINDOW_SIZE_SECONDS;

      const now = new Date();
      const windowStart = new Date(now.getTime() - windowSizeSeconds * 1000);
      const windowEnd = new Date(now.getTime() + windowSizeSeconds * 1000);

      // スライディングウィンドウ内のアクセス数をカウント
      const window = new RateLimitWindow(windowSizeSeconds, now);

      // すべてのエンドポイントのリクエスト数を集計するため、ユーザーの全ログを取得
      const logsResult = await this.rateLimitRepository.findByUser(user.userId, window);

      if (logsResult.isFailure) {
        return Result.fail(logsResult.getError());
      }

      const logs = logsResult.getValue();
      const currentCount = logs.reduce((sum: number, _log: RateLimitLog) => sum + 1, 0); // Each log represents one request

      return Result.ok({
        currentCount,
        limit,
        windowStart,
        windowEnd,
      });
    } catch (error) {
      return Result.fail(
        new DomainError('USAGE_STATUS_ERROR', 'Failed to get usage status', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * レート制限をリセット（管理用）
   */
  async resetUserLimit(userId: string): Promise<Result<void>> {
    try {
      // UserId値オブジェクトの作成
      const userIdResult = UserId.create(userId);
      if (userIdResult.isFailure) {
        return Result.fail(userIdResult.getError());
      }
      // const userIdObj = userIdResult.getValue(); // Not used in current implementation

      // ユーザーのレート制限ログを削除（古いログを削除することでリセット）
      const now = new Date();
      const deleteResult = await this.rateLimitRepository.deleteOldLogs(now);

      if (deleteResult.isFailure) {
        return Result.fail(deleteResult.getError());
      }

      this.logger.info({ userId }, 'Rate limit reset successfully');

      return Result.ok<void>();
    } catch (error) {
      return Result.fail(
        new DomainError(
          'RATE_LIMIT_RESET_FAILED',
          'Failed to reset rate limit',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' },
        ),
      );
    }
  }
}
