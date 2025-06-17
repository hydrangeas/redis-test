import { Result } from '@/domain/errors/result';

export interface IJWTValidator {
  /**
   * JWTトークンの形式と署名を検証
   * @param token JWTトークン文字列
   * @returns 検証結果
   */
  validateToken(token: string): Promise<Result<void>>;

  /**
   * トークンをデコードしてペイロードを取得（検証なし）
   * @param token JWTトークン文字列
   * @returns デコードされたペイロード
   */
  decodeToken<T = any>(token: string): T | null;
}
