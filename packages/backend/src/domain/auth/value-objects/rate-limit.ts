import { ValidationError } from '../../errors/validation-error';

/**
 * レート制限の設定を表すバリューオブジェクト
 */
export class RateLimit {
  /**
   * @param maxRequests - ウィンドウ期間内の最大リクエスト数
   * @param windowSeconds - ウィンドウ期間（秒）
   */
  constructor(
    public readonly maxRequests: number,
    public readonly windowSeconds: number,
  ) {
    if (maxRequests <= 0) {
      throw new ValidationError('Max requests must be positive', {
        maxRequests,
      });
    }
    if (windowSeconds <= 0) {
      throw new ValidationError('Window seconds must be positive', {
        windowSeconds,
      });
    }
    if (!Number.isInteger(maxRequests)) {
      throw new ValidationError('Max requests must be an integer', {
        maxRequests,
      });
    }
    if (!Number.isInteger(windowSeconds)) {
      throw new ValidationError('Window seconds must be an integer', {
        windowSeconds,
      });
    }
    
    Object.freeze(this);
  }

  /**
   * 等価性の比較
   */
  equals(other: RateLimit): boolean {
    return (
      this.maxRequests === other.maxRequests &&
      this.windowSeconds === other.windowSeconds
    );
  }

  /**
   * TIER1のデフォルトレート制限
   * 1分間に60リクエスト
   */
  static TIER1_DEFAULT(): RateLimit {
    return new RateLimit(60, 60);
  }

  /**
   * TIER2のデフォルトレート制限
   * 1分間に120リクエスト
   */
  static TIER2_DEFAULT(): RateLimit {
    return new RateLimit(120, 60);
  }

  /**
   * TIER3のデフォルトレート制限
   * 1分間に300リクエスト
   */
  static TIER3_DEFAULT(): RateLimit {
    return new RateLimit(300, 60);
  }

  /**
   * 1秒あたりのリクエスト数を計算
   */
  getRequestsPerSecond(): number {
    return this.maxRequests / this.windowSeconds;
  }

  /**
   * より制限が厳しいかどうかを判定
   */
  isMoreRestrictiveThan(other: RateLimit): boolean {
    return this.getRequestsPerSecond() < other.getRequestsPerSecond();
  }

  /**
   * 文字列表現
   */
  toString(): string {
    if (this.windowSeconds === 60) {
      return `${this.maxRequests} requests per minute`;
    }
    return `${this.maxRequests} requests per ${this.windowSeconds} seconds`;
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): { maxRequests: number; windowSeconds: number } {
    return {
      maxRequests: this.maxRequests,
      windowSeconds: this.windowSeconds,
    };
  }

  /**
   * JSONからの復元
   */
  static fromJSON(json: { maxRequests: number; windowSeconds: number }): RateLimit {
    return new RateLimit(json.maxRequests, json.windowSeconds);
  }
}