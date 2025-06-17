import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

/**
 * 時間範囲を表すバリューオブジェクト
 */
export class TimeRange {
  private constructor(
    private readonly _start: Date,
    private readonly _end: Date,
  ) {
    Object.freeze(this);
  }

  /**
   * 開始日時を取得
   */
  get start(): Date {
    return new Date(this._start);
  }

  /**
   * 終了日時を取得
   */
  get end(): Date {
    return new Date(this._end);
  }

  /**
   * 時間範囲を作成
   */
  static create(start: Date, end: Date): Result<TimeRange> {
    if (!start || !end) {
      return Result.fail<TimeRange>(
        new DomainError('MISSING_DATE', '開始日時と終了日時は必須です', ErrorType.VALIDATION)
      );
    }

    if (!(start instanceof Date) || !(end instanceof Date)) {
      return Result.fail<TimeRange>(
        new DomainError('INVALID_DATE_TYPE', '開始日時と終了日時はDate型である必要があります', ErrorType.VALIDATION)
      );
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return Result.fail<TimeRange>(
        new DomainError('INVALID_DATE', '無効な日時が指定されました', ErrorType.VALIDATION)
      );
    }

    if (start > end) {
      return Result.fail<TimeRange>(
        new DomainError('INVALID_DATE_RANGE', '開始日時は終了日時より前である必要があります', ErrorType.VALIDATION)
      );
    }

    // 最大範囲を1年に制限
    const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1年
    if (end.getTime() - start.getTime() > maxRangeMs) {
      return Result.fail<TimeRange>(
        new DomainError('DATE_RANGE_TOO_LARGE', '時間範囲は最大1年までです', ErrorType.VALIDATION)
      );
    }

    return Result.ok(new TimeRange(new Date(start), new Date(end)));
  }

  /**
   * 過去N時間の範囲を作成
   */
  static lastHours(hours: number): TimeRange {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    const result = TimeRange.create(start, end);
    if (result.isFailure) {
      throw new Error(result.getError().message);
    }
    return result.getValue();
  }

  /**
   * 過去N日間の範囲を作成
   */
  static lastDays(days: number): TimeRange {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    const result = TimeRange.create(start, end);
    if (result.isFailure) {
      throw new Error(result.getError().message);
    }
    return result.getValue();
  }

  /**
   * 今日の範囲を作成
   */
  static today(): TimeRange {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    );
    const result = TimeRange.create(start, end);
    if (result.isFailure) {
      throw new Error(result.getError().message);
    }
    return result.getValue();
  }

  /**
   * 今月の範囲を作成
   */
  static thisMonth(): TimeRange {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    const result = TimeRange.create(start, end);
    if (result.isFailure) {
      throw new Error(result.getError().message);
    }
    return result.getValue();
  }

  /**
   * 時間範囲が有効かどうかを判定
   */
  isValid(): boolean {
    return this._start <= this._end;
  }

  /**
   * 指定された日時が範囲内に含まれるかを判定
   */
  contains(dateTime: Date): boolean {
    if (!dateTime || !(dateTime instanceof Date)) {
      return false;
    }
    return dateTime >= this._start && dateTime <= this._end;
  }

  /**
   * 期間の長さをミリ秒で取得
   */
  getDurationInMilliseconds(): number {
    return this._end.getTime() - this._start.getTime();
  }

  /**
   * 期間の長さを時間で取得
   */
  getDurationInHours(): number {
    return this.getDurationInMilliseconds() / (60 * 60 * 1000);
  }

  /**
   * 期間の長さを日数で取得
   */
  getDurationInDays(): number {
    return this.getDurationInMilliseconds() / (24 * 60 * 60 * 1000);
  }

  /**
   * 他の時間範囲と重複しているかを判定
   */
  overlaps(other: TimeRange): boolean {
    if (!other) return false;
    return this._start <= other._end && this._end >= other._start;
  }

  /**
   * 等価性の比較
   */
  equals(other: TimeRange): boolean {
    if (!other) return false;
    return (
      this._start.getTime() === other._start.getTime() &&
      this._end.getTime() === other._end.getTime()
    );
  }

  /**
   * 文字列表現を返す
   */
  toString(): string {
    return `${this._start.toISOString()} - ${this._end.toISOString()}`;
  }

  /**
   * JSON表現を返す
   */
  toJSON(): { start: string; end: string } {
    return {
      start: this._start.toISOString(),
      end: this._end.toISOString(),
    };
  }
}
