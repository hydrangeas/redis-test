import { Result, DomainError } from '@/domain/errors';

/**
 * 認証イベントタイプの列挙
 */
export enum EventType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  RATE_LIMIT_CHECK = 'RATE_LIMIT_CHECK',
}

/**
 * 認証イベントを表すバリューオブジェクト
 */
export class AuthEvent {
  private readonly _successfulEvents = new Set([
    EventType.LOGIN,
    EventType.LOGIN_SUCCESS,
    EventType.LOGOUT,
    EventType.TOKEN_REFRESH,
  ]);

  constructor(
    private readonly _type: EventType,
    private readonly _description?: string
  ) {
    Object.freeze(this);
  }

  /**
   * イベントタイプを取得
   */
  get type(): EventType {
    return this._type;
  }

  /**
   * 説明を取得
   */
  get description(): string | undefined {
    return this._description;
  }

  /**
   * 成功イベントかどうかを判定
   */
  isSuccessful(): boolean {
    return this._successfulEvents.has(this._type);
  }

  /**
   * イベントタイプからAuthEventを作成
   */
  static create(type: EventType, description?: string): Result<AuthEvent> {
    if (!Object.values(EventType).includes(type)) {
      return Result.fail<AuthEvent>(
        DomainError.validation(
          'INVALID_AUTH_EVENT_TYPE',
          '無効な認証イベントタイプです'
        )
      );
    }

    return Result.ok(new AuthEvent(type, description));
  }

  /**
   * 事前定義されたイベント
   */
  static login(): Result<AuthEvent> {
    return AuthEvent.create(EventType.LOGIN, 'User logged in');
  }

  static logout(): Result<AuthEvent> {
    return AuthEvent.create(EventType.LOGOUT, 'User logged out');
  }

  static tokenRefresh(): Result<AuthEvent> {
    return AuthEvent.create(EventType.TOKEN_REFRESH, 'Token refreshed');
  }

  static loginFailed(reason: string): Result<AuthEvent> {
    return AuthEvent.create(EventType.LOGIN_FAILED, reason);
  }

  static tokenExpired(): Result<AuthEvent> {
    return AuthEvent.create(EventType.TOKEN_EXPIRED, 'Token expired');
  }

  /**
   * 等価性の比較
   */
  equals(other: AuthEvent): boolean {
    if (!other) return false;
    return this._type === other._type;
  }

  /**
   * 文字列表現を返す
   */
  toString(): string {
    return this._type;
  }

  /**
   * JSON表現を返す
   */
  toJSON(): Record<string, any> {
    return {
      type: this._type,
      description: this._description,
    };
  }
}