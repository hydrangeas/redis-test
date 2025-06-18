export * from './schema.js';
export * from './loader.js';
export * from './helpers.js';
export { developmentConfig } from './environments/development.js';
export { stagingConfig } from './environments/staging.js';
export { productionConfig } from './environments/production.js';

// 既存のEnvConfigとの互換性を保つためのエクスポート
import { config } from './loader.js';

// 既存のEnvConfig型との互換性を保つ
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  HOST: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  LOG_LEVEL: string;
  RATE_LIMIT_ENABLED: boolean;
  TIER1_RATE_LIMIT_MAX: number;
  TIER1_RATE_LIMIT_WINDOW: number;
  TIER2_RATE_LIMIT_MAX: number;
  TIER2_RATE_LIMIT_WINDOW: number;
  TIER3_RATE_LIMIT_MAX: number;
  TIER3_RATE_LIMIT_WINDOW: number;
}

// 新しい設定システムから既存のEnvConfig形式に変換
export function getEnvConfig(): EnvConfig {
  return {
    NODE_ENV: config.app.env,
    PORT: config.server.port,
    HOST: config.server.host,
    SUPABASE_URL: config.supabase.url || '',
    SUPABASE_SERVICE_ROLE_KEY: config.supabase.serviceRoleKey || '',
    SUPABASE_ANON_KEY: config.supabase.anonKey || '',
    LOG_LEVEL: config.logging.level,
    RATE_LIMIT_ENABLED: config.rateLimit.enabled,
    TIER1_RATE_LIMIT_MAX: config.rateLimit.tiers.tier1.max,
    TIER1_RATE_LIMIT_WINDOW: config.rateLimit.tiers.tier1.window,
    TIER2_RATE_LIMIT_MAX: config.rateLimit.tiers.tier2.max,
    TIER2_RATE_LIMIT_WINDOW: config.rateLimit.tiers.tier2.window,
    TIER3_RATE_LIMIT_MAX: config.rateLimit.tiers.tier3.max,
    TIER3_RATE_LIMIT_WINDOW: config.rateLimit.tiers.tier3.window,
  };
}
