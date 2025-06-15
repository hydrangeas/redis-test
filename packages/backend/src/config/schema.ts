import { z } from 'zod';

// 基本設定スキーマ
const baseConfigSchema = z.object({
  app: z.object({
    name: z.string().default('Open Data API'),
    version: z.string().default('1.0.0'),
    env: z.enum(['development', 'staging', 'production']),
  }),
  
  server: z.object({
    port: z.number().int().positive().default(3000),
    host: z.string().default('0.0.0.0'),
    baseUrl: z.string().url(),
  }),
  
  supabase: z.object({
    url: z.string().url(),
    anonKey: z.string().min(1),
    serviceRoleKey: z.string().min(1),
  }),
  
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
    pretty: z.boolean().default(false),
  }),
  
  security: z.object({
    cors: z.object({
      origins: z.array(z.string()).default(['*']),
      credentials: z.boolean().default(true),
    }),
    jwtSecret: z.string().min(32),
    encryptionKey: z.string().min(32),
  }),
  
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    tiers: z.object({
      tier1: z.object({
        max: z.number().int().positive(),
        window: z.number().int().positive(),
      }),
      tier2: z.object({
        max: z.number().int().positive(),
        window: z.number().int().positive(),
      }),
      tier3: z.object({
        max: z.number().int().positive(),
        window: z.number().int().positive(),
      }),
    }),
  }),
  
  features: z.object({
    apiDocs: z.boolean().default(true),
    healthCheck: z.boolean().default(true),
    metrics: z.boolean().default(false),
  }),
});

// 環境別の拡張スキーマ
export const developmentConfigSchema = baseConfigSchema.extend({
  development: z.object({
    debug: z.boolean().default(true),
    mockData: z.boolean().default(false),
    hotReload: z.boolean().default(true),
  }),
});

export const stagingConfigSchema = baseConfigSchema.extend({
  staging: z.object({
    testUsers: z.array(z.string()).optional(),
    debugEndpoints: z.boolean().default(true),
  }),
});

export const productionConfigSchema = baseConfigSchema.extend({
  production: z.object({
    monitoring: z.object({
      enabled: z.boolean().default(true),
      endpoint: z.string().url().optional(),
    }),
    backup: z.object({
      enabled: z.boolean().default(true),
      schedule: z.string().default('0 2 * * *'),
    }),
  }),
});

export type Config = z.infer<typeof baseConfigSchema>;
export type DevelopmentConfig = z.infer<typeof developmentConfigSchema>;
export type StagingConfig = z.infer<typeof stagingConfigSchema>;
export type ProductionConfig = z.infer<typeof productionConfigSchema>;