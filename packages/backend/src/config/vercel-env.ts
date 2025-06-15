import { z } from 'zod';

const vercelEnvSchema = z.object({
  // Vercel提供の環境変数
  VERCEL: z.string().optional(),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_REGION: z.string().optional(),
  
  // アプリケーション環境変数
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  
  // 機能フラグ
  ENABLE_RATE_LIMIT: z.string().transform(v => v === 'true').default('true'),
  RATE_LIMIT_REDIS_URL: z.string().optional(),
});

export function loadVercelEnv() {
  const env = vercelEnvSchema.parse(process.env);
  
  // Vercel環境に応じた設定
  const isProduction = env.VERCEL_ENV === 'production';
  const isPreview = env.VERCEL_ENV === 'preview';
  
  return {
    ...env,
    isProduction,
    isPreview,
    isDevelopment: !env.VERCEL_ENV || env.VERCEL_ENV === 'development',
    baseUrl: env.VERCEL_URL ? `https://${env.VERCEL_URL}` : 'http://localhost:3000',
  };
}