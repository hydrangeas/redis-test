import { createClient } from '@supabase/supabase-js';
import { getPublicEnv } from '@opendata-api/shared';

// 環境変数から設定を取得
const env = getPublicEnv({
  PUBLIC_SUPABASE_URL: import.meta.env.VITE_PUBLIC_SUPABASE_URL || '',
  PUBLIC_SUPABASE_ANON_KEY: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '',
  NODE_ENV: import.meta.env.MODE as 'development' | 'staging' | 'production',
  API_PREFIX: import.meta.env.VITE_API_PREFIX || '/api',
  API_VERSION: import.meta.env.VITE_API_VERSION || 'v1',
  FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || window.location.origin,
});

// Supabaseクライアントの作成
export const supabase = createClient(
  env.PUBLIC_SUPABASE_URL,
  env.PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// API URLヘルパー
export const getApiUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const apiPath = `${env.API_PREFIX}/${env.API_VERSION}`;
  return `${baseUrl}${apiPath}${path}`;
};