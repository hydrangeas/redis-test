import { Result } from '@/domain/errors';

/**
 * レスポンス時間を表すバリューオブジェクト
 */
export class ResponseTime {
  private constructor(private readonly _milliseconds: number) {
    Object.freeze(this);
  }

  /**
   * ミリ秒単位のレスポンス時間を取得
   */
  get milliseconds(): number {
    return this._milliseconds;
  }

  /**
   * レスポンス時間を作成
   */
  static create(milliseconds: number): Result<ResponseTime> {
    if (!Number.isFinite(milliseconds)) {
      return Result.fail<ResponseTime>('レスポンス時間は有限な数値である必要があります');
    }

    if (milliseconds < 0) {
      return Result.fail<ResponseTime>('レスポンス時間は0以上である必要があります');
    }

    // 実用的な上限（1時間）
    if (milliseconds > 3600000) {
      return Result.fail<ResponseTime>('レスポンス時間が大きすぎます（最大1時間）');
    }

    return Result.ok(new ResponseTime(Math.round(milliseconds)));
  }

  /**
   * 秒単位のレスポンス時間を作成
   */
  static fromSeconds(seconds: number): Result<ResponseTime> {
    return ResponseTime.create(seconds * 1000);
  }

  /**
   * 秒単位でレスポンス時間を取得
   */
  toSeconds(): number {
    return this._milliseconds / 1000;
  }

  /**
   * パフォーマンスカテゴリを取得
   */
  getPerformanceCategory(): PerformanceCategory {
    if (this._milliseconds < 100) return PerformanceCategory.EXCELLENT;
    if (this._milliseconds < 300) return PerformanceCategory.GOOD;
    if (this._milliseconds < 1000) return PerformanceCategory.FAIR;
    if (this._milliseconds < 3000) return PerformanceCategory.POOR;
    return PerformanceCategory.CRITICAL;
  }

  /**
   * 人間が読みやすい形式で表示
   */
  toHumanReadable(): string {
    if (this._milliseconds < 1000) {
      return `${this._milliseconds}ms`;
    }

    const seconds = this._milliseconds / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }

    const minutes = seconds / 60;
    return `${minutes.toFixed(1)}m`;
  }

  /**
   * 指定された閾値を超えているかを判定
   */
  exceeds(thresholdMs: number): boolean {
    return this._milliseconds > thresholdMs;
  }

  /**
   * 他のレスポンス時間と比較
   */
  compareTo(other: ResponseTime): number {
    return this._milliseconds - other._milliseconds;
  }

  /**
   * 等価性の比較
   */
  equals(other: ResponseTime): boolean {
    if (!other) return false;
    return this._milliseconds === other._milliseconds;
  }

  /**
   * 文字列表現を返す
   */
  toString(): string {
    return this._milliseconds.toString();
  }

  /**
   * JSON表現を返す
   */
  toJSON(): number {
    return this._milliseconds;
  }
}

/**
 * パフォーマンスカテゴリ
 */
export enum PerformanceCategory {
  EXCELLENT = 'EXCELLENT', // < 100ms
  GOOD = 'GOOD', // 100-299ms
  FAIR = 'FAIR', // 300-999ms
  POOR = 'POOR', // 1000-2999ms
  CRITICAL = 'CRITICAL', // >= 3000ms
}
