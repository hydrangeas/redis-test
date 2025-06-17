import { config as appConfig } from '../../config/index.js';

import type { EnvConfig } from './env.config.js';

/**
 * 新しい設定システムから既存のEnvConfig形式に変換するアダプター
 */
export function adaptConfigToEnv(): EnvConfig {
  return {
    // Application
    NODE_ENV: appConfig.app.env as 'development' | 'staging' | 'production',
    PORT: appConfig.server.port,
    HOST: appConfig.server.host,
    LOG_LEVEL: appConfig.logging.level as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace',

    // Supabase
    PUBLIC_SUPABASE_URL: appConfig.supabase.url,
    PUBLIC_SUPABASE_ANON_KEY: appConfig.supabase.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: appConfig.supabase.serviceRoleKey,
    SUPABASE_URL: appConfig.supabase.url,
    SUPABASE_ANON_KEY: appConfig.supabase.anonKey,

    // JWT
    JWT_SECRET: appConfig.security.jwtSecret,

    // API Configuration
    API_BASE_URL: appConfig.server.baseUrl,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

    // Rate Limiting
    RATE_LIMIT_TIER1: appConfig.rateLimit.tiers.tier1.max,
    RATE_LIMIT_TIER2: appConfig.rateLimit.tiers.tier2.max,
    RATE_LIMIT_TIER3: appConfig.rateLimit.tiers.tier3.max,
    RATE_LIMIT_WINDOW: appConfig.rateLimit.tiers.tier1.window,
    
    // Data Directory
    DATA_DIRECTORY: process.env.DATA_DIRECTORY || './data',
  };
}

// 既存のgetEnvConfig関数を新しいシステムで上書き
export { adaptConfigToEnv as getEnvConfig };
