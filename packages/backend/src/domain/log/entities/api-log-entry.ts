import { Entity } from '@/domain/shared/entity';
import { Result } from '@/domain/shared/result';
import { Guard } from '@/domain/shared/guard';
import { LogId } from '../value-objects/log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { RequestInfo } from '../value-objects/request-info';
import { ResponseInfo } from '../value-objects/response-info';
import { ValidationError } from '@/domain/errors/validation-error';

interface APILogEntryProps {
  userId?: UserId;
  endpoint: Endpoint;
  requestInfo: RequestInfo;
  responseInfo: ResponseInfo;
  timestamp: Date;
  error?: string;
}

/**
 * APIログエントリエンティティ
 * APIアクセスの詳細ログを表現
 */
export class APILogEntry extends Entity<APILogEntryProps> {
  private constructor(props: APILogEntryProps, id?: LogId) {
    super(props, id);
  }

  get id(): LogId {
    return this._id as LogId;
  }

  /**
   * ユーザーID
   */
  get userId(): UserId | undefined {
    return this.props.userId;
  }

  /**
   * APIエンドポイント
   */
  get endpoint(): Endpoint {
    return this.props.endpoint;
  }

  /**
   * リクエスト情報
   */
  get requestInfo(): RequestInfo {
    return this.props.requestInfo;
  }

  /**
   * レスポンス情報
   */
  get responseInfo(): ResponseInfo {
    return this.props.responseInfo;
  }

  /**
   * タイムスタンプ
   */
  get timestamp(): Date {
    return new Date(this.props.timestamp.getTime());
  }

  /**
   * エラー情報
   */
  get error(): string | undefined {
    return this.props.error;
  }

  public static create(props: APILogEntryProps, id?: LogId): Result<APILogEntry> {
    // ビジネスルールの検証
    const validationResult = this.validate(props);
    if (validationResult.isFailure) {
      return Result.fail(validationResult.error!);
    }

    const entry = new APILogEntry(props, id || LogId.generate());
    return Result.ok(entry);
  }

  private static validate(props: APILogEntryProps): Result<void> {
    const guardResult = Guard.againstNullOrUndefinedBulk([
      { argument: props.endpoint, argumentName: 'endpoint' },
      { argument: props.requestInfo, argumentName: 'requestInfo' },
      { argument: props.responseInfo, argumentName: 'responseInfo' },
      { argument: props.timestamp, argumentName: 'timestamp' },
    ]);

    if (!guardResult.succeeded) {
      return Result.fail(new ValidationError(guardResult.message));
    }

    // タイムスタンプは未来の時刻不可
    if (props.timestamp.getTime() > Date.now()) {
      return Result.fail(new ValidationError('Timestamp cannot be in the future'));
    }

    return Result.ok();
  }

  /**
   * アクセスが成功したか
   */
  get isSuccess(): boolean {
    return this.props.responseInfo.statusCode >= 200 && this.props.responseInfo.statusCode < 300;
  }

  /**
   * エラーレスポンスか
   */
  get isError(): boolean {
    return this.props.responseInfo.statusCode >= 400;
  }

  /**
   * レート制限エラーか
   */
  get isRateLimited(): boolean {
    return this.props.responseInfo.statusCode === 429;
  }

  /**
   * 認証エラーか
   */
  get isUnauthorized(): boolean {
    return this.props.responseInfo.statusCode === 401;
  }

  /**
   * アクセス拒否エラーか
   */
  get isForbidden(): boolean {
    return this.props.responseInfo.statusCode === 403;
  }

  /**
   * リソース未発見エラーか
   */
  get isNotFound(): boolean {
    return this.props.responseInfo.statusCode === 404;
  }

  /**
   * 内部エラーか
   */
  get isInternalError(): boolean {
    return this.props.responseInfo.statusCode >= 500;
  }

  /**
   * ログエントリの概要を取得
   */
  getSummary(): string {
    const status = this.isSuccess ? 'SUCCESS' : 'ERROR';
    const method = this.props.endpoint.method;
    const path = this.props.endpoint.path.value;
    const statusCode = this.props.responseInfo.statusCode;
    const responseTime = this.props.responseInfo.responseTime;

    return `[${status}] ${method} ${path} - ${statusCode} (${responseTime}ms)`;
  }

  /**
   * 分析用のタグを生成
   */
  getTags(): string[] {
    const tags: string[] = [];

    // ステータスコードベースのタグ
    if (this.isSuccess) tags.push('success');
    if (this.isError) tags.push('error');
    if (this.isRateLimited) tags.push('rate_limited');
    if (this.isUnauthorized) tags.push('unauthorized');
    if (this.isForbidden) tags.push('forbidden');
    if (this.isNotFound) tags.push('not_found');
    if (this.isInternalError) tags.push('internal_error');

    // レスポンスタイムベースのタグ
    const responseTime = this.props.responseInfo.responseTime;
    if (responseTime < 100) {
      tags.push('fast');
    } else if (responseTime < 500) {
      tags.push('normal');
    } else if (responseTime < 1000) {
      tags.push('slow');
    } else {
      tags.push('very_slow');
    }

    // エンドポイントタイプ
    tags.push(`endpoint:${this.props.endpoint.path.value}`);
    tags.push(`method:${this.props.endpoint.method.toLowerCase()}`);

    return tags;
  }
}
