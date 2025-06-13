import { UserId } from './user-id';
import { UserTier } from './user-tier';
import { TierLevel } from './tier-level';
import { ValidationError } from '../../errors/validation-error';

/**
 * 認証済みユーザーを表現するバリューオブジェクト
 * 認証コンテキストとAPIコンテキスト間の共有カーネルとして機能
 */
export class AuthenticatedUser {
  constructor(
    public readonly userId: UserId,
    public readonly tier: UserTier,
  ) {
    if (!userId) {
      throw new ValidationError('UserId is required');
    }
    if (!tier) {
      throw new ValidationError('UserTier is required');
    }
    Object.freeze(this);
  }

  /**
   * 指定されたティアレベルのエンドポイントにアクセス可能か判定
   * @param requiredTier 必要なティアレベル
   * @returns アクセス可能な場合true
   */
  canAccessEndpoint(requiredTier: TierLevel): boolean {
    return this.tier.isHigherThanOrEqualTo(new UserTier(requiredTier));
  }

  /**
   * レート制限情報を取得
   * @returns ユーザーティアに応じたレート制限
   */
  getRateLimit() {
    return this.tier.getRateLimit();
  }

  /**
   * 等価性の比較
   */
  equals(other: AuthenticatedUser): boolean {
    return this.userId.equals(other.userId) && this.tier.equals(other.tier);
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return `AuthenticatedUser(${this.userId.toString()}, ${this.tier.toString()})`;
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): {
    userId: string;
    tier: {
      level: string;
      rateLimit: {
        maxRequests: number;
        windowSeconds: number;
      };
    };
  } {
    return {
      userId: this.userId.toJSON(),
      tier: this.tier.toJSON(),
    };
  }

  /**
   * JSONからの復元
   */
  static fromJSON(json: {
    userId: string;
    tier: {
      level: string;
      rateLimit: {
        maxRequests: number;
        windowSeconds: number;
      };
    };
  }): AuthenticatedUser {
    return new AuthenticatedUser(
      UserId.fromJSON(json.userId),
      UserTier.fromJSON(json.tier),
    );
  }

  /**
   * JWTペイロードからAuthenticatedUserを作成するファクトリメソッド
   * （AuthenticationServiceで使用）
   */
  static fromTokenPayload(userId: string, tierString: string): AuthenticatedUser {
    const id = new UserId(userId);
    const tierLevel = this.parseTierLevel(tierString);
    const tier = new UserTier(tierLevel);

    return new AuthenticatedUser(id, tier);
  }

  /**
   * ティアレベル文字列をパース
   */
  private static parseTierLevel(tierString: string): TierLevel {
    const normalizedTier = tierString.toUpperCase();

    if (!Object.values(TierLevel).includes(normalizedTier as TierLevel)) {
      // デフォルトでTIER1を返す（新規ユーザー対応）
      return TierLevel.TIER1;
    }

    return normalizedTier as TierLevel;
  }
}