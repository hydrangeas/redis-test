import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';

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
  /** リセット時刻（Unix timestamp） */
  resetAt: number;
  /** リトライまでの秒数（制限超過時） */
  retryAfter?: number;
}

/**
 * レート制限ユースケースのインターフェース
 * APIアクセスのレート制限チェックと記録を管理
 */
export interface IRateLimitUseCase {
  /**
   * レート制限をチェックし、アクセスを記録
   * @param user 認証済みユーザー
   * @param endpoint APIエンドポイントパス
   * @param method HTTPメソッド
   * @returns レート制限チェック結果
   */
  checkAndRecordAccess(
    user: AuthenticatedUser,
    endpoint: string,
    method: string,
  ): Promise<Result<RateLimitCheckResult, DomainError>>;

  /**
   * ユーザーの現在の使用状況を取得
   * @param user 認証済みユーザー
   * @returns 使用状況情報
   */
  getUserUsageStatus(user: AuthenticatedUser): Promise<
    Result<
      {
        currentCount: number;
        limit: number;
        windowStart: Date;
        windowEnd: Date;
      },
      DomainError
    >
  >;

  /**
   * レート制限をリセット（管理用）
   * @param userId ユーザーID
   * @returns 成功または失敗の結果
   */
  resetUserLimit(userId: string): Promise<Result<void, DomainError>>;
}
