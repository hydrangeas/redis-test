import { Entity, UniqueEntityId } from '@/domain/shared/entity';
import { Result } from '@/domain/errors/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

export interface RateLimitLogProps {
  userId: string;
  endpointId: string;
  requestId: string;
  timestamp: Date;
  exceeded: boolean;
}

export interface CreateRateLimitLogProps {
  userId: string;
  endpointId: string;
  requestId: string;
  timestamp?: Date;
  exceeded?: boolean;
}

export class RateLimitLog extends Entity<RateLimitLogProps> {
  private constructor(props: RateLimitLogProps, id?: UniqueEntityId) {
    super(props, id);
  }

  get id(): UniqueEntityId {
    return this._id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get endpointId(): string {
    return this.props.endpointId;
  }

  get requestId(): string {
    return this.props.requestId;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get exceeded(): boolean {
    return this.props.exceeded;
  }

  /**
   * レート制限超過をマーク
   */
  markAsExceeded(): void {
    this.props.exceeded = true;
  }

  /**
   * ログが期限切れかチェック
   */
  isExpired(maxAgeSeconds: number, currentTime: Date = new Date()): boolean {
    const ageInMillis = currentTime.getTime() - this.props.timestamp.getTime();
    return ageInMillis > maxAgeSeconds * 1000;
  }

  /**
   * ログの年齢を秒で取得
   */
  getAgeInSeconds(currentTime: Date = new Date()): number {
    return Math.floor((currentTime.getTime() - this.props.timestamp.getTime()) / 1000);
  }

  /**
   * RateLimitLogを作成
   */
  static create(
    props: CreateRateLimitLogProps,
    id?: UniqueEntityId
  ): Result<RateLimitLog, DomainError> {
    // Validate userId
    if (!props.userId || typeof props.userId !== 'string') {
      return Result.fail(
        new DomainError(
          'INVALID_USER_ID',
          'User ID is required and must be a string',
          ErrorType.VALIDATION
        )
      );
    }

    // Validate endpointId
    if (!props.endpointId || typeof props.endpointId !== 'string') {
      return Result.fail(
        new DomainError(
          'INVALID_ENDPOINT_ID',
          'Endpoint ID is required and must be a string',
          ErrorType.VALIDATION
        )
      );
    }

    // Validate requestId
    if (!props.requestId || typeof props.requestId !== 'string') {
      return Result.fail(
        new DomainError(
          'INVALID_REQUEST_ID',
          'Request ID is required and must be a string',
          ErrorType.VALIDATION
        )
      );
    }

    const logProps: RateLimitLogProps = {
      userId: props.userId,
      endpointId: props.endpointId,
      requestId: props.requestId,
      timestamp: props.timestamp || new Date(),
      exceeded: props.exceeded || false,
    };

    return Result.ok(new RateLimitLog(logProps, id));
  }

  /**
   * 既存のデータから再構築
   */
  static reconstruct(
    props: RateLimitLogProps & { id: string }
  ): Result<RateLimitLog, DomainError> {
    const { id, ...logProps } = props;
    return Result.ok(new RateLimitLog(logProps, new UniqueEntityId(id)));
  }
}