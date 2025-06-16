import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { developmentConfigSchema, stagingConfigSchema, productionConfigSchema } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: any;

  private constructor() {
    this.loadEnvironmentVariables();
    this.config = this.buildConfig();
    this.validateConfig();
  }

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  private loadEnvironmentVariables() {
    const env = process.env.NODE_ENV || 'development';

    // 環境別の.envファイルを読み込む
    const envFiles = [`.env.${env}.local`, `.env.${env}`, '.env.local', '.env'];

    // プロジェクトルートから読み込む
    const projectRoot = join(__dirname, '../../../../');

    for (const file of envFiles) {
      const path = join(projectRoot, file);
      if (existsSync(path)) {
        dotenvConfig({ path });
        console.log(`Loaded environment from ${file}`);
        break;
      }
    }
  }

  private buildConfig() {
    const env = process.env.NODE_ENV || 'development';

    return {
      app: {
        name: process.env.APP_NAME,
        version: process.env.APP_VERSION,
        env,
      },

      server: {
        port: parseInt(process.env.API_PORT || process.env.PORT || '3000', 10),
        host: process.env.API_HOST || process.env.HOST || '0.0.0.0',
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      },

      supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },

      logging: {
        level: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
        pretty: env !== 'production',
      },

      security: {
        cors: {
          origins: (process.env.CORS_ORIGINS || '*').split(','),
          credentials: true,
        },
        jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-for-development-only',
        encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-for-dev-only',
      },

      rateLimit: {
        enabled: process.env.RATE_LIMIT_ENABLED === 'true',
        tiers: {
          tier1: {
            max: parseInt(process.env.RATE_LIMIT_TIER1_MAX || '60', 10),
            window: parseInt(process.env.RATE_LIMIT_TIER1_WINDOW || '60', 10),
          },
          tier2: {
            max: parseInt(process.env.RATE_LIMIT_TIER2_MAX || '120', 10),
            window: parseInt(process.env.RATE_LIMIT_TIER2_WINDOW || '60', 10),
          },
          tier3: {
            max: parseInt(process.env.RATE_LIMIT_TIER3_MAX || '300', 10),
            window: parseInt(process.env.RATE_LIMIT_TIER3_WINDOW || '60', 10),
          },
        },
      },

      features: {
        apiDocs: process.env.FEATURE_API_DOCS_ENABLED !== 'false',
        healthCheck: process.env.FEATURE_HEALTH_CHECK_ENABLED !== 'false',
        metrics: process.env.FEATURE_METRICS_ENABLED === 'true',
      },

      // 環境別の追加設定
      ...(env === 'development' && {
        development: {
          debug: true,
          mockData: process.env.USE_MOCK_DATA === 'true',
          hotReload: true,
        },
      }),

      ...(env === 'staging' && {
        staging: {
          testUsers: process.env.TEST_USERS?.split(','),
          debugEndpoints: true,
        },
      }),

      ...(env === 'production' && {
        production: {
          monitoring: {
            enabled: true,
            endpoint: process.env.MONITORING_ENDPOINT,
          },
          backup: {
            enabled: true,
            schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
          },
        },
      }),
    };
  }

  private validateConfig() {
    const env = this.config.app.env;
    let schema;

    switch (env) {
      case 'development':
        schema = developmentConfigSchema;
        break;
      case 'staging':
        schema = stagingConfigSchema;
        break;
      case 'production':
        schema = productionConfigSchema;
        break;
      default:
        throw new Error(`Unknown environment: ${env}`);
    }

    try {
      this.config = schema.parse(this.config);
    } catch (error) {
      console.error('Configuration validation failed:', error);
      throw new Error('Invalid configuration');
    }
  }

  getConfig() {
    return this.config;
  }

  get<T>(path: string): T {
    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        throw new Error(`Configuration key not found: ${path}`);
      }
    }

    return value as T;
  }
}

// シングルトンインスタンスのエクスポート
export const config = ConfigLoader.getInstance().getConfig();
