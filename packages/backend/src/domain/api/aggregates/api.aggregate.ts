import { AggregateRoot } from '@/domain/shared/aggregate-root';
import { APIEndpoint } from '../value-objects/api-endpoint';
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
import { InvalidAPIAccess } from '../events/invalid-api-access.event';

export interface APIAggregateProps {
  endpoints: Map<string, APIEndpoint>; // "path:method" -> APIEndpoint
  defaultRateLimits: Map<string, RateLimit>; // tierLevel -> RateLimit
}

/**
 * API集約
 * APIエンドポイントの定義を管理する集約ルート
 * レート制限の実際の管理はRateLimiting集約に委譲
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
   * エンドポイントのキーを生成
   */
  private getEndpointKey(path: EndpointPath, method: HttpMethod): string {
    return `${path.value}:${method}`;
  }

  /**
   * エンドポイントを追加
   */
  addEndpoint(endpoint: APIEndpoint): Result<void> {
    const guardResult = Guard.againstNullOrUndefined(endpoint, 'endpoint');
    if (!guardResult.succeeded) {
      return Result.fail(
        DomainError.validation('INVALID_ENDPOINT', guardResult.message)
      );
    }

    const key = this.getEndpointKey(endpoint.path, endpoint.method);

    // 既存のエンドポイントかチェック
    if (this.props.endpoints.has(key)) {
      return Result.fail(
        DomainError.businessRule(
          'ENDPOINT_ALREADY_EXISTS',
          `Endpoint ${endpoint.path.value} ${endpoint.method} already exists`
        )
      );
    }

    this.props.endpoints.set(key, endpoint);
    return Result.ok();
  }

  /**
   * エンドポイントを削除
   */
  removeEndpoint(path: EndpointPath, method: HttpMethod): Result<void> {
    const key = this.getEndpointKey(path, method);
    
    if (!this.props.endpoints.has(key)) {
      return Result.fail(
        DomainError.notFound(
          'ENDPOINT_NOT_FOUND',
          `Endpoint ${path.value} ${method} not found`
        )
      );
    }

    this.props.endpoints.delete(key);
    return Result.ok();
  }

  /**
   * エンドポイントを取得
   */
  getEndpoint(path: EndpointPath, method: HttpMethod): Result<APIEndpoint> {
    const key = this.getEndpointKey(path, method);
    const endpoint = this.props.endpoints.get(key);

    if (!endpoint) {
      return Result.fail(
        DomainError.notFound(
          'ENDPOINT_NOT_FOUND',
          `Endpoint ${method} ${path.value} not found`
        )
      );
    }

    return Result.ok(endpoint);
  }

  /**
   * パスとメソッドに一致するエンドポイントを検索
   * ワイルドカードパターンもサポート
   */
  findMatchingEndpoint(
    path: EndpointPath,
    method: HttpMethod
  ): Result<APIEndpoint> {
    // 完全一致を優先
    const exactMatch = this.getEndpoint(path, method);
    if (exactMatch.isSuccess) {
      return exactMatch;
    }

    // ワイルドカードパターンをチェック
    for (const [_, endpoint] of this.props.endpoints) {
      if (endpoint.method === method && endpoint.matchesPath(path)) {
        return Result.ok(endpoint);
      }
    }

    return Result.fail(
      DomainError.notFound(
        'ENDPOINT_NOT_FOUND',
        `No endpoint found matching ${method} ${path.value}`
      )
    );
  }

  /**
   * エンドポイントアクセスを検証
   * 実際のレート制限チェックはRateLimiting集約で行う
   */
  validateEndpointAccess(
    userId: UserId,
    path: EndpointPath,
    method: HttpMethod,
    userTier: UserTier,
    requestTime: Date = new Date()
  ): Result<{ endpoint: APIEndpoint; rateLimit: RateLimit | null }> {
    // エンドポイントを検索
    const endpointResult = this.findMatchingEndpoint(path, method);
    if (endpointResult.isFailure) {
      // 無効なAPIアクセスイベントを発行
      this.addDomainEvent(
        new InvalidAPIAccess(
          this._id,
          1,
          userId.value,
          path.value,
          'ENDPOINT_NOT_FOUND',
          requestTime
        )
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
          path.value,
          'ENDPOINT_INACTIVE',
          requestTime
        )
      );
      return Result.fail(
        DomainError.forbidden(
          'ENDPOINT_INACTIVE',
          'This endpoint is currently inactive'
        )
      );
    }

    // 必要なティアレベルをチェック
    if (!endpoint.canAccessWithTier(userTier)) {
      this.addDomainEvent(
        new InvalidAPIAccess(
          this._id,
          1,
          userId.value,
          path.value,
          'INSUFFICIENT_TIER',
          requestTime
        )
      );
      return Result.fail(
        DomainError.forbidden(
          'INSUFFICIENT_TIER',
          `Tier ${userTier.level} cannot access this endpoint`
        )
      );
    }

    // APIアクセスイベントを発行
    this.addDomainEvent(
      new APIAccessRequested(
        this._id,
        1,
        userId.value,
        path.value,
        path.value,
        method,
        endpoint.type,
        requestTime
      )
    );

    // パブリックエンドポイントの場合はレート制限なし
    if (endpoint.isPublic) {
      return Result.ok({ endpoint, rateLimit: null });
    }

    // レート制限を取得
    const rateLimit = this.props.defaultRateLimits.get(userTier.level);
    if (!rateLimit) {
      return Result.fail(
        DomainError.internal(
          'NO_RATE_LIMIT_DEFINED',
          `No rate limit defined for tier ${userTier.level}`
        )
      );
    }

    return Result.ok({ endpoint, rateLimit });
  }

  /**
   * デフォルトレート制限を設定
   */
  setDefaultRateLimit(tier: UserTier, rateLimit: RateLimit): Result<void> {
    this.props.defaultRateLimits.set(tier.level, rateLimit);
    return Result.ok();
  }

  /**
   * ファクトリメソッド
   */
  static create(
    props?: Partial<APIAggregateProps>,
    id?: string
  ): Result<APIAggregate> {
    const defaultProps: APIAggregateProps = {
      endpoints: new Map(),
      defaultRateLimits: new Map(),
      ...props,
    };

    return Result.ok(new APIAggregate(defaultProps, id));
  }

  /**
   * 既存データから再構築
   */
  static reconstitute(
    props: APIAggregateProps,
    id: string
  ): APIAggregate {
    return new APIAggregate(props, id);
  }
}