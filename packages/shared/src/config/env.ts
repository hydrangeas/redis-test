import { z } from 'zod';

/**
 * 環境変数のスキーマ定義
 */
const envSchema = z.object({
  // Supabase
  PUBLIC_SUPABASE_URL: z.string().url().describe('Supabase project URL'),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).describe('Supabase anonymous key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().describe('Supabase service role key'),

  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Rate Limiting
  RATE_LIMIT_TIER1: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_TIER2: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_TIER3: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60),

  // JWT
  JWT_SECRET: z.string().min(32).optional().describe('JWT secret key'),

  // Data Directory
  DATA_DIRECTORY: z.string().default('./data'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // API
  API_PREFIX: z.string().default('/api'),
  API_VERSION: z.string().default('v1'),

  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Session
  SESSION_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().default(30),
});

/**
 * 環境変数の型定義
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * クライアントサイドで安全に使用できる環境変数
 */
export type PublicEnvConfig = Pick<
  EnvConfig,
  | 'PUBLIC_SUPABASE_URL'
  | 'PUBLIC_SUPABASE_ANON_KEY'
  | 'NODE_ENV'
  | 'API_PREFIX'
  | 'API_VERSION'
  | 'FRONTEND_URL'
>;

/**
 * 環境変数を検証して型安全なオブジェクトを返す
 * @param env 環境変数オブジェクト
 * @returns 検証済みの環境変数
 */
export function validateEnv(env: Record<string, string | undefined>): EnvConfig {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');

      throw new Error(
        `Environment variable validation failed:\n${missingVars}\n\n` +
          'Please check your .env file and ensure all required variables are set.',
      );
    }
    throw error;
  }
}

/**
 * クライアントサイドの環境変数を取得
 * @param env 環境変数オブジェクト
 * @returns パブリックな環境変数のみ
 */
export function getPublicEnv(env: EnvConfig): PublicEnvConfig {
  return {
    PUBLIC_SUPABASE_URL: env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: env.PUBLIC_SUPABASE_ANON_KEY,
    NODE_ENV: env.NODE_ENV,
    API_PREFIX: env.API_PREFIX,
    API_VERSION: env.API_VERSION,
    FRONTEND_URL: env.FRONTEND_URL,
  };
}

/**
 * 環境に応じた設定を取得
 */
export function getEnvironmentConfig(env: EnvConfig): {
  isDevelopment: boolean;
  isProduction: boolean;
  isStaging: boolean;
  isTest: boolean;
  logLevel: string;
  corsOrigins: string[];
  rateLimit: {
    tier1: number;
    tier2: number;
    tier3: number;
    window: number;
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    refreshTokenExpiresIn: string;
  };
  api: {
    baseUrl: string;
    port: number;
    host: string;
  };
  frontend: {
    url: string;
  };
} {
  const isDevelopment = env.NODE_ENV === 'development';
  const isProduction = env.NODE_ENV === 'production';
  const isStaging = env.NODE_ENV === 'staging';

  return {
    isDevelopment,
    isProduction,
    isStaging,
    isTest: process.env.NODE_ENV === 'test',

    // ログレベル
    logLevel: env.LOG_LEVEL,

    // CORS設定
    corsOrigins: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),

    // レート制限設定
    rateLimit: {
      tier1: env.RATE_LIMIT_TIER1,
      tier2: env.RATE_LIMIT_TIER2,
      tier3: env.RATE_LIMIT_TIER3,
      window: env.RATE_LIMIT_WINDOW,
    },

    // セキュリティ設定
    security: {
      jwtSecret: env.JWT_SECRET || '',
      jwtExpiresIn: `${env.SESSION_EXPIRY_HOURS}h`,
      refreshTokenExpiresIn: `${env.REFRESH_TOKEN_EXPIRY_DAYS}d`,
    },

    // API設定
    api: {
      baseUrl: `${env.API_PREFIX}/${env.API_VERSION}`,
      port: env.PORT,
      host: env.HOST,
    },

    // フロントエンド設定
    frontend: {
      url: env.FRONTEND_URL,
    },
  };
}
