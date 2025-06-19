
import type { APILogEntry } from '../entities/api-log-entry';
import type { LogId } from '../value-objects/log-id';
import type { TimeRange } from '../value-objects/time-range';
import type { UserId } from '@/domain/auth/value-objects/user-id';
import type { Result } from '@/domain/errors/result';

/**
 * APIログリポジトリのインターフェース
 * APIアクセスログの永続化と検索を管理
 */
export interface IAPILogRepository {
  /**
   * APIログエントリを保存
   * @param logEntry ログエントリ
   */
  save(logEntry: APILogEntry): Promise<Result<void>>;

  /**
   * IDでログエントリを検索
   * @param id ログID
   */
  findById(id: LogId): Promise<Result<APILogEntry | null>>;

  /**
   * ユーザーIDでログエントリを検索
   * @param userId ユーザーID
   * @param timeRange 時間範囲（オプション）
   * @param limit 取得件数上限
   */
  findByUserId(
    userId: UserId,
    timeRange?: TimeRange,
    limit?: number,
  ): Promise<Result<APILogEntry[]>>;

  /**
   * 時間範囲でログエントリを検索
   * @param timeRange 時間範囲
   * @param limit 取得件数上限
   */
  findByTimeRange(
    timeRange: TimeRange,
    limit?: number,
  ): Promise<Result<APILogEntry[]>>;

  /**
   * エラーログのみを検索
   * @param timeRange 時間範囲
   * @param limit 取得件数上限
   */
  findErrors(timeRange?: TimeRange, limit?: number): Promise<Result<APILogEntry[]>>;

  /**
   * 統計情報を取得
   * @param timeRange 時間範囲
   */
  getStatistics(timeRange: TimeRange): Promise<
    Result<
      {
        totalRequests: number;
        uniqueUsers: number;
        errorCount: number;
        averageResponseTime: number;
        requestsByEndpoint: Map<string, number>;
        requestsByStatus: Map<number, number>;
      }
    >
  >;

  /**
   * 古いログエントリを削除
   * @param beforeDate この日付より前のログを削除
   */
  deleteOldLogs(beforeDate: Date): Promise<Result<number>>;

  /**
   * 複数のログエントリを一括保存
   * @param logEntries ログエントリの配列
   */
  saveMany(logEntries: APILogEntry[]): Promise<Result<void>>;

  /**
   * 遅いリクエストを検索
   * @param thresholdMs 閾値（ミリ秒）
   * @param limit 取得件数上限
   */
  findSlowRequests(
    thresholdMs: number,
    limit?: number,
  ): Promise<Result<APILogEntry[]>>;

  /**
   * エラーログを検索（オプション付き）
   * @param options 検索オプション
   */
  findErrors(options?: {
    userId?: UserId;
    limit?: number;
    offset?: number;
  }): Promise<Result<APILogEntry[]>>;
}
