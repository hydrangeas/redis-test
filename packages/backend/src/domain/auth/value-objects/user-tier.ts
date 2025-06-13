import { TierLevel, TierLevelOrder } from './tier-level';
import { RateLimit } from './rate-limit';
import { ValidationError } from '../../errors/validation-error';

/**
 * ユーザーティアを表すバリューオブジェクト
 * ティアレベルとレート制限を保持
 */
export class UserTier {
  private readonly _rateLimit: RateLimit;

  /**
   * @param level - ティアレベル
   * @param rateLimit - レート制限（省略時はデフォルト値を使用）
   */
  constructor(
    public readonly level: TierLevel,
    rateLimit?: RateLimit,
  ) {
    if (!Object.values(TierLevel).includes(level)) {
      throw new ValidationError('Invalid tier level', { level });
    }

    // デフォルトのレート制限を設定
    this._rateLimit = rateLimit || this.getDefaultRateLimit(level);
    Object.freeze(this);
  }

  /**
   * ティアレベルに応じたデフォルトのレート制限を取得
   */
  private getDefaultRateLimit(level: TierLevel): RateLimit {
    switch (level) {
      case TierLevel.TIER1:
        return RateLimit.TIER1_DEFAULT();
      case TierLevel.TIER2:
        return RateLimit.TIER2_DEFAULT();
      case TierLevel.TIER3:
        return RateLimit.TIER3_DEFAULT();
      default:
        // TypeScriptの網羅性チェックのため
        const _exhaustiveCheck: never = level;
        throw new Error(`Unknown tier level: ${level}`);
    }
  }

  /**
   * レート制限を取得
   */
  get rateLimit(): RateLimit {
    return this._rateLimit;
  }

  /**
   * レート制限を取得（メソッド形式）
   */
  getRateLimit(): RateLimit {
    return this._rateLimit;
  }

  /**
   * 等価性の比較
   */
  equals(other: UserTier): boolean {
    return (
      this.level === other.level &&
      this._rateLimit.equals(other._rateLimit)
    );
  }

  /**
   * このティアが他のティア以上かどうかを判定
   */
  isHigherThanOrEqualTo(other: UserTier): boolean {
    return TierLevelOrder[this.level] >= TierLevelOrder[other.level];
  }

  /**
   * このティアが他のティアより上位かどうかを判定
   */
  isHigherThan(other: UserTier): boolean {
    return TierLevelOrder[this.level] > TierLevelOrder[other.level];
  }

  /**
   * このティアが他のティア以下かどうかを判定
   */
  isLowerThanOrEqualTo(other: UserTier): boolean {
    return TierLevelOrder[this.level] <= TierLevelOrder[other.level];
  }

  /**
   * このティアが他のティアより下位かどうかを判定
   */
  isLowerThan(other: UserTier): boolean {
    return TierLevelOrder[this.level] < TierLevelOrder[other.level];
  }

  /**
   * 次のティアレベルを取得（アップグレード用）
   */
  getNextTier(): TierLevel | null {
    switch (this.level) {
      case TierLevel.TIER1:
        return TierLevel.TIER2;
      case TierLevel.TIER2:
        return TierLevel.TIER3;
      case TierLevel.TIER3:
        return null; // 最上位ティア
      default:
        const _exhaustiveCheck: never = this.level;
        throw new Error(`Unknown tier level: ${this.level}`);
    }
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return `${this.level} (${this._rateLimit.toString()})`;
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): { level: TierLevel; rateLimit: ReturnType<RateLimit['toJSON']> } {
    return {
      level: this.level,
      rateLimit: this._rateLimit.toJSON(),
    };
  }

  /**
   * JSONからの復元
   */
  static fromJSON(json: { level: string; rateLimit?: { maxRequests: number; windowSeconds: number } }): UserTier {
    const level = json.level as TierLevel;
    const rateLimit = json.rateLimit ? RateLimit.fromJSON(json.rateLimit) : undefined;
    return new UserTier(level, rateLimit);
  }

  /**
   * デフォルトのTIER1ティアを作成
   */
  static createDefaultTier(): UserTier {
    return new UserTier(TierLevel.TIER1);
  }
}