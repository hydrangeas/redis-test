import { DomainError } from '@/domain/errors/domain-error';
import { Guard } from '@/domain/shared/guard';
import { Result } from '@/domain/shared/result';

/**
 * レート制限の設定を表すバリューオブジェクト
 * APIアクセスの頻度制限を管理
 */
export class RateLimit {
  private readonly _maxRequests: number;
  private readonly _windowSeconds: number;

  private constructor(maxRequests: number, windowSeconds: number) {
    this._maxRequests = maxRequests;
    this._windowSeconds = windowSeconds;
    Object.freeze(this);
  }

  /**
   * RateLimitを作成する（Resultパターン）
   * @param maxRequests - ウィンドウ期間内の最大リクエスト数
   * @param windowSeconds - ウィンドウ期間（秒）
   * @returns 成功時はRateLimit、失敗時はDomainError
   */
  static create(maxRequests: number, windowSeconds: number): Result<RateLimit> {
    // null/undefinedチェック
    const maxRequestsGuard = Guard.againstNullOrUndefined(maxRequests, 'maxRequests');
    if (!maxRequestsGuard.succeeded) {
      return Result.fail(
        DomainError.validation('INVALID_MAX_REQUESTS', 'Max requests cannot be null or undefined'),
      );
    }

    const windowSecondsGuard = Guard.againstNullOrUndefined(windowSeconds, 'windowSeconds');
    if (!windowSecondsGuard.succeeded) {
      return Result.fail(
        DomainError.validation(
          'INVALID_WINDOW_SECONDS',
          'Window seconds cannot be null or undefined',
        ),
      );
    }

    // 数値チェック
    if (!Number.isInteger(maxRequests)) {
      return Result.fail(
        DomainError.validation(
          'INVALID_MAX_REQUESTS',
          `Max requests must be an integer. Received: ${maxRequests}`,
          { maxRequests },
        ),
      );
    }

    if (!Number.isInteger(windowSeconds)) {
      return Result.fail(
        DomainError.validation(
          'INVALID_WINDOW_SECONDS',
          `Window seconds must be an integer. Received: ${windowSeconds}`,
          { windowSeconds },
        ),
      );
    }

    // 範囲チェック
    if (maxRequests <= 0) {
      return Result.fail(
        DomainError.validation(
          'INVALID_MAX_REQUESTS',
          `Max requests must be positive. Received: ${maxRequests}`,
          { maxRequests },
        ),
      );
    }

    if (windowSeconds <= 0) {
      return Result.fail(
        DomainError.validation(
          'INVALID_WINDOW_SECONDS',
          `Window seconds must be positive. Received: ${windowSeconds}`,
          { windowSeconds },
        ),
      );
    }

    // 合理的な上限チェック
    if (maxRequests > 10000) {
      return Result.fail(
        DomainError.validation(
          'MAX_REQUESTS_TOO_HIGH',
          `Max requests cannot exceed 10000. Received: ${maxRequests}`,
          { maxRequests },
        ),
      );
    }

    if (windowSeconds > 86400) {
      // 24時間
      return Result.fail(
        DomainError.validation(
          'WINDOW_SECONDS_TOO_HIGH',
          `Window seconds cannot exceed 86400 (24 hours). Received: ${windowSeconds}`,
          { windowSeconds },
        ),
      );
    }

    return Result.ok(new RateLimit(maxRequests, windowSeconds));
  }

  /**
   * RateLimitを作成する（例外パターン）
   * @param maxRequests - ウィンドウ期間内の最大リクエスト数
   * @param windowSeconds - ウィンドウ期間（秒）
   * @returns RateLimit
   * @throws Error 無効な値の場合
   */
  static fromValues(maxRequests: number, windowSeconds: number): RateLimit {
    const result = this.create(maxRequests, windowSeconds);
    if (result.isFailure) {
      throw new Error(result.getError().message);
    }
    return result.getValue();
  }

  /**
   * 最大リクエスト数を取得
   */
  get maxRequests(): number {
    return this._maxRequests;
  }

  /**
   * ウィンドウ期間（秒）を取得
   */
  get windowSeconds(): number {
    return this._windowSeconds;
  }

  /**
   * 等価性の比較
   * @param other - 比較対象のRateLimit
   * @returns 等しい場合true
   */
  equals(other: RateLimit): boolean {
    if (!other) return false;
    return this._maxRequests === other._maxRequests && this._windowSeconds === other._windowSeconds;
  }

  /**
   * TIER1のデフォルトレート制限
   * @returns 1分間に60リクエスト
   */
  static TIER1_DEFAULT(): RateLimit {
    return RateLimit.fromValues(60, 60);
  }

  /**
   * TIER2のデフォルトレート制限
   * @returns 1分間に120リクエスト
   */
  static TIER2_DEFAULT(): RateLimit {
    return RateLimit.fromValues(120, 60);
  }

  /**
   * TIER3のデフォルトレート制限
   * @returns 1分間に300リクエスト
   */
  static TIER3_DEFAULT(): RateLimit {
    return RateLimit.fromValues(300, 60);
  }

  /**
   * 1分あたりのリクエスト数を計算
   * @returns 1分あたりのリクエスト数
   */
  getRequestsPerMinute(): number {
    return (this._maxRequests / this._windowSeconds) * 60;
  }

  /**
   * 現在より厳しい制限かどうかを判定
   * @param other - 比較対象のRateLimit
   * @returns より厳しい場合true
   */
  isStricterThan(other: RateLimit): boolean {
    const thisPerMinute = this.getRequestsPerMinute();
    const otherPerMinute = other.getRequestsPerMinute();
    return thisPerMinute < otherPerMinute;
  }

  /**
   * 現在より緩い制限かどうかを判定
   * @param other - 比較対象のRateLimit
   * @returns より緩い場合true
   */
  isLooserThan(other: RateLimit): boolean {
    const thisPerMinute = this.getRequestsPerMinute();
    const otherPerMinute = other.getRequestsPerMinute();
    return thisPerMinute > otherPerMinute;
  }

  /**
   * 文字列表現を返す
   */
  toString(): string {
    if (this._windowSeconds === 60) {
      return `${this._maxRequests} requests/minute`;
    } else if (this._windowSeconds === 3600) {
      return `${this._maxRequests} requests/hour`;
    } else {
      return `${this._maxRequests} requests/${this._windowSeconds}s`;
    }
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): {
    maxRequests: number;
    windowSeconds: number;
  } {
    return {
      maxRequests: this._maxRequests,
      windowSeconds: this._windowSeconds,
    };
  }

  /**
   * JSONからの復元
   * @param json - JSON形式のレート制限情報
   * @returns 復元されたRateLimit
   */
  static fromJSON(json: { maxRequests: number; windowSeconds: number }): RateLimit {
    return RateLimit.fromValues(json.maxRequests, json.windowSeconds);
  }
}
