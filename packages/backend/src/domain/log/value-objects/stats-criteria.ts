import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

import type { TimeRange } from './time-range';

/**
 * 統計条件を表すバリューオブジェクト
 */
export class StatsCriteria {
  private constructor(
    private readonly _timeRange: TimeRange,
    private readonly _groupBy?: string,
    private readonly _filters?: Map<string, unknown>,
    private readonly _metrics?: string[],
  ) {
    Object.freeze(this);
    if (this._filters) {
      Object.freeze(this._filters);
    }
    if (this._metrics) {
      Object.freeze(this._metrics);
    }
  }

  /**
   * 時間範囲を取得
   */
  get timeRange(): TimeRange {
    return this._timeRange;
  }

  /**
   * グループ化キーを取得
   */
  get groupBy(): string | undefined {
    return this._groupBy;
  }

  /**
   * フィルター条件を取得
   */
  get filters(): Map<string, unknown> {
    return new Map(this._filters || []);
  }

  /**
   * メトリクスを取得
   */
  get metrics(): string[] {
    return [...(this._metrics || [])];
  }

  /**
   * 統計条件を作成
   */
  static create(params: {
    timeRange: TimeRange;
    groupBy?: string;
    filters?: Record<string, unknown>;
    metrics?: string[];
  }): Result<StatsCriteria> {
    const { timeRange, groupBy, filters, metrics } = params;

    if (!timeRange) {
      return Result.fail<StatsCriteria>(new DomainError('STATS_CRITERIA_ERROR', '時間範囲は必須です', ErrorType.VALIDATION));
    }

    // グループ化キーの検証
    if (groupBy) {
      const validGroupByKeys = [
        'userId',
        'endpoint',
        'provider',
        'statusCode',
        'hour',
        'day',
        'month',
      ];
      if (!validGroupByKeys.includes(groupBy)) {
        return Result.fail<StatsCriteria>(new DomainError('INVALID_GROUP_BY', `無効なグループ化キー: ${groupBy}`, ErrorType.VALIDATION));
      }
    }

    // メトリクスの検証
    if (metrics && metrics.length > 0) {
      const validMetrics = [
        'count',
        'uniqueUsers',
        'averageResponseTime',
        'errorRate',
        'successRate',
        'p95ResponseTime',
        'p99ResponseTime',
      ];
      const invalidMetrics = metrics.filter((m) => !validMetrics.includes(m));
      if (invalidMetrics.length > 0) {
        return Result.fail<StatsCriteria>(new DomainError('INVALID_METRICS', `無効なメトリクス: ${invalidMetrics.join(', ')}`, ErrorType.VALIDATION));
      }
    }

    // フィルターをMapに変換
    const filterMap = filters ? new Map(Object.entries(filters)) : undefined;

    return Result.ok(new StatsCriteria(timeRange, groupBy, filterMap, metrics));
  }

  /**
   * デフォルトの認証統計条件を作成
   */
  static forAuthStats(timeRange: TimeRange): StatsCriteria {
    const result = StatsCriteria.create({
      timeRange,
      groupBy: 'provider',
      metrics: ['count', 'uniqueUsers', 'successRate'],
    });
    if (result.isFailure) {
      throw result.getError();
    }
    return result.getValue();
  }

  /**
   * デフォルトのAPI統計条件を作成
   */
  static forAPIStats(timeRange: TimeRange): StatsCriteria {
    const result = StatsCriteria.create({
      timeRange,
      groupBy: 'endpoint',
      metrics: ['count', 'averageResponseTime', 'errorRate', 'p95ResponseTime'],
    });
    if (result.isFailure) {
      throw result.getError();
    }
    return result.getValue();
  }

  /**
   * フィルターを追加した新しい条件を作成
   */
  withFilter(key: string, value: unknown): StatsCriteria {
    const newFilters = new Map(this._filters || []);
    newFilters.set(key, value);

    return new StatsCriteria(this._timeRange, this._groupBy, newFilters, this._metrics);
  }

  /**
   * グループ化を変更した新しい条件を作成
   */
  withGroupBy(groupBy: string): Result<StatsCriteria> {
    return StatsCriteria.create({
      timeRange: this._timeRange,
      groupBy,
      filters: this._filters ? Object.fromEntries(this._filters) : undefined,
      metrics: this._metrics,
    });
  }

  /**
   * 等価性の比較
   */
  equals(other: StatsCriteria): boolean {
    if (!other) return false;

    // 時間範囲の比較
    if (!this._timeRange.equals(other._timeRange)) return false;

    // グループ化キーの比較
    if (this._groupBy !== other._groupBy) return false;

    // フィルターの比較
    const thisFilters = this._filters || new Map();
    const otherFilters = other._filters || new Map();
    if (thisFilters.size !== otherFilters.size) return false;
    for (const [key, value] of thisFilters) {
      if (!otherFilters.has(key) || otherFilters.get(key) !== value) {
        return false;
      }
    }

    // メトリクスの比較
    const thisMetrics = this._metrics || [];
    const otherMetrics = other._metrics || [];
    if (thisMetrics.length !== otherMetrics.length) return false;
    return thisMetrics.every((m) => otherMetrics.includes(m));
  }

  /**
   * JSON表現を返す
   */
  toJSON(): {
    timeRange: { start: string; end: string };
    groupBy?: string;
    filters?: Record<string, unknown>;
    metrics?: string[];
  } {
    return {
      timeRange: this._timeRange.toJSON(),
      ...(this._groupBy && { groupBy: this._groupBy }),
      ...(this._filters &&
        this._filters.size > 0 && {
          filters: Object.fromEntries(this._filters),
        }),
      ...(this._metrics &&
        this._metrics.length > 0 && {
          metrics: this._metrics,
        }),
    };
  }
}
