import { Result } from '@/domain/errors';

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
    private readonly _metadata?: Record<string, any>,
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
  get metadata(): Record<string, any> {
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
  static create(type: ActionType, metadata?: Record<string, any>): Result<Action> {
    if (!Object.values(ActionType).includes(type)) {
      return Result.fail<Action>('無効なアクションタイプです');
    }

    // メタデータの検証
    if (metadata) {
      // 認証アクションの場合
      if ([ActionType.LOGIN, ActionType.LOGIN_FAILED].includes(type)) {
        if (type === ActionType.LOGIN && !metadata.userId) {
          return Result.fail<Action>('ログイン成功時はuserIdが必要です');
        }
      }

      // APIアクセスアクションの場合
      if (type === ActionType.API_ACCESS) {
        if (!metadata.endpoint || !metadata.method) {
          return Result.fail<Action>('APIアクセスにはendpointとmethodが必要です');
        }
      }

      // レート制限アクションの場合
      if (type === ActionType.RATE_LIMIT_EXCEEDED) {
        if (!metadata.userId || !metadata.limit || !metadata.window) {
          return Result.fail<Action>('レート制限超過にはuserId、limit、windowが必要です');
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
      throw new Error(result.error);
    }
    return result.value;
  }

  static loginFailed(email?: string, reason?: string): Action {
    const result = Action.create(ActionType.LOGIN_FAILED, { email, reason });
    if (result.isFailure) {
      throw new Error(result.error);
    }
    return result.value;
  }

  static logout(userId: string): Action {
    const result = Action.create(ActionType.LOGOUT, { userId });
    if (result.isFailure) {
      throw new Error(result.error);
    }
    return result.value;
  }

  static apiAccess(endpoint: string, method: string, responseCode: number): Action {
    const result = Action.create(ActionType.API_ACCESS, {
      endpoint,
      method,
      responseCode,
    });
    if (result.isFailure) {
      throw new Error(result.error);
    }
    return result.value;
  }

  static rateLimitExceeded(userId: string, limit: number, window: number): Action {
    const result = Action.create(ActionType.RATE_LIMIT_EXCEEDED, {
      userId,
      limit,
      window,
    });
    if (result.isFailure) {
      throw new Error(result.error);
    }
    return result.value;
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
  toJSON(): { type: string; metadata?: Record<string, any> } {
    return {
      type: this._type,
      ...(this._metadata && { metadata: this._metadata }),
    };
  }
}
