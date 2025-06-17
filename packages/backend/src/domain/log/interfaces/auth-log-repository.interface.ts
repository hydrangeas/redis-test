
import type { AuthLogEntry } from '../entities/auth-log-entry';
import type { EventType } from '../value-objects/auth-event';
import type { IPAddress } from '../value-objects/ip-address';
import type { LogId } from '../value-objects/log-id';
import type { TimeRange } from '../value-objects/time-range';
import type { UserId } from '@/domain/auth/value-objects/user-id';
import type { Result } from '@/domain/errors/result';

/**
 * 認証ログリポジトリのインターフェース
 * 認証関連イベントのログの永続化と検索を管理
 */
export interface IAuthLogRepository {
  /**
   * 認証ログエントリを保存
   * @param logEntry ログエントリ
   */
  save(logEntry: AuthLogEntry): Promise<Result<void>>;

  /**
   * IDでログエントリを検索
   * @param id ログID
   */
  findById(id: LogId): Promise<Result<AuthLogEntry | null>>;

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
  ): Promise<Result<AuthLogEntry[]>>;

  /**
   * イベントタイプでログエントリを検索
   * @param eventType イベントタイプ
   * @param timeRange 時間範囲（オプション）
   * @param limit 取得件数上限
   */
  findByEventType(
    eventType: EventType,
    timeRange?: TimeRange,
    limit?: number,
  ): Promise<Result<AuthLogEntry[]>>;

  /**
   * IPアドレスでログエントリを検索
   * @param ipAddress IPアドレス
   * @param timeRange 時間範囲（オプション）
   * @param limit 取得件数上限
   */
  findByIPAddress(
    ipAddress: IPAddress,
    timeRange?: TimeRange,
    limit?: number,
  ): Promise<Result<AuthLogEntry[]>>;

  /**
   * 失敗ログのみを検索
   * @param timeRange 時間範囲
   * @param limit 取得件数上限
   */
  findFailures(timeRange?: TimeRange, limit?: number): Promise<Result<AuthLogEntry[]>>;

  /**
   * 疑わしい活動のログを検索
   * @param timeRange 時間範囲
   * @param limit 取得件数上限
   */
  findSuspiciousActivities(
    timeRange?: TimeRange,
    limit?: number,
  ): Promise<Result<AuthLogEntry[]>>;

  /**
   * 統計情報を取得
   * @param timeRange 時間範囲
   */
  getStatistics(timeRange: TimeRange): Promise<
    Result<
      {
        totalAttempts: number;
        successfulLogins: number;
        failedLogins: number;
        uniqueUsers: number;
        suspiciousActivities: number;
        loginsByProvider: Map<string, number>;
        tokenRefreshCount: number;
      }
    >
  >;

  /**
   * 古いログエントリを削除
   * @param beforeDate この日付より前のログを削除
   */
  deleteOldLogs(beforeDate: Date): Promise<Result<number>>;
}
