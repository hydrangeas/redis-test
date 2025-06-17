import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

/**
 * HTTPステータスコードを表すバリューオブジェクト
 */
export class StatusCode {
  private constructor(private readonly _code: number) {
    Object.freeze(this);
  }

  /**
   * ステータスコードの値を取得
   */
  get code(): number {
    return this._code;
  }

  /**
   * ステータスコードの値を取得（互換性のため）
   */
  get value(): number {
    return this._code;
  }

  /**
   * ステータスコードを作成
   */
  static create(code: number): Result<StatusCode> {
    if (!Number.isInteger(code)) {
      return Result.fail<StatusCode>(
        new DomainError('INVALID_STATUS_CODE', 'ステータスコードは整数である必要があります', ErrorType.VALIDATION)
      );
    }

    if (code < 100 || code > 599) {
      return Result.fail<StatusCode>(
        new DomainError('INVALID_STATUS_CODE_RANGE', 'ステータスコードは100から599の間である必要があります', ErrorType.VALIDATION)
      );
    }

    return Result.ok(new StatusCode(code));
  }

  /**
   * よく使われるステータスコード
   */
  static readonly OK = new StatusCode(200);
  static readonly CREATED = new StatusCode(201);
  static readonly NO_CONTENT = new StatusCode(204);
  static readonly BAD_REQUEST = new StatusCode(400);
  static readonly UNAUTHORIZED = new StatusCode(401);
  static readonly FORBIDDEN = new StatusCode(403);
  static readonly NOT_FOUND = new StatusCode(404);
  static readonly TOO_MANY_REQUESTS = new StatusCode(429);
  static readonly INTERNAL_SERVER_ERROR = new StatusCode(500);
  static readonly SERVICE_UNAVAILABLE = new StatusCode(503);

  /**
   * 成功レスポンスかどうかを判定（2xx）
   */
  isSuccess(): boolean {
    return this._code >= 200 && this._code < 300;
  }

  /**
   * リダイレクトレスポンスかどうかを判定（3xx）
   */
  isRedirect(): boolean {
    return this._code >= 300 && this._code < 400;
  }

  /**
   * クライアントエラーかどうかを判定（4xx）
   */
  isClientError(): boolean {
    return this._code >= 400 && this._code < 500;
  }

  /**
   * サーバーエラーかどうかを判定（5xx）
   */
  isServerError(): boolean {
    return this._code >= 500 && this._code < 600;
  }

  /**
   * エラーレスポンスかどうかを判定（4xx or 5xx）
   */
  isError(): boolean {
    return this.isClientError() || this.isServerError();
  }

  /**
   * ステータスコードのカテゴリを取得
   */
  getCategory(): StatusCategory {
    if (this._code >= 100 && this._code < 200) return StatusCategory.INFORMATIONAL;
    if (this._code >= 200 && this._code < 300) return StatusCategory.SUCCESS;
    if (this._code >= 300 && this._code < 400) return StatusCategory.REDIRECT;
    if (this._code >= 400 && this._code < 500) return StatusCategory.CLIENT_ERROR;
    if (this._code >= 500 && this._code < 600) return StatusCategory.SERVER_ERROR;
    return StatusCategory.UNKNOWN;
  }

  /**
   * ステータスコードの説明を取得
   */
  getDescription(): string {
    const descriptions: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      503: 'Service Unavailable',
    };

    return descriptions[this._code] || `HTTP ${this._code}`;
  }

  /**
   * 等価性の比較
   */
  equals(other: StatusCode): boolean {
    if (!other) return false;
    return this._code === other._code;
  }

  /**
   * 文字列表現を返す
   */
  toString(): string {
    return this._code.toString();
  }

  /**
   * JSON表現を返す
   */
  toJSON(): number {
    return this._code;
  }
}

/**
 * ステータスコードのカテゴリ
 */
export enum StatusCategory {
  INFORMATIONAL = 'INFORMATIONAL',
  SUCCESS = 'SUCCESS',
  REDIRECT = 'REDIRECT',
  CLIENT_ERROR = 'CLIENT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}
