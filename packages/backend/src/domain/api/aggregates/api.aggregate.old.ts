import { AggregateRoot } from '@/domain/shared/aggregate-root';
import { APIEndpoint } from '../value-objects/api-endpoint';
import { RateLimitLog } from '../entities/rate-limit-log.entity';
import { EndpointId } from '../value-objects/endpoint-id';
import { EndpointPath } from '../value-objects/endpoint-path';
import { HttpMethod } from '../value-objects/http-method';
import { EndpointType } from '../value-objects/endpoint-type';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { Result } from '@/domain/errors/result';
import { Guard } from '@/domain/shared/guard';
import { DomainError } from '@/domain/errors/domain-error';
import { APIAccessRequested } from '../events/api-access-requested.event';
import { RateLimitExceeded } from '../events/rate-limit-exceeded.event';
import { InvalidAPIAccess } from '../events/invalid-api-access.event';
import { RateLimitWindow } from '../value-objects/rate-limit-window';
import { RequestCount } from '../value-objects/request-count';

export interface APIAggregateProps {
  endpoints: Map<string, APIEndpoint>; // endpointId -> APIEndpoint
  defaultRateLimits: Map<string, RateLimit>; // tierLevel -> RateLimit
}

/**
 * API集約
 * APIエンドポイントとレート制限を管理する集約ルート
 */
export class APIAggregate extends AggregateRoot<APIAggregateProps> {
  private constructor(props: APIAggregateProps, id?: string) {
    super(props, id);
  }

  get endpoints(): Map<string, APIEndpoint> {
    return this.props.endpoints;
  }

  get defaultRateLimits(): Map<string, RateLimit> {
    return this.props.defaultRateLimits;
  }

  /**
   * エンドポイントを追加
   */
  addEndpoint(endpoint: APIEndpoint): Result<void> {
    const guardResult = Guard.againstNullOrUndefined(endpoint, 'endpoint');
    if (!guardResult.succeeded) {
      return Result.fail(DomainError.validation('INVALID_ENDPOINT', guardResult.message));
    }

    // 既存のエンドポイントかチェック
    if (this.props.endpoints.has(endpoint.id.value)) {
      return Result.fail(
        DomainError.businessRule(
          'ENDPOINT_ALREADY_EXISTS',
          `Endpoint ${endpoint.id.value} already exists`,
        ),
      );
    }

    // 同じパスとメソッドの組み合わせが存在しないかチェック
    const duplicate = Array.from(this.props.endpoints.values()).find(
      (ep) => ep.path.equals(endpoint.path) && ep.method === endpoint.method,
    );
    if (duplicate) {
      return Result.fail(
        DomainError.businessRule(
          'DUPLICATE_ENDPOINT',
          `Endpoint with path ${endpoint.path.value} and method ${endpoint.method} already exists`,
        ),
      );
    }

    this.props.endpoints.set(endpoint.id.value, endpoint);
    return Result.ok();
  }

  /**
   * エンドポイントを削除
   */
  removeEndpoint(endpointId: EndpointId): Result<void> {
    if (!this.props.endpoints.has(endpointId.value)) {
      return Result.fail(
        DomainError.notFound('ENDPOINT_NOT_FOUND', `Endpoint ${endpointId.value} not found`),
      );
    }

    this.props.endpoints.delete(endpointId.value);
    return Result.ok();
  }

  /**
   * エンドポイントを取得
   */
  getEndpoint(endpointId: EndpointId): Result<APIEndpoint> {
    const endpoint = this.props.endpoints.get(endpointId.value);
    if (!endpoint) {
      return Result.fail(
        DomainError.notFound('ENDPOINT_NOT_FOUND', `Endpoint ${endpointId.value} not found`),
      );
    }

    return Result.ok(endpoint);
  }

  /**
   * パスとメソッドからエンドポイントを検索
   */
  findEndpointByPathAndMethod(path: EndpointPath, method: HttpMethod): Result<APIEndpoint> {
    const endpoint = Array.from(this.props.endpoints.values()).find(
      (ep) => ep.path.equals(path) && ep.method === method,
    );

    if (!endpoint) {
      return Result.fail(
        DomainError.notFound('ENDPOINT_NOT_FOUND', `Endpoint ${method} ${path.value} not found`),
      );
    }

    return Result.ok(endpoint);
  }

  /**
   * APIアクセスを処理
   */
  async processAPIAccess(
    userId: UserId,
    endpointId: EndpointId,
    userTier: UserTier,
    requestTime: Date = new Date(),
  ): Promise<Result<RateLimitCheckResult>> {
    // エンドポイントを取得
    const endpointResult = this.getEndpoint(endpointId);
    if (endpointResult.isFailure) {
      // 無効なAPIアクセスイベントを発行
      this.addDomainEvent(
        new InvalidAPIAccess(
          this._id,
          1,
          userId.value,
          endpointId.value,
          'ENDPOINT_NOT_FOUND',
          requestTime,
        ),
      );
      return Result.fail(endpointResult.getError());
    }

    const endpoint = endpointResult.getValue();

    // エンドポイントがアクティブかチェック
    if (!endpoint.isActive) {
      this.addDomainEvent(
        new InvalidAPIAccess(
          this._id,
          1,
          userId.value,
          endpointId.value,
          'ENDPOINT_INACTIVE',
          requestTime,
        ),
      );
      return Result.fail(
        DomainError.forbidden('ENDPOINT_INACTIVE', 'This endpoint is currently inactive'),
      );
    }

    // パブリックエンドポイントの場合はレート制限をスキップ
    if (endpoint.isPublic) {
      // APIアクセスイベントを発行
      this.addDomainEvent(
        new APIAccessRequested(
          this._id,
          1,
          userId.value,
          endpointId.value,
          endpoint.path.value,
          endpoint.method,
          endpoint.type,
          requestTime,
        ),
      );

      return Result.ok({
        isExceeded: false,
        requestCount: RequestCount.create(0).getValue(),
        remainingRequests: Number.MAX_SAFE_INTEGER,
      });
    }

    // レート制限を取得
    const rateLimitResult = endpoint.getRateLimitForTier(userTier);
    if (rateLimitResult.isFailure) {
      // デフォルトのレート制限を使用
      const defaultLimit = this.props.defaultRateLimits.get(userTier.level);
      if (!defaultLimit) {
        return Result.fail(
          DomainError.internal(
            'NO_RATE_LIMIT_DEFINED',
            `No rate limit defined for tier ${userTier.level}`,
          ),
        );
      }
    }

    const rateLimit = rateLimitResult.isSuccess
      ? rateLimitResult.getValue()
      : this.props.defaultRateLimits.get(userTier.level)!;

    // レート制限チェック
    const checkResult = endpoint.checkRateLimit(userId, rateLimit, requestTime);

    // APIアクセスイベントを発行
    this.addDomainEvent(
      new APIAccessRequested(
        this._id,
        1,
        userId.value,
        endpointId.value,
        endpoint.path.value,
        endpoint.method,
        endpoint.type,
        requestTime,
      ),
    );

    // レート制限を超えている場合
    if (checkResult.isExceeded) {
      this.addDomainEvent(
        new RateLimitExceeded(
          this._id,
          1,
          userId.value,
          endpointId.value,
          checkResult.requestCount.value,
          rateLimit.maxRequests,
          requestTime,
        ),
      );
    } else {
      // レート制限ログを追加
      const logResult = await endpoint.addRateLimitLog(userId, requestTime);
      if (logResult.isFailure) {
        return Result.fail(logResult.getError());
      }
    }

    return Result.ok(checkResult);
  }

  /**
   * ユーザーのレート制限ログをクリーンアップ
   */
  async cleanupUserLogs(
    userId: UserId,
    retentionPeriodMinutes: number = 60,
  ): Promise<Result<number>> {
    let totalCleaned = 0;
    const cutoffTime = new Date(Date.now() - retentionPeriodMinutes * 60 * 1000);

    for (const endpoint of this.props.endpoints.values()) {
      const cleanedResult = await endpoint.cleanupLogsForUser(userId, cutoffTime);
      if (cleanedResult.isSuccess) {
        totalCleaned += cleanedResult.getValue();
      }
    }

    return Result.ok(totalCleaned);
  }

  /**
   * すべてのエンドポイントのレート制限ログをクリーンアップ
   */
  async cleanupAllLogs(retentionPeriodMinutes: number = 60): Promise<Result<number>> {
    let totalCleaned = 0;
    const cutoffTime = new Date(Date.now() - retentionPeriodMinutes * 60 * 1000);

    for (const endpoint of this.props.endpoints.values()) {
      const cleanedResult = await endpoint.cleanupAllLogs(cutoffTime);
      if (cleanedResult.isSuccess) {
        totalCleaned += cleanedResult.getValue();
      }
    }

    return Result.ok(totalCleaned);
  }

  /**
   * エンドポイントの統計情報を取得
   */
  getEndpointStatistics(endpointId: EndpointId): Result<{
    totalRequests: number;
    uniqueUsers: number;
    requestsInLastHour: number;
  }> {
    const endpointResult = this.getEndpoint(endpointId);
    if (endpointResult.isFailure) {
      return Result.fail(endpointResult.getError());
    }

    const endpoint = endpointResult.getValue();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    let totalRequests = 0;
    const uniqueUsers = new Set<string>();
    let requestsInLastHour = 0;

    endpoint.props.rateLimitLogs.forEach((logs, userId) => {
      uniqueUsers.add(userId);
      logs.forEach((log) => {
        totalRequests++;
        if (log.timestamp.getTime() >= oneHourAgo.getTime()) {
          requestsInLastHour++;
        }
      });
    });

    return Result.ok({
      totalRequests,
      uniqueUsers: uniqueUsers.size,
      requestsInLastHour,
    });
  }

  /**
   * ファクトリメソッド
   */
  static create(props?: Partial<APIAggregateProps>, id?: string): Result<APIAggregate> {
    const defaultProps: APIAggregateProps = {
      endpoints: new Map(),
      defaultRateLimits: new Map([
        ['TIER1', new RateLimit(60, 60)],
        ['TIER2', new RateLimit(120, 60)],
        ['TIER3', new RateLimit(300, 60)],
      ]),
    };

    const aggregateProps = {
      ...defaultProps,
      ...props,
    };

    return Result.ok(new APIAggregate(aggregateProps, id));
  }

  /**
   * 既存のデータから再構築
   */
  static reconstitute(props: APIAggregateProps, id: string): APIAggregate {
    return new APIAggregate(props, id);
  }
}
