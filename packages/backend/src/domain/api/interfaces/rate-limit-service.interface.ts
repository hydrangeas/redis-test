import type { Endpoint as APIEndpoint } from '../value-objects/endpoint';
import type { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';


/**
 * レート制限チェック結果
 */
export interface RateLimitCheckResult {
  /** アクセスが許可されているか */
  allowed: boolean;
  /** レート制限上限 */
  limit: number;
  /** 残りリクエスト数 */
  remaining: number;
  /** リセット時刻 */
  resetAt: Date;
  /** リトライまでの秒数（制限超過時） */
  retryAfter?: number;
}

/**
 * レート制限サービスのインターフェース
 * APIアクセスのレート制限を管理
 */
export interface IRateLimitService {
  /**
   * レート制限をチェック
   * @param user 認証済みユーザー
   * @param endpoint APIエンドポイント
   */
  checkLimit(user: AuthenticatedUser, endpoint: APIEndpoint): Promise<RateLimitCheckResult>;

  /**
   * APIアクセスを記録
   * @param user 認証済みユーザー
   * @param endpoint APIエンドポイント
   */
  recordUsage(user: AuthenticatedUser, endpoint: APIEndpoint): Promise<void>;

  /**
   * ユーザーの現在の使用状況を取得
   * @param user 認証済みユーザー
   */
  getUsageStatus(user: AuthenticatedUser): Promise<{
    currentCount: number;
    limit: number;
    windowStart: Date;
    windowEnd: Date;
  }>;

  /**
   * レート制限をリセット（管理用）
   * @param userId ユーザーID
   */
  resetLimit(userId: string): Promise<void>;
}
