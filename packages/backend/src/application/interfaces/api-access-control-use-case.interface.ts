import type { RateLimitCheckResult } from './rate-limit-use-case.interface';
import type { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import type { Result } from '@/domain/shared/result';


/**
 * APIアクセス許可の結果
 */
export interface APIAccessDecision {
  allowed: boolean;
  reason?: 'authenticated' | 'rate_limit_exceeded' | 'unauthorized' | 'endpoint_not_found';
  rateLimitStatus?: RateLimitCheckResult;
  message?: string;
}

/**
 * APIアクセスログのメタデータ
 */
export interface APIAccessMetadata {
  userAgent?: string;
  ipAddress?: string;
  correlationId?: string;
  requestId?: string;
}

/**
 * APIアクセス制御ユースケースのインターフェース
 * 認証、認可、レート制限を統合的に管理
 */
export interface IAPIAccessControlUseCase {
  /**
   * APIアクセスの可否を総合的に判断し、アクセスログを記録
   *
   * @param user - 認証済みユーザー
   * @param endpoint - アクセス先のエンドポイントパス
   * @param method - HTTPメソッド
   * @param metadata - 追加のメタデータ
   * @returns アクセス可否の決定結果
   */
  checkAndRecordAccess(
    user: AuthenticatedUser,
    endpoint: string,
    method: string,
    metadata?: APIAccessMetadata,
  ): Promise<Result<APIAccessDecision>>;

  /**
   * 公開エンドポイントへのアクセスを記録
   *
   * @param endpoint - アクセス先のエンドポイントパス
   * @param method - HTTPメソッド
   * @param metadata - 追加のメタデータ
   * @returns 記録の成功/失敗
   */
  recordPublicAccess(
    endpoint: string,
    method: string,
    metadata?: APIAccessMetadata,
  ): Promise<Result<void>>;
}
