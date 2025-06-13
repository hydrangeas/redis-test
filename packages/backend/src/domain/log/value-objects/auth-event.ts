import { Result } from '@/domain/errors';

/**
 * 認証イベントタイプの列挙
 */
export enum EventType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
}

/**
 * 認証イベントを表すバリューオブジェクト
 */
export class AuthEvent {
  private readonly _successfulEvents = new Set([
    EventType.LOGIN,
    EventType.LOGOUT,
    EventType.TOKEN_REFRESH,
  ]);

  private constructor(private readonly _type: EventType) {
    Object.freeze(this);
  }

  /**
   * イベントタイプを取得
   */
  get type(): EventType {
    return this._type;
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
  static create(type: EventType): Result<AuthEvent> {
    if (!Object.values(EventType).includes(type)) {
      return Result.fail<AuthEvent>('無効な認証イベントタイプです');
    }

    return Result.ok(new AuthEvent(type));
  }

  /**
   * 事前定義されたイベント
   */
  static login(): AuthEvent {
    return new AuthEvent(EventType.LOGIN);
  }

  static logout(): AuthEvent {
    return new AuthEvent(EventType.LOGOUT);
  }

  static tokenRefresh(): AuthEvent {
    return new AuthEvent(EventType.TOKEN_REFRESH);
  }

  static tokenExpired(): AuthEvent {
    return new AuthEvent(EventType.TOKEN_EXPIRED);
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
  toJSON(): string {
    return this._type;
  }
}