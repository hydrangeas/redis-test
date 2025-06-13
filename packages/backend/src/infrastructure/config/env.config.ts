import { z } from 'zod';

/**
 * 環境変数のスキーマ定義
 */
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production'] as const).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().positive()).default('8080'),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const).default('info'),
  
  // Supabase
  SUPABASE_URL: z.string().url().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  
  // API Configuration
  API_BASE_URL: z.string().url().default('http://localhost:8080'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  
  // Rate Limiting
  RATE_LIMIT_TIER1: z.string().transform(Number).pipe(z.number().positive()).default('60'),
  RATE_LIMIT_TIER2: z.string().transform(Number).pipe(z.number().positive()).default('120'),
  RATE_LIMIT_TIER3: z.string().transform(Number).pipe(z.number().positive()).default('300'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().positive()).default('60'),
});

/**
 * 環境変数の型定義
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * 環境変数のバリデーションエラークラス
 */
export class EnvValidationError extends Error {
  constructor(public readonly errors: z.ZodError) {
    super('Environment validation failed');
    this.name = 'EnvValidationError';
  }
}

/**
 * 環境変数のバリデーションと読み込み
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  try {
    const parsed = envSchema.parse(env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation errors:');
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      throw new EnvValidationError(error);
    }
    throw error;
  }
}

/**
 * シングルトンインスタンス
 */
let envConfig: EnvConfig | undefined;

/**
 * 環境変数設定の取得
 */
export function getEnvConfig(): EnvConfig {
  if (!envConfig) {
    envConfig = validateEnv();
  }
  return envConfig;
}

/**
 * 環境変数設定のリセット（テスト用）
 */
export function resetEnvConfig(): void {
  envConfig = undefined;
}