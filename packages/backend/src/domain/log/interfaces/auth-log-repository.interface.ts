import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import { AuthLogEntry } from '../entities/auth-log-entry';
import { LogId } from '../value-objects/log-id';
import { TimeRange } from '../value-objects/time-range';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { EventType } from '../value-objects/auth-event';
import { IPAddress } from '../value-objects/ip-address';

/**
 * 認証ログリポジトリのインターフェース
 * 認証関連イベントのログの永続化と検索を管理
 */
export interface IAuthLogRepository {
  /**
   * 認証ログエントリを保存
   * @param logEntry ログエントリ
   */
  save(logEntry: AuthLogEntry): Promise<Result<void, DomainError>>;

  /**
   * IDでログエントリを検索
   * @param id ログID
   */
  findById(id: LogId): Promise<Result<AuthLogEntry | null, DomainError>>;

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
  ): Promise<Result<AuthLogEntry[], DomainError>>;

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
  ): Promise<Result<AuthLogEntry[], DomainError>>;

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
  ): Promise<Result<AuthLogEntry[], DomainError>>;

  /**
   * 失敗ログのみを検索
   * @param timeRange 時間範囲
   * @param limit 取得件数上限
   */
  findFailures(timeRange?: TimeRange, limit?: number): Promise<Result<AuthLogEntry[], DomainError>>;

  /**
   * 疑わしい活動のログを検索
   * @param timeRange 時間範囲
   * @param limit 取得件数上限
   */
  findSuspiciousActivities(
    timeRange?: TimeRange,
    limit?: number,
  ): Promise<Result<AuthLogEntry[], DomainError>>;

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
      },
      DomainError
    >
  >;

  /**
   * 古いログエントリを削除
   * @param beforeDate この日付より前のログを削除
   */
  deleteOldLogs(beforeDate: Date): Promise<Result<number, DomainError>>;
}
