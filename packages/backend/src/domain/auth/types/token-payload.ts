/**
 * JWTトークンのペイロード型定義
 * Supabase Authが生成するトークンの構造に準拠
 */
export interface TokenPayload {
  sub: string;           // User ID (Supabase標準)
  email?: string;        // ユーザーのメールアドレス
  app_metadata: {
    tier: string;        // ユーザーティア (tier1, tier2, tier3)
    [key: string]: any;  // その他のメタデータ
  };
  user_metadata?: {
    [key: string]: any;
  };
  aud: string;          // Audience
  exp: number;          // 有効期限（Unix timestamp）
  iat: number;          // 発行時刻（Unix timestamp）
  iss: string;          // Issuer
  role?: string;        // Supabaseロール
}