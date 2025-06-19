import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { IRateLimitService } from '@/domain/api/interfaces/rate-limit-service.interface';
import { ApiPath } from '@/domain/api/value-objects/api-path';
import { Endpoint as APIEndpoint } from '@/domain/api/value-objects/endpoint';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { IOpenDataRepository } from '@/domain/data/interfaces/open-data-repository.interface';
import { DataPath } from '@/domain/data/value-objects/data-path';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { RequestInfo } from '@/domain/log/value-objects/request-info';
import { ResponseInfo } from '@/domain/log/value-objects/response-info';
import { Result } from '@/domain/shared/result';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

interface DataAccessRequest {
  path: string;
  user: AuthenticatedUser;
  ipAddress: string;
  userAgent?: string;
}

interface DataAccessResponse {
  content: unknown;
  etag: string;
  lastModified: Date;
  size: number;
}

@injectable()
export class DataAccessUseCase {
  constructor(
    @inject(DI_TOKENS.OpenDataRepository)
    private readonly dataRepository: IOpenDataRepository,
    @inject(DI_TOKENS.RateLimitService)
    private readonly rateLimitService: IRateLimitService,
    @inject(DI_TOKENS.APILogRepository)
    private readonly apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async getData(request: DataAccessRequest): Promise<Result<DataAccessResponse>> {
    const startTime = Date.now();

    try {
      // 1. パスの検証
      const dataPathResult = DataPath.create(request.path);
      if (dataPathResult.isFailure) {
        return Result.fail(dataPathResult.getError());
      }
      const dataPath = dataPathResult.getValue();

      // 2. APIエンドポイントの作成
      const endpoint = new APIEndpoint(HttpMethod.GET, new ApiPath(`/data/${request.path}`));

      // 3. レート制限チェック
      const rateLimitResult = await this.rateLimitService.checkLimit(request.user, endpoint);

      if (!rateLimitResult.allowed) {
        await this.logApiAccess({
          request,
          endpoint,
          statusCode: 429,
          responseTime: Date.now() - startTime,
          error: 'RATE_LIMIT_EXCEEDED',
        });

        return Result.fail(
          new DomainError(
            'RATE_LIMIT_EXCEEDED',
            `API rate limit exceeded for ${request.user.tier.level}`,
            ErrorType.RATE_LIMIT,
            {
              limit: rateLimitResult.limit,
              remaining: rateLimitResult.remaining,
              reset: rateLimitResult.resetAt.getTime() / 1000,
              retryAfter: rateLimitResult.retryAfter,
            },
          ),
        );
      }

      // 4. データの取得
      const dataResult = await this.dataRepository.findByPath(dataPath);

      if (dataResult.isFailure) {
        await this.logApiAccess({
          request,
          endpoint,
          statusCode: 404,
          responseTime: Date.now() - startTime,
          error: dataResult.getError() instanceof DomainError ? (dataResult.getError()).code : 'UNKNOWN_ERROR',
        });

        return Result.fail(dataResult.getError());
      }

      const openDataResource = dataResult.getValue();

      // 5. アクセス権限のチェック（将来の拡張用）
      if (!this.canAccessResource(request.user, openDataResource)) {
        await this.logApiAccess({
          request,
          endpoint,
          statusCode: 403,
          responseTime: Date.now() - startTime,
          error: 'ACCESS_DENIED',
        });

        return Result.fail(
          new DomainError('ACCESS_DENIED', 'Access denied to this resource', ErrorType.FORBIDDEN),
        );
      }

      // 6. データ内容の取得
      const contentResult = await this.dataRepository.getContent(openDataResource);

      if (contentResult.isFailure) {
        await this.logApiAccess({
          request,
          endpoint,
          statusCode: 500,
          responseTime: Date.now() - startTime,
          error: contentResult.getError() instanceof DomainError ? (contentResult.getError()).code : 'UNKNOWN_ERROR',
        });

        return Result.fail(contentResult.getError());
      }

      const content = contentResult.getValue();
      const responseTime = Date.now() - startTime;

      // 7. 成功ログの記録
      await this.logApiAccess({
        request,
        endpoint,
        statusCode: 200,
        responseTime,
        responseSize: openDataResource.metadata.size,
      });

      // 8. レート制限の記録
      await this.rateLimitService.recordUsage(request.user, endpoint);

      this.logger.info(
        {
          userId: request.user.userId.value,
          tier: request.user.tier.level,
          path: request.path,
          responseTime,
          size: openDataResource.metadata.size,
        },
        'Data access successful',
      );

      return Result.ok({
        content,
        etag: openDataResource.metadata.etag,
        lastModified: openDataResource.metadata.lastModified,
        size: openDataResource.metadata.size,
      });
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          userId: request.user.userId.value,
          path: request.path,
        },
        'Unexpected error in data access',
      );

      await this.logApiAccess({
        request,
        endpoint: new APIEndpoint(HttpMethod.GET, new ApiPath(`/data/${request.path}`)),
        statusCode: 500,
        responseTime: Date.now() - startTime,
        error: 'INTERNAL_ERROR',
      });

      return Result.fail(
        new DomainError('INTERNAL_ERROR', 'An unexpected error occurred', ErrorType.INTERNAL),
      );
    }
  }

  private canAccessResource(_user: AuthenticatedUser, _resource: unknown): boolean {
    // 将来的にリソースレベルのアクセス制御を実装
    // 現在はすべての認証済みユーザーがアクセス可能
    return true;
  }

  private async logApiAccess(params: {
    request: DataAccessRequest;
    endpoint: APIEndpoint;
    statusCode: number;
    responseTime: number;
    responseSize?: number;
    error?: string;
  }): Promise<void> {
    try {
      const logEntryResult = APILogEntry.create({
        userId: params.request.user.userId,
        endpoint: params.endpoint,
        requestInfo: new RequestInfo({
          ipAddress: params.request.ipAddress,
          userAgent: params.request.userAgent || 'Unknown',
          headers: {},
          body: null,
        }),
        responseInfo: new ResponseInfo({
          statusCode: params.statusCode,
          responseTime: params.responseTime,
          size: params.responseSize || 0,
          headers: {},
        }),
        timestamp: new Date(),
        error: params.error,
      });

      if (logEntryResult.isFailure) {
        this.logger.error(
          { error: logEntryResult.getError() },
          'Failed to create API log entry',
        );
        return;
      }

      await this.apiLogRepository.save(logEntryResult.getValue());
    } catch (error) {
      // ログ記録の失敗はメイン処理に影響させない
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to log API access',
      );
    }
  }
}
