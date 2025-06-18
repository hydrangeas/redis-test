import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

/**
 * アクションタイプの列挙
 */
export enum ActionType {
  // 認証関連
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TIER_UPGRADE = 'TIER_UPGRADE',

  // API関連
  API_ACCESS = 'API_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  
  // システム関連
  SYSTEM_ACTION = 'SYSTEM_ACTION',
}

/**
 * アクションを表すバリューオブジェクト
 * ログエントリーで記録される操作を表現する
 */
export class Action {
  private readonly _securityRelevantTypes = new Set([
    ActionType.LOGIN_FAILED,
    ActionType.UNAUTHORIZED_ACCESS,
    ActionType.RATE_LIMIT_EXCEEDED,
    ActionType.TOKEN_EXPIRED,
  ]);

  private constructor(
    private readonly _type: ActionType,
    private readonly _metadata?: Record<string, unknown>,
  ) {
    Object.freeze(this);
    if (this._metadata) {
      Object.freeze(this._metadata);
    }
  }

  /**
   * アクションタイプを取得
   */
  get type(): ActionType {
    return this._type;
  }

  /**
   * メタデータを取得
   */
  get metadata(): Record<string, unknown> {
    return this._metadata || {};
  }

  /**
   * セキュリティ関連のアクションかどうかを判定
   */
  get isSecurityRelevant(): boolean {
    return this._securityRelevantTypes.has(this._type);
  }

  /**
   * アクションを作成
   */
  static create(type: ActionType, metadata?: Record<string, unknown>): Result<Action> {
    if (!Object.values(ActionType).includes(type)) {
      return Result.fail<Action>(new DomainError('INVALID_ACTION_TYPE', '無効なアクションタイプです', ErrorType.VALIDATION));
    }

    // メタデータの検証
    if (metadata) {
      // 認証アクションの場合
      if ([ActionType.LOGIN, ActionType.LOGIN_FAILED].includes(type)) {
        if (type === ActionType.LOGIN && !metadata.userId) {
          return Result.fail<Action>(new DomainError('MISSING_USER_ID', 'ログイン成功時はuserIdが必要です', ErrorType.VALIDATION));
        }
      }

      // APIアクセスアクションの場合
      if (type === ActionType.API_ACCESS) {
        if (!metadata.endpoint || !metadata.method) {
          return Result.fail<Action>(new DomainError('MISSING_API_INFO', 'APIアクセスにはendpointとmethodが必要です', ErrorType.VALIDATION));
        }
      }

      // レート制限アクションの場合
      if (type === ActionType.RATE_LIMIT_EXCEEDED) {
        if (!metadata.userId || !metadata.limit || !metadata.window) {
          return Result.fail<Action>(new DomainError('MISSING_RATE_LIMIT_INFO', 'レート制限超過にはuserId、limit、windowが必要です', ErrorType.VALIDATION));
        }
      }
    }

    return Result.ok(new Action(type, metadata));
  }

  /**
   * 便利なファクトリメソッド
   */
  static login(userId: string, provider: string): Action {
    const result = Action.create(ActionType.LOGIN, { userId, provider });
    if (result.isFailure) {
      throw result.getError();
    }
    return result.getValue();
  }

  static loginFailed(email?: string, reason?: string): Action {
    const result = Action.create(ActionType.LOGIN_FAILED, { email, reason });
    if (result.isFailure) {
      throw result.getError();
    }
    return result.getValue();
  }

  static logout(userId: string): Action {
    const result = Action.create(ActionType.LOGOUT, { userId });
    if (result.isFailure) {
      throw result.getError();
    }
    return result.getValue();
  }

  static apiAccess(endpoint: string, method: string, responseCode: number): Action {
    const result = Action.create(ActionType.API_ACCESS, {
      endpoint,
      method,
      responseCode,
    });
    if (result.isFailure) {
      throw result.getError();
    }
    return result.getValue();
  }

  static rateLimitExceeded(userId: string, limit: number, window: number): Action {
    const result = Action.create(ActionType.RATE_LIMIT_EXCEEDED, {
      userId,
      limit,
      window,
    });
    if (result.isFailure) {
      throw result.getError();
    }
    return result.getValue();
  }

  static tokenRefresh(userId: string): Action {
    const result = Action.create(ActionType.TOKEN_REFRESH, { userId });
    if (result.isFailure) {
      throw result.getError();
    }
    return result.getValue();
  }

  static systemEvent(eventType: string, metadata?: Record<string, unknown>): Action {
    const result = Action.create(ActionType.SYSTEM_ACTION, { eventType, ...metadata });
    if (result.isFailure) {
      throw result.getError();
    }
    return result.getValue();
  }

  /**
   * 等価性の比較
   */
  equals(other: Action): boolean {
    if (!other) return false;
    return (
      this._type === other._type &&
      JSON.stringify(this._metadata) === JSON.stringify(other._metadata)
    );
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
  toJSON(): { type: string; metadata?: Record<string, unknown> } {
    return {
      type: this._type,
      ...(this._metadata && { metadata: this._metadata }),
    };
  }
}
