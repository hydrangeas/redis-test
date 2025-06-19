import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { Result } from '@/domain/errors/result';
import { Entity } from '@/domain/shared/entity';

import { RateLimitLog } from './rate-limit-log.entity';
import { EndpointId } from '../value-objects/endpoint-id';
import { EndpointPath } from '../value-objects/endpoint-path';
import { RateLimitWindow } from '../value-objects/rate-limit-window';
import { RequestCount } from '../value-objects/request-count';

import type { EndpointType } from '../value-objects/endpoint-type';
import type { HttpMethod } from '../value-objects/http-method';
import type { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import type { UserId } from '@/domain/auth/value-objects/user-id';


export interface APIEndpointProps {
  path: EndpointPath;
  method: HttpMethod;
  type: EndpointType;
  description?: string;
  isActive: boolean;
  rateLimitLogs: Map<string, RateLimitLog[]>; // userId -> logs
}

export interface RateLimitCheckResult {
  isExceeded: boolean;
  requestCount: RequestCount;
  remainingRequests: number;
  retryAfterSeconds?: number;
}

export interface CreateAPIEndpointProps {
  path: string;
  method: HttpMethod;
  type: EndpointType;
  description?: string;
  isActive?: boolean;
}

export class APIEndpoint extends Entity<APIEndpointProps> {
  private constructor(props: APIEndpointProps, id?: EndpointId) {
    super(props, id);
  }

  get id(): EndpointId {
    return this._id as EndpointId;
  }

  get path(): EndpointPath {
    return this.props.path;
  }

  get method(): HttpMethod {
    return this.props.method;
  }

  get type(): EndpointType {
    return this.props.type;
  }

  get isPublic(): boolean {
    return this.props.type.isPublic();
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  /**
   * エンドポイントパスがこのエンドポイントにマッチするかチェック
   */
  matchesPath(path: EndpointPath): boolean {
    return this.props.path.matches(path.value);
  }

  /**
   * レート制限をチェック（スライディングウィンドウ方式）
   */
  checkRateLimit(
    userId: UserId,
    rateLimit: RateLimit,
    currentTime: Date = new Date(),
  ): RateLimitCheckResult {
    const userLogs = this.props.rateLimitLogs.get(userId.value) || [];
    const window = new RateLimitWindow(rateLimit.windowSeconds, currentTime);

    // ウィンドウ内のリクエストをカウント
    const requestsInWindow = userLogs.filter((log) => window.contains(log.timestamp));

    const requestCount = new RequestCount(requestsInWindow.length);
    const isExceeded = requestCount.exceeds(rateLimit.maxRequests);
    const remainingRequests = Math.max(0, rateLimit.maxRequests - requestCount.count);

    let retryAfterSeconds: number | undefined;
    if (isExceeded && requestsInWindow.length > 0) {
      // 最も古いリクエストがウィンドウから出るまでの時間
      const oldestRequest = requestsInWindow[0];
      retryAfterSeconds = window.getSecondsUntilExpires(oldestRequest.timestamp);
    }

    return {
      isExceeded,
      requestCount,
      remainingRequests,
      retryAfterSeconds,
    };
  }

  /**
   * アクセスログを記録
   */
  recordAccess(
    userId: UserId,
    requestId: string,
    currentTime: Date = new Date(),
  ): Result<void> {
    const userLogs = this.props.rateLimitLogs.get(userId.value) || [];

    // 新しいログエントリを作成
    const newLogResult = RateLimitLog.create({
      userId: userId.value,
      endpointId: this.id.value,
      requestId,
      timestamp: currentTime,
    });

    if (newLogResult.isFailure) {
      return Result.fail(
        new DomainError(
          'FAILED_TO_CREATE_LOG',
          'Failed to create rate limit log',
          ErrorType.INTERNAL,
        ),
      );
    }

    // ログを追加（新しいものを後ろに）
    userLogs.push(newLogResult.getValue());
    this.props.rateLimitLogs.set(userId.value, userLogs);

    return Result.ok(undefined);
  }

  /**
   * 古いログをクリーンアップ
   */
  cleanupOldLogs(maxAgeSeconds: number, currentTime: Date = new Date()): void {
    const cutoffTime = new Date(currentTime.getTime() - maxAgeSeconds * 1000);

    // 各ユーザーのログをクリーンアップ
    for (const [userId, logs] of this.props.rateLimitLogs.entries()) {
      const filteredLogs = logs.filter((log) => log.timestamp > cutoffTime);

      if (filteredLogs.length === 0) {
        // ログが空になった場合はエントリ自体を削除
        this.props.rateLimitLogs.delete(userId);
      } else {
        this.props.rateLimitLogs.set(userId, filteredLogs);
      }
    }
  }

  /**
   * エンドポイントを有効化
   */
  activate(): void {
    this.props.isActive = true;
  }

  /**
   * エンドポイントを無効化
   */
  deactivate(): void {
    this.props.isActive = false;
  }

  /**
   * ユーザーのアクセスログ数を取得
   */
  getUserLogCount(userId: UserId): number {
    const userLogs = this.props.rateLimitLogs.get(userId.value) || [];
    return userLogs.length;
  }

  /**
   * 全ユーザーのアクセスログ数を取得
   */
  getTotalLogCount(): number {
    let total = 0;
    for (const logs of this.props.rateLimitLogs.values()) {
      total += logs.length;
    }
    return total;
  }

  /**
   * APIEndpointを作成
   */
  static create(props: CreateAPIEndpointProps, id?: EndpointId): Result<APIEndpoint> {
    // EndpointPathの作成
    const pathResult = EndpointPath.create(props.path);
    if (pathResult.isFailure) {
      return Result.fail(
        new DomainError(
          'INVALID_ENDPOINT_PATH',
          pathResult.getError().message,
          ErrorType.VALIDATION,
        ),
      );
    }

    const endpointProps: APIEndpointProps = {
      path: pathResult.getValue(),
      method: props.method,
      type: props.type,
      description: props.description,
      isActive: props.isActive ?? true,
      rateLimitLogs: new Map(),
    };

    // Ensure we always have an EndpointId
    const endpointId = id || EndpointId.generate();

    return Result.ok(new APIEndpoint(endpointProps, endpointId));
  }

  /**
   * 既存のデータから再構築
   */
  static reconstruct(props: APIEndpointProps & { id: string }): Result<APIEndpoint> {
    const idResult = EndpointId.create(props.id);
    if (idResult.isFailure) {
      return Result.fail(
        new DomainError('INVALID_ENDPOINT_ID', idResult.getError().message, ErrorType.VALIDATION),
      );
    }

    const { id: _id, ...endpointProps } = props;
    return Result.ok(new APIEndpoint(endpointProps, idResult.getValue()));
  }
}
