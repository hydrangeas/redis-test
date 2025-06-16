import { Result } from '@/domain/shared/result';

/**
 * JWTトークンのペイロード
 */
export interface JWTPayload {
  sub: string; // ユーザーID
  tier?: string; // ユーザーティア
  exp?: number; // 有効期限
  iat?: number; // 発行時刻
  [key: string]: any; // その他のカスタムクレーム
}

/**
 * JWTサービスのインターフェース
 * アクセストークンとリフレッシュトークンの生成・検証を行う
 */
export interface IJWTService {
  /**
   * アクセストークンを生成する
   * @param userId ユーザーID
   * @param tier ユーザーティア
   * @returns 生成されたトークン
   */
  generateAccessToken(userId: string, tier: string): Promise<Result<string>>;

  /**
   * リフレッシュトークンを生成する
   * @param userId ユーザーID
   * @returns 生成されたトークン
   */
  generateRefreshToken(userId: string): Promise<Result<string>>;

  /**
   * アクセストークンを検証する
   * @param token 検証するトークン
   * @returns トークンのペイロード
   */
  verifyAccessToken(token: string): Promise<Result<JWTPayload>>;

  /**
   * リフレッシュトークンを検証する
   * @param token 検証するトークン
   * @returns トークンのペイロード
   */
  verifyRefreshToken(token: string): Promise<Result<JWTPayload>>;

  /**
   * トークンをデコードする（検証なし）
   * @param token デコードするトークン
   * @returns トークンのペイロード
   */
  decodeToken(token: string): JWTPayload | null;
}
