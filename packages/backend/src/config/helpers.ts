import { config } from './loader.js';

export function isDevelopment(): boolean {
  return config.app.env === 'development';
}

export function isStaging(): boolean {
  return config.app.env === 'staging';
}

export function isProduction(): boolean {
  return config.app.env === 'production';
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

export function getLogLevel(): string {
  if (isTest()) return 'silent';
  return config.logging.level;
}

export function getCorsOrigins(): string[] {
  if (isDevelopment()) {
    return ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'];
  }
  return config.security.cors.origins;
}

export function getRateLimitConfig(tier: string): { max: number; window: number } {
  const lowerTier = tier.toLowerCase() as 'tier1' | 'tier2' | 'tier3';
  const tierConfig = config.rateLimit.tiers[lowerTier];
  if (!tierConfig) {
    throw new Error(`Unknown tier: ${tier}`);
  }
  return tierConfig;
}

export function getFeatureFlag(feature: keyof typeof config.features): boolean {
  return config.features[feature];
}

export function getServerConfig(): { port: number; host: string; baseUrl: string } {
  return {
    port: config.server.port,
    host: config.server.host,
    baseUrl: config.server.baseUrl,
  };
}

export function getSupabaseConfig(): { url: string | undefined; anonKey: string | undefined; serviceRoleKey: string | undefined } {
  return {
    url: config.supabase.url,
    anonKey: config.supabase.anonKey,
    serviceRoleKey: config.supabase.serviceRoleKey,
  };
}

export function getSecurityConfig(): { jwtSecret: string; encryptionKey: string; cors: { origins: string[]; credentials: boolean } } {
  return {
    jwtSecret: config.security.jwtSecret,
    encryptionKey: config.security.encryptionKey,
    cors: config.security.cors,
  };
}
