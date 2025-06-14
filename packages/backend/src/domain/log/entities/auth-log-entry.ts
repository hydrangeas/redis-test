import { Entity } from '@/domain/shared/entity';
import { Result } from '@/domain/shared/result';
import { Guard } from '@/domain/shared/guard';
import { LogId } from '@/domain/log/value-objects/log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { AuthEvent, EventType } from '@/domain/log/value-objects/auth-event';
import { Provider } from '@/domain/log/value-objects/provider';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { ValidationError } from '@/domain/errors/validation-error';
import { AuthResult } from '@/domain/log/enums';

interface AuthLogEntryProps {
  userId?: UserId;
  event: AuthEvent;
  provider: Provider;
  ipAddress: IPAddress;
  userAgent: UserAgent;
  timestamp: Date;
  result: AuthResult;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class AuthLogEntry extends Entity<AuthLogEntryProps> {
  private constructor(props: AuthLogEntryProps, id?: LogId) {
    super(props, id);
  }

  get id(): LogId {
    return this._id as LogId;
  }

  get userId(): UserId | undefined {
    return this.props.userId;
  }

  get event(): AuthEvent {
    return this.props.event;
  }

  get provider(): Provider {
    return this.props.provider;
  }

  get ipAddress(): IPAddress {
    return this.props.ipAddress;
  }

  get userAgent(): UserAgent {
    return this.props.userAgent;
  }

  get timestamp(): Date {
    return new Date(this.props.timestamp.getTime());
  }

  get result(): AuthResult {
    return this.props.result;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata ? { ...this.props.metadata } : undefined;
  }

  public static create(
    props: AuthLogEntryProps,
    id?: LogId
  ): Result<AuthLogEntry> {
    // ビジネスルールの検証
    const validationResult = this.validate(props);
    if (validationResult.isFailure) {
      return Result.fail(validationResult.error!);
    }

    const entry = new AuthLogEntry(props, id || LogId.generate());
    return Result.ok(entry);
  }

  private static validate(props: AuthLogEntryProps): Result<void> {
    const guardResult = Guard.againstNullOrUndefinedBulk([
      { argument: props.event, argumentName: 'event' },
      { argument: props.provider, argumentName: 'provider' },
      { argument: props.ipAddress, argumentName: 'ipAddress' },
      { argument: props.userAgent, argumentName: 'userAgent' },
      { argument: props.timestamp, argumentName: 'timestamp' },
      { argument: props.result, argumentName: 'result' },
    ]);

    if (!guardResult.succeeded) {
      return Result.fail(new ValidationError(guardResult.message));
    }

    // 失敗時はエラーメッセージが必須
    if (props.result === AuthResult.FAILED && !props.errorMessage) {
      return Result.fail(
        new ValidationError('Error message is required for failed authentication')
      );
    }

    // 成功時はユーザーIDが必須（ゲストアクセスを除く）
    if (
      props.result === AuthResult.SUCCESS &&
      !props.userId &&
      props.event.type !== EventType.LOGIN_FAILED
    ) {
      return Result.fail(
        new ValidationError('User ID is required for successful authentication')
      );
    }

    // タイムスタンプは未来の時刻不可
    if (props.timestamp.getTime() > Date.now()) {
      return Result.fail(
        new ValidationError('Timestamp cannot be in the future')
      );
    }

    return Result.ok();
  }

  // 異常なアクセスパターンの検出
  public isAnomalous(): boolean {
    // 短時間での連続失敗
    if (this.props.result === AuthResult.FAILED && this.props.metadata?.failureCount && this.props.metadata.failureCount > 5) {
      return true;
    }

    // 異常なユーザーエージェント
    if (this.props.userAgent.isBot() || this.props.userAgent.isCrawler()) {
      return true;
    }

    // 既知の悪意あるIPアドレス
    if (this.props.ipAddress.isBlacklisted()) {
      return true;
    }

    return false;
  }

  // セキュリティアラートが必要か
  public requiresSecurityAlert(): boolean {
    return this.props.result === AuthResult.BLOCKED || this.isAnomalous();
  }

  public toJSON(): Record<string, any> {
    return {
      id: this.id.value,
      userId: this.props.userId?.value,
      event: this.props.event.toJSON(),
      provider: this.props.provider.value,
      ipAddress: this.props.ipAddress.value,
      userAgent: this.props.userAgent.value,
      timestamp: this.props.timestamp.toISOString(),
      result: this.props.result,
      errorMessage: this.props.errorMessage,
      metadata: this.props.metadata,
    };
  }
}