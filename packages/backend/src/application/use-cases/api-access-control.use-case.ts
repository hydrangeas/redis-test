import { injectable, inject } from 'tsyringe';
import {
  IAPIAccessControlUseCase,
  APIAccessDecision,
  APIAccessMetadata,
} from '@/application/interfaces/api-access-control-use-case.interface';
import { IRateLimitUseCase } from '@/application/interfaces/rate-limit-use-case.interface';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { IAPIAccessControlService } from '@/domain/api/services/api-access-control.service';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import { APIAccessRequested } from '@/domain/api/events/api-access-requested.event';
import { InvalidAPIAccess } from '@/domain/api/events/invalid-api-access.event';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Logger } from 'pino';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { EndpointPath } from '@/domain/api/value-objects/endpoint-path';
import { EndpointType } from '@/domain/api/value-objects/endpoint-type';

/**
 * APIアクセス制御ユースケース
 * 認証、認可、レート制限を統合的に管理し、アクセスログを記録
 */
@injectable()
export class APIAccessControlUseCase implements IAPIAccessControlUseCase {
  constructor(
    @inject(DI_TOKENS.APIAccessControlService)
    private readonly accessControlService: IAPIAccessControlService,
    @inject(DI_TOKENS.RateLimitUseCase)
    private readonly rateLimitUseCase: IRateLimitUseCase,
    @inject(DI_TOKENS.APILogRepository)
    private readonly apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.EventBus)
    private readonly eventBus: IEventBus,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  /**
   * APIアクセスの可否を総合的に判断し、アクセスログを記録
   */
  async checkAndRecordAccess(
    user: AuthenticatedUser,
    endpoint: string,
    method: string,
    metadata?: APIAccessMetadata,
  ): Promise<Result<APIAccessDecision, DomainError>> {
    const startTime = Date.now();

    try {
      // エンドポイントパスの作成
      const endpointPathResult = EndpointPath.create(endpoint);
      if (endpointPathResult.isFailure) {
        await this.recordUnauthorizedAccess(user.userId, endpoint, method, startTime, metadata);
        return Result.ok({
          allowed: false,
          reason: 'endpoint_not_found',
          message: 'Invalid endpoint path',
        });
      }

      // エンドポイントタイプの判定（簡易的な実装）
      const endpointType = this.determineEndpointType(endpoint);

      // 1. 認可チェック（エンドポイントへのアクセス権限）
      const accessCheckResult = this.accessControlService.canAccessEndpoint(
        user,
        endpointPathResult.getValue(),
        endpointType,
      );

      if (accessCheckResult.isFailure || !accessCheckResult.getValue()) {
        await this.recordUnauthorizedAccess(user.userId, endpoint, method, startTime, metadata);
        return Result.ok({
          allowed: false,
          reason: 'unauthorized',
          message: 'Access to this endpoint is not allowed for your tier',
        });
      }

      // 2. レート制限チェック
      const rateLimitResult = await this.rateLimitUseCase.checkAndRecordAccess(
        user,
        endpoint,
        method,
      );

      if (rateLimitResult.isFailure) {
        return Result.fail(rateLimitResult.error);
      }

      const rateLimitStatus = rateLimitResult.getValue();

      // 3. アクセスログの記録
      await this.recordAPIAccess(
        user.userId,
        endpoint,
        method,
        rateLimitStatus.allowed ? 200 : 429,
        startTime,
        metadata,
      );

      // 4. ドメインイベントの発行
      await this.eventBus.publish(
        new APIAccessRequested(
          user.userId.toString(),
          endpoint,
          method,
          new Date(),
          rateLimitStatus.allowed,
        ),
      );

      // レート制限に引っかかった場合
      if (!rateLimitStatus.allowed) {
        await this.eventBus.publish(
          new InvalidAPIAccess(
            user.userId.toString(),
            endpoint,
            method,
            'rate_limit_exceeded',
            new Date(),
          ),
        );

        return Result.ok({
          allowed: false,
          reason: 'rate_limit_exceeded',
          rateLimitStatus,
          message: `Rate limit exceeded. Try again in ${rateLimitStatus.retryAfter} seconds`,
        });
      }

      // アクセス許可
      return Result.ok({
        allowed: true,
        reason: 'authenticated',
        rateLimitStatus,
      });
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: user.userId.toString(),
          endpoint,
          method,
        },
        'Error in API access control',
      );

      return Result.fail(
        DomainError.internal(
          'API_ACCESS_CHECK_ERROR',
          'Failed to check API access',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * 公開エンドポイントへのアクセスを記録
   */
  async recordPublicAccess(
    endpoint: string,
    method: string,
    metadata?: APIAccessMetadata,
  ): Promise<Result<void, DomainError>> {
    const startTime = Date.now();

    try {
      // 公開エンドポイントへのアクセスログを記録
      await this.recordAPIAccess(undefined, endpoint, method, 200, startTime, metadata);

      return Result.ok(undefined as any);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint,
          method,
        },
        'Error recording public access',
      );

      return Result.fail(
        DomainError.internal(
          'PUBLIC_ACCESS_RECORD_ERROR',
          'Failed to record public access',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  /**
   * APIアクセスログを記録
   */
  private async recordAPIAccess(
    userId: UserId | undefined,
    endpoint: string,
    method: string,
    statusCode: number,
    startTime: number,
    metadata?: APIAccessMetadata,
  ): Promise<void> {
    const responseTime = Date.now() - startTime;

    // 簡略化: 現時点ではログ記録の詳細実装を省略
    // TODO: APILogEntryの正しい作成方法を実装する
    this.logger.info(
      {
        userId: userId?.toString(),
        endpoint,
        method,
        statusCode,
        responseTime,
        metadata,
      },
      'API access logged',
    );
  }

  /**
   * 認可されていないアクセスを記録
   */
  private async recordUnauthorizedAccess(
    userId: UserId,
    endpoint: string,
    method: string,
    startTime: number,
    metadata?: APIAccessMetadata,
  ): Promise<void> {
    await this.recordAPIAccess(userId, endpoint, method, 403, startTime, metadata);

    await this.eventBus.publish(
      new InvalidAPIAccess(userId.toString(), endpoint, method, 'unauthorized', new Date()),
    );
  }

  /**
   * エンドポイントタイプを判定（簡易的な実装）
   */
  private determineEndpointType(endpoint: string): EndpointType {
    // 公開エンドポイントのパターン
    const publicPatterns = ['/health', '/api-docs', '/openapi.json'];
    const isPublic = publicPatterns.some((pattern) => endpoint.startsWith(pattern));

    const typeResult = EndpointType.create(isPublic ? 'public' : 'protected');
    return typeResult.isSuccess
      ? typeResult.getValue()
      : EndpointType.create('protected').getValue();
  }
}
