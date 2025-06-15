import { Entity } from '@/domain/shared/entity';
import { RateLimitLogId } from '../value-objects/rate-limit-log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { EndpointId } from '../value-objects/endpoint-id';
import { RequestCount } from '../value-objects/request-count';
import { Result } from '@/domain/shared/result';
import { Guard } from '@/domain/shared/guard';

export interface RateLimitLogProps {
  userId: UserId;
  endpointId: EndpointId;
  requestCount: RequestCount;
  requestedAt: Date;
  requestMetadata?: Record<string, any>;
}

export class RateLimitLog extends Entity<RateLimitLogProps> {
  private constructor(props: RateLimitLogProps, id?: RateLimitLogId) {
    super(props, id);
  }

  get id(): RateLimitLogId {
    return this._id as RateLimitLogId;
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get endpointId(): EndpointId {
    return this.props.endpointId;
  }

  get requestCount(): RequestCount {
    return this.props.requestCount;
  }

  get requestedAt(): Date {
    return this.props.requestedAt;
  }

  get requestMetadata(): Record<string, any> | undefined {
    return this.props.requestMetadata;
  }

  /**
   * ログが特定のウィンドウ内かチェック
   */
  isWithinWindow(windowStart: Date, windowEnd: Date): boolean {
    const logTime = this.requestedAt.getTime();
    return logTime >= windowStart.getTime() && logTime < windowEnd.getTime();
  }

  /**
   * ログの経過時間を取得（秒）
   */
  getAgeInSeconds(currentTime: Date = new Date()): number {
    return Math.floor((currentTime.getTime() - this.requestedAt.getTime()) / 1000);
  }

  /**
   * ファクトリメソッド
   */
  static create(
    props: RateLimitLogProps,
    id?: RateLimitLogId
  ): Result<RateLimitLog> {
    const guardResult = Guard.againstNullOrUndefinedBulk([
      { argument: props.userId, argumentName: 'userId' },
      { argument: props.endpointId, argumentName: 'endpointId' },
      { argument: props.requestCount, argumentName: 'requestCount' },
      { argument: props.requestedAt, argumentName: 'requestedAt' },
    ]);

    if (!guardResult.succeeded) {
      return Result.fail(new Error(guardResult.message));
    }

    // タイムスタンプが未来でないことを確認
    if (props.requestedAt.getTime() > Date.now()) {
      return Result.fail(new Error('Requested at cannot be in the future'));
    }

    return Result.ok(new RateLimitLog(props, id));
  }

  /**
   * 既存のデータから再構築
   */
  static reconstitute(
    props: RateLimitLogProps,
    id: RateLimitLogId
  ): RateLimitLog {
    return new RateLimitLog(props, id);
  }
}