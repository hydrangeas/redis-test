/**
 * 環境タイプの定義
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * ログレベルの定義
 */
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * ユーザーティアの定義
 */
export type UserTier = 'tier1' | 'tier2' | 'tier3';

/**
 * レート制限設定の型定義
 */
export interface RateLimitConfig {
  tier1: number;
  tier2: number;
  tier3: number;
  windowSeconds: number;
}
