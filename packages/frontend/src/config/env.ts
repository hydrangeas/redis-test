/**
 * フロントエンド環境変数の型定義
 */
export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
}

/**
 * 環境変数の検証とエラーメッセージ
 */
function validateEnvVar(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * 環境変数の読み込みと検証
 */
function loadEnvConfig(): EnvConfig {
  try {
    return {
      supabaseUrl: validateEnvVar(
        "VITE_SUPABASE_URL",
        import.meta.env.VITE_SUPABASE_URL
      ),
      supabaseAnonKey: validateEnvVar(
        "VITE_SUPABASE_ANON_KEY",
        import.meta.env.VITE_SUPABASE_ANON_KEY
      ),
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
    };
  } catch (error) {
    console.error("Environment configuration error:", error);
    throw error;
  }
}

/**
 * 環境変数設定のシングルトンインスタンス
 */
export const env = loadEnvConfig();

/**
 * 開発環境かどうかの判定
 */
export const isDevelopment = import.meta.env.DEV;

/**
 * 本番環境かどうかの判定
 */
export const isProduction = import.meta.env.PROD;
