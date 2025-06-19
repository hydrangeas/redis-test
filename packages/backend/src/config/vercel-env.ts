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
  ENABLE_RATE_LIMIT: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  RATE_LIMIT_REDIS_URL: z.string().optional(),
});

export function loadVercelEnv(): {
  supabase: {
    url: string;
    serviceRoleKey: string;
    anonKey: string;
  };
  vercel: {
    region?: string;
    url?: string;
    env?: 'production' | 'preview' | 'development';
  };
  features: {
    enableRateLimit: boolean;
  };
  redis?: {
    url: string;
  };
  environment: {
    isProduction: boolean;
    isPreview: boolean;
    isDevelopment: boolean;
  };
} {
  const env = vercelEnvSchema.parse(process.env);

  // Vercel環境に応じた設定
  const isProduction = env.VERCEL_ENV === 'production';
  const isPreview = env.VERCEL_ENV === 'preview';

  return {
    supabase: {
      url: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      anonKey: env.SUPABASE_ANON_KEY,
    },
    vercel: {
      region: env.VERCEL_REGION,
      url: env.VERCEL_URL,
      env: env.VERCEL_ENV,
    },
    features: {
      enableRateLimit: env.ENABLE_RATE_LIMIT,
    },
    redis: env.RATE_LIMIT_REDIS_URL ? { url: env.RATE_LIMIT_REDIS_URL } : undefined,
    environment: {
      isProduction,
      isPreview,
      isDevelopment: !env.VERCEL_ENV || env.VERCEL_ENV === 'development',
    },
  };
}
