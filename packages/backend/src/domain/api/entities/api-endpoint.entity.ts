import { Entity } from '@/domain/shared/entity';
import { EndpointId } from '../value-objects/endpoint-id';
import { EndpointPath } from '../value-objects/endpoint-path';
import { HttpMethod } from '../value-objects/http-method';
import { EndpointType } from '../value-objects/endpoint-type';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { RateLimitLog } from './rate-limit-log.entity';
import { RequestCount } from '../value-objects/request-count';
import { RateLimitWindow } from '../value-objects/rate-limit-window';
import { Result } from '@/domain/shared/result';

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
    currentTime: Date = new Date()
  ): RateLimitCheckResult {
    const userLogs = this.props.rateLimitLogs.get(userId.value) || [];
    const window = new RateLimitWindow(rateLimit.windowSeconds, currentTime);
    
    // ウィンドウ内のリクエストをカウント
    const requestsInWindow = userLogs.filter(log => 
      window.contains(log.timestamp)
    );
    
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
   * アクセスを記録
   */
  recordRequest(userId: UserId, timestamp: Date = new Date()): Result<void> {
    const userLogs = this.props.rateLimitLogs.get(userId.value) || [];
    
    const newLogResult = RateLimitLog.create({
      userId,
      endpointId: this.id,
      timestamp,
    });
    
    if (newLogResult.isFailure) {
      return Result.fail(newLogResult.getError());
    }
    
    userLogs.push(newLogResult.getValue());
    
    // ログを時系列でソート
    userLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    this.props.rateLimitLogs.set(userId.value, userLogs);
    
    // 古いログをクリーンアップ（1時間以上前のログを削除）
    this.cleanupOldLogs(userId, timestamp);
    
    return Result.ok();
  }

  /**
   * 古いログをクリーンアップ
   */
  private cleanupOldLogs(userId: UserId, currentTime: Date): void {
    const userLogs = this.props.rateLimitLogs.get(userId.value) || [];
    const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);
    
    const recentLogs = userLogs.filter(log => 
      log.timestamp.getTime() > oneHourAgo.getTime()
    );
    
    if (recentLogs.length !== userLogs.length) {
      this.props.rateLimitLogs.set(userId.value, recentLogs);
    }
  }

  /**
   * エンドポイントを有効化
   */
  activate(): Result<void> {
    if (this.props.isActive) {
      return Result.fail(new Error('Endpoint is already active'));
    }
    
    this.props.isActive = true;
    return Result.ok();
  }

  /**
   * エンドポイントを無効化
   */
  deactivate(): Result<void> {
    if (!this.props.isActive) {
      return Result.fail(new Error('Endpoint is already inactive'));
    }
    
    this.props.isActive = false;
    return Result.ok();
  }

  /**
   * ティアごとのレート制限を取得
   */
  getRateLimitForTier(userTier: UserTier): Result<RateLimit> {
    // 現在の実装ではエンドポイントごとの個別制限はなく、
    // ティアのデフォルト値を使用
    return Result.ok(userTier.rateLimit);
  }

  /**
   * レート制限ログを追加
   */
  async addRateLimitLog(
    userId: UserId,
    timestamp: Date = new Date()
  ): Promise<Result<void>> {
    return this.recordRequest(userId, timestamp);
  }

  /**
   * ユーザーのログをクリーンアップ
   */
  async cleanupLogsForUser(
    userId: UserId,
    cutoffTime: Date
  ): Promise<Result<number>> {
    const userLogs = this.props.rateLimitLogs.get(userId.value) || [];
    const beforeCount = userLogs.length;
    
    const recentLogs = userLogs.filter(log => 
      log.timestamp.getTime() > cutoffTime.getTime()
    );
    
    if (recentLogs.length !== userLogs.length) {
      this.props.rateLimitLogs.set(userId.value, recentLogs);
    }
    
    const cleanedCount = beforeCount - recentLogs.length;
    return Result.ok(cleanedCount);
  }

  /**
   * すべてのログをクリーンアップ
   */
  async cleanupAllLogs(cutoffTime: Date): Promise<Result<number>> {
    let totalCleaned = 0;
    
    for (const [userId, logs] of this.props.rateLimitLogs.entries()) {
      const beforeCount = logs.length;
      const recentLogs = logs.filter(log => 
        log.timestamp.getTime() > cutoffTime.getTime()
      );
      
      if (recentLogs.length !== logs.length) {
        this.props.rateLimitLogs.set(userId, recentLogs);
        totalCleaned += beforeCount - recentLogs.length;
      }
    }
    
    return Result.ok(totalCleaned);
  }

  /**
   * ファクトリメソッド
   */
  static create(
    props: Omit<APIEndpointProps, 'rateLimitLogs'>,
    id?: EndpointId
  ): Result<APIEndpoint> {
    const endpointProps: APIEndpointProps = {
      ...props,
      rateLimitLogs: new Map(),
    };
    
    return Result.ok(new APIEndpoint(endpointProps, id));
  }

  /**
   * 既存のデータから再構築
   */
  static reconstitute(
    props: APIEndpointProps,
    id: EndpointId
  ): APIEndpoint {
    return new APIEndpoint(props, id);
  }
}