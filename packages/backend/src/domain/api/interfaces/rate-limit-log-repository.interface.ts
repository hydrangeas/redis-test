import { RateLimitLog } from '../entities/rate-limit-log.entity';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { EndpointId } from '../value-objects/endpoint-id';
import { RateLimitWindow } from '../value-objects/rate-limit-window';
import { Result } from '@/domain/errors/result';

/**
 * レート制限ログリポジトリインターフェース
 * レート制限のログを永続化
 */
export interface IRateLimitLogRepository {
  /**
   * レート制限ログを保存
   */
  save(log: RateLimitLog): Promise<Result<void>>;

  /**
   * 複数のログを一括保存
   */
  saveMany(logs: RateLimitLog[]): Promise<Result<void>>;

  /**
   * ユーザーとエンドポイントの組み合わせでログを検索
   */
  findByUserAndEndpoint(
    userId: UserId,
    endpointId: EndpointId,
    window: RateLimitWindow,
  ): Promise<Result<RateLimitLog[]>>;

  /**
   * 特定のユーザーの全ログを取得
   */
  findByUser(
    userId: UserId,
    window?: RateLimitWindow,
  ): Promise<Result<RateLimitLog[]>>;

  /**
   * 特定のエンドポイントの全ログを取得
   */
  findByEndpoint(
    endpointId: EndpointId,
    window?: RateLimitWindow,
  ): Promise<Result<RateLimitLog[]>>;

  /**
   * 古いログを削除
   */
  deleteOldLogs(beforeDate: Date): Promise<Result<number>>;

  /**
   * 特定期間のリクエスト数を集計
   */
  countRequests(
    userId: UserId,
    endpointId: EndpointId,
    window: RateLimitWindow,
  ): Promise<Result<number>>;
}
