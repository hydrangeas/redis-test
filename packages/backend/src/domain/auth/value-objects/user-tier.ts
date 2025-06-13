import { TierLevel, TierLevelOrder } from './tier-level';
import { RateLimit } from './rate-limit';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import { Guard } from '@/domain/shared/guard';

/**
 * ユーザーティアを表すバリューオブジェクト
 * ティアレベルとレート制限を組み合わせて管理
 */
export class UserTier {
  private readonly _level: TierLevel;
  private readonly _rateLimit: RateLimit;

  private constructor(level: TierLevel, rateLimit: RateLimit) {
    this._level = level;
    this._rateLimit = rateLimit;
    Object.freeze(this);
  }

  /**
   * UserTierを作成する（Resultパターン）
   * @param level - ティアレベル
   * @param customRateLimit - カスタムレート制限（省略時はデフォルト値を使用）
   * @returns 成功時はUserTier、失敗時はDomainError
   */
  static create(
    level: TierLevel,
    customRateLimit?: RateLimit
  ): Result<UserTier, DomainError> {
    const guardResult = Guard.againstNullOrUndefined(level, 'TierLevel');
    if (guardResult.isFailure) {
      return Result.fail(
        DomainError.validation(
          'INVALID_TIER_LEVEL',
          'Tier level cannot be null or undefined'
        )
      );
    }

    if (!Object.values(TierLevel).includes(level)) {
      return Result.fail(
        DomainError.validation(
          'INVALID_TIER_LEVEL',
          `Invalid tier level: ${level}. Must be one of: ${Object.values(TierLevel).join(', ')}`,
          { providedLevel: level }
        )
      );
    }

    try {
      const rateLimit = customRateLimit || this.getDefaultRateLimit(level);
      return Result.ok(new UserTier(level, rateLimit));
    } catch (error) {
      return Result.fail(
        DomainError.validation(
          'INVALID_USER_TIER',
          error instanceof Error ? error.message : 'Invalid tier configuration'
        )
      );
    }
  }

  /**
   * デフォルト設定でUserTierを作成（例外パターン）
   * @param level - ティアレベル
   * @returns UserTier
   * @throws Error 無効なレベルの場合
   */
  static createDefault(level: TierLevel): UserTier {
    const result = this.create(level);
    if (result.isFailure) {
      throw new Error(result.getError().message);
    }
    return result.getValue();
  }

  /**
   * ティアレベルに応じたデフォルトのレート制限を取得
   * @param level - ティアレベル
   * @returns デフォルトのレート制限
   */
  private static getDefaultRateLimit(level: TierLevel): RateLimit {
    const rateLimitMap = {
      [TierLevel.TIER1]: RateLimit.TIER1_DEFAULT(),
      [TierLevel.TIER2]: RateLimit.TIER2_DEFAULT(),
      [TierLevel.TIER3]: RateLimit.TIER3_DEFAULT(),
    };

    const rateLimit = rateLimitMap[level];
    if (!rateLimit) {
      throw new Error(`No default rate limit for tier level: ${level}`);
    }

    return rateLimit;
  }

  /**
   * ティアレベルを取得
   */
  get level(): TierLevel {
    return this._level;
  }

  /**
   * レート制限を取得
   */
  get rateLimit(): RateLimit {
    return this._rateLimit;
  }

  /**
   * レート制限を取得（メソッド形式）
   * @deprecated Use the rateLimit getter property instead
   */
  getRateLimit(): RateLimit {
    return this._rateLimit;
  }

  /**
   * このティアが指定されたティア以上かを判定
   * @param other - 比較対象のティア
   * @returns 以上の場合true
   */
  isHigherThanOrEqualTo(other: UserTier): boolean {
    return TierLevelOrder[this._level] >= TierLevelOrder[other._level];
  }

  /**
   * このティアが指定されたティアレベル以上かを判定
   * @param requiredLevel - 必要なティアレベル
   * @returns 条件を満たす場合true
   */
  meetsRequirement(requiredLevel: TierLevel): boolean {
    return TierLevelOrder[this._level] >= TierLevelOrder[requiredLevel];
  }

  /**
   * このティアが他のティアより上位かどうかを判定
   * @param other - 比較対象のティア
   * @returns より上位の場合true
   */
  isHigherThan(other: UserTier): boolean {
    return TierLevelOrder[this._level] > TierLevelOrder[other._level];
  }

  /**
   * このティアが他のティア以下かどうかを判定
   * @param other - 比較対象のティア
   * @returns 以下の場合true
   */
  isLowerThanOrEqualTo(other: UserTier): boolean {
    return TierLevelOrder[this._level] <= TierLevelOrder[other._level];
  }

  /**
   * このティアが他のティアより下位かどうかを判定
   * @param other - 比較対象のティア
   * @returns より下位の場合true
   */
  isLowerThan(other: UserTier): boolean {
    return TierLevelOrder[this._level] < TierLevelOrder[other._level];
  }

  /**
   * 次のティアレベルを取得（アップグレード用）
   * @returns 次のティアレベル、最上位の場合null
   */
  getNextTier(): TierLevel | null {
    switch (this._level) {
      case TierLevel.TIER1:
        return TierLevel.TIER2;
      case TierLevel.TIER2:
        return TierLevel.TIER3;
      case TierLevel.TIER3:
        return null; // 最上位ティア
      default:
        // 網羅性チェック
        const _exhaustiveCheck: never = this._level;
        throw new Error(`Unknown tier level: ${this._level}`);
    }
  }

  /**
   * ティアをアップグレード
   * @returns アップグレード後のティア、最上位の場合は現在のティア
   */
  upgrade(): Result<UserTier, DomainError> {
    const nextLevel = this.getNextTier();
    if (!nextLevel) {
      return Result.fail(
        DomainError.businessRule(
          'ALREADY_MAX_TIER',
          'User is already at the highest tier level'
        )
      );
    }
    return UserTier.create(nextLevel);
  }

  /**
   * 等価性の比較
   * @param other - 比較対象のティア
   * @returns 等しい場合true
   */
  equals(other: UserTier): boolean {
    if (!other) return false;
    return (
      this._level === other._level &&
      this._rateLimit.equals(other._rateLimit)
    );
  }

  /**
   * 文字列表現を返す
   */
  toString(): string {
    return `${this._level} (${this._rateLimit.toString()})`;
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): {
    level: TierLevel;
    rateLimit: {
      maxRequests: number;
      windowSeconds: number;
    };
  } {
    return {
      level: this._level,
      rateLimit: {
        maxRequests: this._rateLimit.maxRequests,
        windowSeconds: this._rateLimit.windowSeconds,
      },
    };
  }

  /**
   * JSONからの復元
   * @param json - JSON形式のティア情報
   * @returns 復元されたUserTier
   */
  static fromJSON(json: {
    level: string;
    rateLimit?: { maxRequests: number; windowSeconds: number };
  }): UserTier {
    const level = json.level as TierLevel;
    const rateLimitResult = json.rateLimit 
      ? RateLimit.create(json.rateLimit.maxRequests, json.rateLimit.windowSeconds)
      : undefined;
    
    if (rateLimitResult && rateLimitResult.isFailure) {
      throw new Error(rateLimitResult.getError().message);
    }
    
    const rateLimit = rateLimitResult ? rateLimitResult.getValue() : undefined;
    const result = UserTier.create(level, rateLimit);
    
    if (result.isFailure) {
      throw new Error(result.getError().message);
    }
    
    return result.getValue();
  }

  /**
   * デフォルトのTIER1ティアを作成
   * @returns TIER1のUserTier
   */
  static createDefaultTier(): UserTier {
    return UserTier.createDefault(TierLevel.TIER1);
  }
}