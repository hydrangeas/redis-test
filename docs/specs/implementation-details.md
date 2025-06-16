# 実装詳細ガイド

本ドキュメントは、静的モデリング（step5-design.md）で設計されたアーキテクチャの実装詳細を記載します。
TypeScript/Fastify/Vercel環境でのベストプラクティスに基づいた実装指針を提供します。

## 6. 横断的関心事の実装詳細

### 6.1 CORS設定

```typescript
// src/plugins/cors.ts
import { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';

export const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const isProduction = process.env.NODE_ENV === 'production';

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // 環境変数から許可するオリジンを取得
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || [];

      // 開発環境ではlocalhostを自動的に許可
      if (!isProduction) {
        allowedOrigins.push('http://localhost:3000');
        allowedOrigins.push('http://localhost:5173'); // Vite default
      }

      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST'], // GETメインのAPIのため限定
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    strictPreflight: true, // セキュリティ強化
  });
};
```

### 6.2 セキュリティヘッダー

```typescript
// src/plugins/security.ts
import { FastifyPluginAsync } from 'fastify';
import helmet from '@fastify/helmet';

export const securityPlugin: FastifyPluginAsync = async (fastify) => {
  const isProduction = process.env.NODE_ENV === 'production';

  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Scalar UI用
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'], // Scalar CDN
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permissionsPolicy: {
      features: {
        camera: ["'none'"],
        microphone: ["'none'"],
        geolocation: ["'none'"],
        payment: ["'none'"],
      },
    },
  });

  // カスタムセキュリティヘッダー
  fastify.addHook('onSend', async (request, reply) => {
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');

    // APIドキュメント以外はダウンロード禁止
    if (!request.url.includes('/api-docs')) {
      reply.header('X-Download-Options', 'noopen');
    }
  });
};
```

## 7. キャッシュ戦略

### 7.1 OpenDataResourceのキャッシュ

```typescript
// src/infrastructure/cache/openDataCache.ts
import { OpenDataResource } from '@/domain/data/OpenDataResource';
import { FilePath } from '@/domain/data/FilePath';

interface CacheEntry {
  resource: OpenDataResource;
  content: unknown;
  expiresAt: Date;
}

export class OpenDataCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize = 100; // 最大100ファイル
  private readonly ttl = 3600 * 1000; // 1時間

  async get(path: FilePath): Promise<{ resource: OpenDataResource; content: unknown } | null> {
    const key = path.value;
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // LRU: アクセスされたアイテムを最後に移動
    this.cache.delete(key);
    this.cache.set(key, entry);

    return { resource: entry.resource, content: entry.content };
  }

  set(path: FilePath, resource: OpenDataResource, content: unknown): void {
    const key = path.value;

    // キャッシュサイズ制限
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      resource,
      content,
      expiresAt: new Date(Date.now() + this.ttl),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### 7.2 Vercel Edge Cacheの設定

```typescript
// src/routes/data.ts
import { FastifyPluginAsync } from 'fastify';

const dataRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Params: { '*': string };
  }>('/*', {
    preHandler: fastify.auth([fastify.authenticate, fastify.rateLimit]),
    handler: async (request, reply) => {
      const path = request.params['*'];
      const result = await dataUseCase.getData(path);

      if (result.isFailure) {
        return reply.code(404).send(toProblemDetails(result.error));
      }

      const data = result.value;

      // Vercel Edge Cacheヘッダー設定
      reply.header('Cache-Control', 'public, max-age=0, must-revalidate');
      reply.header('CDN-Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      reply.header(
        'Vercel-CDN-Cache-Control',
        'public, max-age=3600, stale-while-revalidate=86400',
      );

      // ETa生成（ファイルのハッシュまたは最終更新日時）
      const etag = `"${data.resource.lastModified.getTime()}"`;
      reply.header('ETag', etag);

      // 条件付きリクエストの処理
      if (request.headers['if-none-match'] === etag) {
        return reply.code(304).send();
      }

      return reply.type(data.resource.contentType.mimeType).send(data.content);
    },
  });
};
```

### 7.3 キャッシュキー生成戦略

```typescript
// src/infrastructure/cache/cacheKeyGenerator.ts
export class CacheKeyGenerator {
  static forOpenData(path: string, tier?: string): string {
    // ティアごとに異なるデータを返す場合の考慮
    const base = `opendata:${path}`;
    return tier ? `${base}:${tier}` : base;
  }

  static forRateLimit(userId: string): string {
    return `ratelimit:${userId}`;
  }

  static forAPIEndpoint(path: string): string {
    return `endpoint:${path}`;
  }
}
```

## 8. 監視・メトリクス

### 8.1 ロギング設定

```typescript
// src/config/logger.ts
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const loggerConfig = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

  // 構造化ログ設定
  formatters: {
    level: (label: string) => ({ level: label }),
    bindings: (bindings: any) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
      node_version: process.version,
      environment: process.env.NODE_ENV,
      service: 'opendata-api',
    }),
  },

  // リクエスト/レスポンスのシリアライズ
  serializers: {
    req: (request: any) => ({
      method: request.method,
      url: request.url,
      path: request.routerPath,
      userId: request.user?.id,
      tier: request.user?.tier,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId: request.id,
    }),
    res: (reply: any) => ({
      statusCode: reply.statusCode,
      responseTime: reply.getResponseTime?.() || 0,
    }),
    err: pino.stdSerializers.err,
  },

  // 本番環境での最適化
  ...(isProduction && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: false,
        translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    },
  }),
};
```

### 8.2 メトリクス収集

```typescript
// src/plugins/metrics.ts
import { FastifyPluginAsync } from 'fastify';
import { Counter, Histogram, register } from 'prom-client';

// メトリクス定義
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'tier'],
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tier'],
});

const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['tier', 'endpoint'],
});

const dataAccessTotal = new Counter({
  name: 'data_access_total',
  help: 'Total number of data access requests',
  labelNames: ['path', 'status', 'cache_hit'],
});

export const metricsPlugin: FastifyPluginAsync = async (fastify) => {
  // メトリクスエンドポイント
  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return register.metrics();
  });

  // リクエストメトリクス収集
  fastify.addHook('onResponse', async (request, reply) => {
    const labels = {
      method: request.method,
      route: request.routerPath || request.url,
      status_code: reply.statusCode.toString(),
      tier: request.user?.tier || 'anonymous',
    };

    httpRequestTotal.inc(labels);
    httpRequestDuration.observe(labels, reply.getResponseTime() / 1000);
  });
};

// メトリクスエクスポート
export { httpRequestDuration, httpRequestTotal, rateLimitHits, dataAccessTotal };
```

### 8.3 エラー追跡

```typescript
// src/plugins/errorTracking.ts
import { FastifyPluginAsync } from 'fastify';

interface ErrorReport {
  timestamp: Date;
  error: {
    message: string;
    stack?: string;
    code?: string;
  };
  request: {
    method: string;
    url: string;
    userId?: string;
    ip: string;
  };
  context: Record<string, unknown>;
}

export const errorTrackingPlugin: FastifyPluginAsync = async (fastify) => {
  const errorReports: ErrorReport[] = [];

  fastify.setErrorHandler(async (error, request, reply) => {
    // エラーレポート作成
    const report: ErrorReport = {
      timestamp: new Date(),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
      request: {
        method: request.method,
        url: request.url,
        userId: request.user?.id,
        ip: request.ip,
      },
      context: {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
      },
    };

    // 本番環境では外部サービスに送信
    if (process.env.NODE_ENV === 'production') {
      // Sentryやその他のエラー追跡サービスに送信
      // await sendToErrorTrackingService(report)
    } else {
      errorReports.push(report);
    }

    // 構造化ログ出力
    request.log.error(
      {
        err: error,
        report,
      },
      'Request error',
    );

    // エラーレスポンス
    if (error.validation) {
      return reply.code(400).send({
        type: 'https://api.example.com/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: error.message,
        errors: error.validation,
      });
    }

    return reply.code(error.statusCode || 500).send({
      type: 'https://api.example.com/errors/internal',
      title: 'Internal Server Error',
      status: error.statusCode || 500,
      detail:
        process.env.NODE_ENV === 'production'
          ? 'An error occurred processing your request'
          : error.message,
    });
  });
};
```

## 9. 環境別設定

### 9.1 環境変数の型定義とバリデーション

```typescript
// src/config/env.ts
import { z } from 'zod';

// 環境変数スキーマ定義
const envSchema = z.object({
  // 基本設定
  NODE_ENV: z.enum(['development', 'production', 'test']),
  APP_ENV: z.enum(['local', 'development', 'staging', 'production']).default('local'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Supabase設定
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // セキュリティ設定
  ALLOWED_ORIGINS: z.string().default(''),
  JWT_SECRET: z.string().optional(), // Supabaseが管理

  // レート制限設定（オプショナル、デフォルト値あり）
  RATE_LIMIT_TIER1_MAX: z.string().transform(Number).default('60'),
  RATE_LIMIT_TIER1_WINDOW: z.string().transform(Number).default('60'),
  RATE_LIMIT_TIER2_MAX: z.string().transform(Number).default('120'),
  RATE_LIMIT_TIER2_WINDOW: z.string().transform(Number).default('60'),
  RATE_LIMIT_TIER3_MAX: z.string().transform(Number).default('300'),
  RATE_LIMIT_TIER3_WINDOW: z.string().transform(Number).default('60'),

  // キャッシュ設定
  CACHE_TTL_SECONDS: z.string().transform(Number).default('3600'),
  CACHE_MAX_SIZE: z.string().transform(Number).default('100'),

  // ロギング設定
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // データストレージ設定
  DATA_BASE_PATH: z.string().default('/data'),

  // Vercel固有設定
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  VERCEL_URL: z.string().optional(),
});

// 型定義
type Env = z.infer<typeof envSchema>;

// バリデーションと型安全な環境変数
let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    console.error(error.flatten().fieldErrors);
    process.exit(1);
  }
  throw error;
}

export { env };

// TypeScript用の型定義
declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}
```

### 9.2 環境別設定ファイル

```typescript
// src/config/index.ts
import { env } from './env';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

interface AppConfig {
  environment: string;
  isProduction: boolean;
  isDevelopment: boolean;
  port: number;
  host: string;

  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };

  security: {
    allowedOrigins: string[];
    enableHSTS: boolean;
    enableCSP: boolean;
  };

  rateLimit: {
    tier1: RateLimitConfig;
    tier2: RateLimitConfig;
    tier3: RateLimitConfig;
  };

  cache: {
    ttlSeconds: number;
    maxSize: number;
  };

  logging: {
    level: string;
    prettyPrint: boolean;
  };

  data: {
    basePath: string;
  };
}

export const config: AppConfig = {
  environment: env.APP_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  port: env.PORT,
  host: env.HOST,

  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },

  security: {
    allowedOrigins: env.ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    enableHSTS: env.NODE_ENV === 'production',
    enableCSP: true,
  },

  rateLimit: {
    tier1: {
      maxRequests: env.RATE_LIMIT_TIER1_MAX,
      windowSeconds: env.RATE_LIMIT_TIER1_WINDOW,
    },
    tier2: {
      maxRequests: env.RATE_LIMIT_TIER2_MAX,
      windowSeconds: env.RATE_LIMIT_TIER2_WINDOW,
    },
    tier3: {
      maxRequests: env.RATE_LIMIT_TIER3_MAX,
      windowSeconds: env.RATE_LIMIT_TIER3_WINDOW,
    },
  },

  cache: {
    ttlSeconds: env.CACHE_TTL_SECONDS,
    maxSize: env.CACHE_MAX_SIZE,
  },

  logging: {
    level: env.LOG_LEVEL,
    prettyPrint: env.NODE_ENV !== 'production',
  },

  data: {
    basePath: env.DATA_BASE_PATH,
  },
};
```

### 9.3 .envファイルのテンプレート

```bash
# .env.example
# 基本設定
NODE_ENV=development
APP_ENV=local
PORT=3000
HOST=0.0.0.0

# Supabase設定
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# セキュリティ設定
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# レート制限設定（オプション）
RATE_LIMIT_TIER1_MAX=60
RATE_LIMIT_TIER1_WINDOW=60
RATE_LIMIT_TIER2_MAX=120
RATE_LIMIT_TIER2_WINDOW=60
RATE_LIMIT_TIER3_MAX=300
RATE_LIMIT_TIER3_WINDOW=60

# キャッシュ設定
CACHE_TTL_SECONDS=3600
CACHE_MAX_SIZE=100

# ロギング設定
LOG_LEVEL=debug

# データストレージ設定
DATA_BASE_PATH=/data
```

## 10. データ移行・初期化

### 10.1 Supabaseテーブル定義

```sql
-- supabase/migrations/001_initial_schema.sql

-- Rate Limit Logs テーブル
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成（レート制限チェックの高速化）
CREATE INDEX idx_rate_limit_logs_user_requested
  ON rate_limit_logs (user_id, requested_at DESC);

-- RLS (Row Level Security) の有効化
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー：1分以内のレコードのみ取得可能
CREATE POLICY "Select recent logs" ON rate_limit_logs
  FOR SELECT
  USING (requested_at > NOW() - INTERVAL '1 minute');

-- Authentication Logs テーブル
CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('LOGIN', 'LOGOUT', 'TOKEN_REFRESH', 'TOKEN_EXPIRED')),
  provider TEXT,
  ip_address INET,
  user_agent TEXT,
  result TEXT NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE', 'EXPIRED')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_auth_logs_user_timestamp
  ON auth_logs (user_id, timestamp DESC);
CREATE INDEX idx_auth_logs_event_timestamp
  ON auth_logs (event_type, timestamp DESC);

-- API Access Logs テーブル
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time INTEGER NOT NULL, -- ミリ秒単位
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_api_logs_user_timestamp
  ON api_logs (user_id, timestamp DESC);
CREATE INDEX idx_api_logs_path_timestamp
  ON api_logs (path, timestamp DESC);

-- API Endpoints設定テーブル（静的データ）
CREATE TABLE IF NOT EXISTS api_endpoints (
  id SERIAL PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  required_tier TEXT NOT NULL CHECK (required_tier IN ('TIER1', 'TIER2', 'TIER3')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 更新時刻自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_endpoints_updated_at BEFORE UPDATE
  ON api_endpoints FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

### 10.2 pg_cronによる自動削除設定

```sql
-- supabase/migrations/002_setup_cron_jobs.sql

-- pg_cron extension の有効化（Supabase管理画面で事前に有効化が必要）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 古いrate_limit_logsの削除（2時間以上経過したレコード）
SELECT cron.schedule(
  'delete-old-rate-limit-logs',
  '*/10 * * * *', -- 10分ごとに実行
  $$DELETE FROM rate_limit_logs WHERE requested_at < NOW() - INTERVAL '2 hours'$$
);

-- 古い認証ログの削除（30日以上経過したレコード）
SELECT cron.schedule(
  'delete-old-auth-logs',
  '0 2 * * *', -- 毎日午前2時に実行
  $$DELETE FROM auth_logs WHERE timestamp < NOW() - INTERVAL '30 days'$$
);

-- 古いAPIログの削除（7日以上経過したレコード）
SELECT cron.schedule(
  'delete-old-api-logs',
  '0 3 * * *', -- 毎日午前3時に実行
  $$DELETE FROM api_logs WHERE timestamp < NOW() - INTERVAL '7 days'$$
);
```

### 10.3 初期データ投入

```sql
-- supabase/seed.sql

-- APIエンドポイントの初期データ
INSERT INTO api_endpoints (path, required_tier, description) VALUES
  ('/secure/*', 'TIER1', '奈良県セキュアデータ'),
  ('/public/*', 'TIER1', '奈良県公開データ'),
  ('/premium/*', 'TIER2', 'プレミアムデータ（将来用）'),
  ('/enterprise/*', 'TIER3', 'エンタープライズデータ（将来用）')
ON CONFLICT (path) DO NOTHING;

-- テスト用データ（開発環境のみ）
-- このセクションは本番環境では実行しない
DO $$
BEGIN
  IF current_setting('app.environment', true) IN ('development', 'test') THEN
    -- テスト用のレート制限ログ
    INSERT INTO rate_limit_logs (user_id, endpoint, requested_at)
    SELECT
      'test-user-' || generate_series,
      '/secure/test/data.json',
      NOW() - (random() * INTERVAL '5 minutes')
    FROM generate_series(1, 10);

    -- テスト用の認証ログ
    INSERT INTO auth_logs (user_id, event_type, provider, result)
    VALUES
      ('test-user-1', 'LOGIN', 'google', 'SUCCESS'),
      ('test-user-2', 'LOGIN', 'github', 'SUCCESS'),
      ('test-user-3', 'LOGIN', 'google', 'FAILURE');
  END IF;
END $$;
```

### 10.4 Custom Access Token Hook

```sql
-- supabase/migrations/003_custom_access_token_hook.sql

-- JWTにティア情報を含めるためのカスタムフック
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  user_tier text;
  user_metadata jsonb;
BEGIN
  -- ユーザーのapp_metadataを取得
  user_metadata := event->'claims'->'app_metadata';

  -- tierが設定されていない場合はTIER1を設定
  IF user_metadata->>'tier' IS NULL THEN
    user_tier := 'tier1';

    -- auth.usersテーブルのapp_metadataを更新
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tier', 'tier1')
    WHERE id = (event->'claims'->>'sub')::uuid;
  ELSE
    user_tier := user_metadata->>'tier';
  END IF;

  -- JWTクレームにtierを追加
  RETURN jsonb_set(
    event,
    '{claims,tier}',
    to_jsonb(user_tier)
  );
END;
$$;

-- Supabase管理画面でこの関数をAccess Token Hookとして設定する必要があります
```

### 10.5 マイグレーション実行スクリプト

```typescript
// scripts/migrate.ts
import { createClient } from '@supabase/supabase-js';
import { config } from '../src/config';
import fs from 'fs/promises';
import path from 'path';

async function runMigrations() {
  const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

  console.log(`Found ${sqlFiles.length} migration files`);

  for (const file of sqlFiles) {
    console.log(`Running migration: ${file}`);
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error(`Error running migration ${file}:`, error);
      process.exit(1);
    }

    console.log(`✅ ${file} completed`);
  }

  console.log('All migrations completed successfully');
}

// 環境チェック
if (config.environment === 'production' && !process.env.FORCE_PRODUCTION_MIGRATION) {
  console.error('❌ Production migrations must be run through CI/CD pipeline');
  console.error('Set FORCE_PRODUCTION_MIGRATION=true to override (not recommended)');
  process.exit(1);
}

runMigrations().catch(console.error);
```

## デプロイメントチェックリスト

### 開発環境

- [ ] `.env`ファイルの作成と設定
- [ ] Supabaseローカル開発環境のセットアップ
- [ ] 初期マイグレーションの実行
- [ ] シードデータの投入
- [ ] ローカルでの動作確認

### ステージング環境

- [ ] Supabaseプロジェクトの作成
- [ ] 環境変数の設定
- [ ] マイグレーションの実行
- [ ] Custom Access Token Hookの設定
- [ ] pg_cronジョブの設定
- [ ] Vercelプレビューデプロイメント

### 本番環境

- [ ] Supabase本番プロジェクトの作成
- [ ] 環境変数の設定（Vercel管理画面）
- [ ] GitHub Actionsでのマイグレーション
- [ ] Custom Access Token Hookの設定と検証
- [ ] pg_cronジョブの設定と監視
- [ ] セキュリティヘッダーの検証
- [ ] レート制限の動作確認
- [ ] エラー監視の設定
- [ ] バックアップ戦略の確認

## 補足

本ドキュメントは2024年のベストプラクティスに基づいて作成されています。
技術スタックやセキュリティ要件の変化に応じて、定期的な見直しと更新を行ってください。

## 変更履歴

| 更新日時                  | 変更点                    |
| ------------------------- | ------------------------- |
| 2025-01-23T12:00:00+09:00 | 新規作成 - 実装詳細ガイド |
