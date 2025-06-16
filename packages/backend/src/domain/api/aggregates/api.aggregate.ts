import { AggregateRoot } from '@/domain/shared/aggregate-root';
import { APIEndpoint } from '../entities/api-endpoint.entity';
import { EndpointPath } from '../value-objects/endpoint-path';
import { HttpMethod } from '../value-objects/http-method';
import { EndpointType } from '../value-objects/endpoint-type';
import { EndpointId } from '../value-objects/endpoint-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { Result } from '@/domain/shared/result';
import { Guard } from '@/domain/shared/guard';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { APIAccessRequested } from '../events/api-access-requested.event';
import { RateLimitExceeded } from '../events/rate-limit-exceeded.event';
import { InvalidAPIAccess } from '../events/invalid-api-access.event';
import { APIAccessRecorded } from '../events/api-access-recorded.event';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';

export interface APIAggregateProps {
  endpoints: Map<string, APIEndpoint>; // endpointId -> APIEndpoint
  defaultRateLimits: Map<TierLevel, RateLimit>; // tierLevel -> RateLimit
}

export interface RateLimitCheckResult {
  isExceeded: boolean;
  requestCount: number;
  remainingRequests: number;
  retryAfterSeconds?: number;
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

  get defaultRateLimits(): Map<TierLevel, RateLimit> {
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
   * ワイルドカードパターンもサポート
   */
  findEndpointByPathAndMethod(path: EndpointPath, method: HttpMethod): Result<APIEndpoint> {
    // 完全一致を優先
    const exactMatch = Array.from(this.props.endpoints.values()).find(
      (ep) => ep.path.equals(path) && ep.method === method,
    );

    if (exactMatch) {
      return Result.ok(exactMatch);
    }

    // ワイルドカードパターンをチェック
    const wildcardMatch = Array.from(this.props.endpoints.values()).find(
      (ep) => ep.method === method && ep.matchesPath(path),
    );

    if (wildcardMatch) {
      return Result.ok(wildcardMatch);
    }

    return Result.fail(
      DomainError.notFound('ENDPOINT_NOT_FOUND', `Endpoint ${method} ${path.value} not found`),
    );
  }

  /**
   * APIアクセスを処理
   */
  async processAPIAccess(
    userId: UserId,
    path: EndpointPath,
    method: HttpMethod,
    userTier: UserTier,
    requestTime: Date = new Date(),
  ): Promise<Result<RateLimitCheckResult>> {
    // エンドポイントを検索
    const endpointResult = this.findEndpointByPathAndMethod(path, method);
    if (endpointResult.isFailure) {
      // 無効なAPIアクセスイベントを発行
      this.addDomainEvent(
        new InvalidAPIAccess(
          this._id,
          this.getNextEventVersion(),
          userId.value,
          path.value,
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
          this.getNextEventVersion(),
          userId.value,
          path.value,
          'ENDPOINT_INACTIVE',
          requestTime,
        ),
      );
      return Result.fail(
        DomainError.forbidden('ENDPOINT_INACTIVE', 'This endpoint is currently inactive'),
      );
    }

    // 必要なティアレベルをチェック
    if (!this.canAccessEndpoint(endpoint, userTier)) {
      this.addDomainEvent(
        new InvalidAPIAccess(
          this._id,
          this.getNextEventVersion(),
          userId.value,
          path.value,
          'INSUFFICIENT_TIER',
          requestTime,
        ),
      );
      return Result.fail(
        DomainError.forbidden(
          'INSUFFICIENT_TIER',
          `Tier ${userTier.level} cannot access this endpoint`,
        ),
      );
    }

    // APIアクセスリクエストイベントを発行
    this.addDomainEvent(
      new APIAccessRequested(
        this._id,
        this.getNextEventVersion(),
        userId.value,
        endpoint.id.value,
        path.value,
        method,
        endpoint.type,
        requestTime,
      ),
    );

    // パブリックエンドポイントの場合はレート制限をスキップ
    if (endpoint.isPublic) {
      // アクセスを記録
      await endpoint.recordRequest(userId, requestTime);

      // APIアクセス記録イベントを発行
      this.addDomainEvent(
        new APIAccessRecorded(
          this._id,
          this.getNextEventVersion(),
          userId.value,
          endpoint.id.value,
          path.value,
          requestTime,
        ),
      );

      return Result.ok({
        isExceeded: false,
        requestCount: 1,
        remainingRequests: Number.MAX_SAFE_INTEGER,
      });
    }

    // レート制限を取得
    const rateLimit = this.getRateLimitForTier(userTier);
    if (!rateLimit) {
      return Result.fail(
        DomainError.internal(
          'NO_RATE_LIMIT_DEFINED',
          `No rate limit defined for tier ${userTier.level}`,
        ),
      );
    }

    // 初回チェック（現在の状態を確認）
    const initialCheck = endpoint.checkRateLimit(userId, rateLimit, requestTime);

    // レート制限を超えている場合はアクセスを記録せずに拒否
    if (initialCheck.isExceeded) {
      this.addDomainEvent(
        new RateLimitExceeded(
          this._id,
          this.getNextEventVersion(),
          userId.value,
          endpoint.id.value,
          initialCheck.requestCount.count,
          rateLimit.maxRequests,
          requestTime,
        ),
      );

      return Result.ok({
        isExceeded: initialCheck.isExceeded,
        requestCount: initialCheck.requestCount.count,
        remainingRequests: initialCheck.remainingRequests,
        retryAfterSeconds: initialCheck.retryAfterSeconds,
      });
    }

    // レート制限を超えていない場合のみアクセスを記録
    const recordResult = await endpoint.recordRequest(userId, requestTime);
    if (recordResult.isFailure) {
      return Result.fail(recordResult.getError());
    }

    // APIアクセス記録イベントを発行
    this.addDomainEvent(
      new APIAccessRecorded(
        this._id,
        this.getNextEventVersion(),
        userId.value,
        endpoint.id.value,
        path.value,
        requestTime,
      ),
    );

    // 記録後の最新状態を返す
    // Note: checkRateLimitのタイムスタンプを1ms後にすることで、
    // 記録したリクエストが確実にウィンドウ内に含まれるようにする
    const checkTime = new Date(requestTime.getTime() + 1);
    const finalCheck = endpoint.checkRateLimit(userId, rateLimit, checkTime);

    return Result.ok({
      isExceeded: finalCheck.isExceeded,
      requestCount: finalCheck.requestCount.count,
      remainingRequests: finalCheck.remainingRequests,
      retryAfterSeconds: finalCheck.retryAfterSeconds,
    });
  }

  /**
   * エンドポイントへのアクセス権限をチェック
   */
  private canAccessEndpoint(endpoint: APIEndpoint, userTier: UserTier): boolean {
    switch (endpoint.type.value) {
      case 'public':
        return true;
      case 'protected':
        return true; // すべてのティアがアクセス可能
      case 'internal':
        return userTier.level === TierLevel.TIER3; // TIER3のみ
      case 'admin':
        return false; // 通常のティアではアクセス不可
      default:
        return false;
    }
  }

  /**
   * ティアに応じたレート制限を取得
   */
  private getRateLimitForTier(userTier: UserTier): RateLimit | null {
    // まずティアのデフォルトレート制限を使用
    const tierLimit = userTier.rateLimit;

    // 集約で定義されたレート制限があればそちらを優先
    const customLimit = this.props.defaultRateLimits.get(userTier.level);

    return customLimit || tierLimit;
  }

  /**
   * デフォルトレート制限を設定
   */
  setDefaultRateLimit(tierLevel: TierLevel, rateLimit: RateLimit): Result<void> {
    this.props.defaultRateLimits.set(tierLevel, rateLimit);
    return Result.ok();
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

    // プライベートプロパティへのアクセスを回避
    // 統計情報はエンドポイントエンティティにメソッドを追加する必要がある
    // 一旦、基本的な情報のみ返す
    return Result.ok({
      totalRequests: 0,
      uniqueUsers: 0,
      requestsInLastHour: 0,
    });
  }

  /**
   * 現在のイベントバージョンの次のバージョンを取得
   */
  private getNextEventVersion(): number {
    return this._domainEvents.length + 1;
  }

  /**
   * ファクトリメソッド
   */
  static create(props?: Partial<APIAggregateProps>, id?: string): Result<APIAggregate> {
    const defaultProps: APIAggregateProps = {
      endpoints: new Map(),
      defaultRateLimits: new Map([
        [TierLevel.TIER1, new RateLimit(60, 60)],
        [TierLevel.TIER2, new RateLimit(120, 60)],
        [TierLevel.TIER3, new RateLimit(300, 60)],
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
