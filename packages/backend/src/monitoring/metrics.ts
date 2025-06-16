import { Registry, Counter, Histogram, Gauge, register } from 'prom-client';

// カスタムレジストリ
export const metricsRegistry = new Registry();

// デフォルトメトリクスの登録
register.setDefaultLabels({
  app: 'open-data-api',
  env: process.env.NODE_ENV || 'development',
});

// HTTPリクエストメトリクス
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [metricsRegistry],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry],
});

// レート制限メトリクス
export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['user_tier', 'endpoint'],
  registers: [metricsRegistry],
});

export const rateLimitExceeded = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['user_tier', 'endpoint'],
  registers: [metricsRegistry],
});

// 認証メトリクス
export const authenticationAttempts = new Counter({
  name: 'authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['provider', 'status'],
  registers: [metricsRegistry],
});

export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users',
  labelNames: ['tier'],
  registers: [metricsRegistry],
});

// データアクセスメトリクス
export const dataAccessTotal = new Counter({
  name: 'data_access_total',
  help: 'Total number of data access requests',
  labelNames: ['resource_type', 'status'],
  registers: [metricsRegistry],
});

export const dataTransferBytes = new Counter({
  name: 'data_transfer_bytes_total',
  help: 'Total bytes transferred',
  labelNames: ['direction'], // 'in' or 'out'
  registers: [metricsRegistry],
});

// エラーメトリクス
export const errorTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code'],
  registers: [metricsRegistry],
});

// システムメトリクス
export const memoryUsage = new Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Process memory usage',
  labelNames: ['type'], // 'heap', 'rss', 'external'
  registers: [metricsRegistry],
});
