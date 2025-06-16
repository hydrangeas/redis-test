import { RateLimiting } from '../aggregates/rate-limiting.aggregate';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { EndpointPath } from '../value-objects/endpoint-path';
import { Result } from '@/domain/errors/result';

/**
 * レート制限リポジトリインターフェース
 * レート制限集約の永続化を担当
 */
export interface IRateLimitRepository {
  /**
   * レート制限集約を保存
   */
  save(rateLimiting: RateLimiting): Promise<Result<void>>;

  /**
   * ユーザーIDとエンドポイントパスで検索
   */
  findByUserAndEndpoint(
    userId: UserId,
    endpointPath: EndpointPath,
  ): Promise<Result<RateLimiting | null>>;

  /**
   * ユーザーIDで現在のリクエスト数をカウント
   */
  countByUserId(userId: UserId): Promise<Result<number>>;

  /**
   * 古いレート制限データをクリーンアップ
   */
  cleanup(beforeDate: Date): Promise<Result<number>>;
}
