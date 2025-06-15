import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  httpRequestDuration, 
  httpRequestTotal,
  errorTotal,
  memoryUsage,
  metricsRegistry 
} from '@/monitoring/metrics.js';
import { createLogger } from '@/logging/logger.js';

const logger = createLogger('monitoring');

declare module 'fastify' {
  interface FastifyRequest {
    startTime: bigint;
  }
}

export default fp(async function monitoring(fastify: FastifyInstance) {
  // リクエストごとのメトリクス収集
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = process.hrtime.bigint();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - request.startTime) / 1e9; // ナノ秒を秒に変換

    const labels = {
      method: request.method,
      route: request.routerPath || request.url,
      status_code: reply.statusCode.toString(),
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);

    // 構造化ログ出力
    logger.info({
      type: 'http_request',
      request: {
        id: request.id,
        method: request.method,
        url: request.url,
        route: request.routerPath,
      },
      response: {
        statusCode: reply.statusCode,
        duration,
      },
      user: request.user ? { id: request.user.userId.value, tier: request.user.tier.level } : undefined,
    });
  });

  // エラーハンドリング
  fastify.setErrorHandler((error, request, reply) => {
    errorTotal.inc({
      type: error.name || 'UnknownError',
      code: error.code || 'UNKNOWN',
    });

    logger.error({
      type: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
      request: {
        id: request.id,
        method: request.method,
        url: request.url,
      },
    });

    // 既存のエラーハンドラーに委譲
    reply.status(error.statusCode || 500).send({
      type: 'https://example.com/errors/internal-error',
      title: 'Internal Server Error',
      status: error.statusCode || 500,
      detail: error.message,
      instance: request.url,
    });
  });

  // メトリクスエンドポイント
  fastify.get('/metrics', async (request, reply) => {
    // メモリ使用量の更新
    const memUsage = process.memoryUsage();
    memoryUsage.labels('heap').set(memUsage.heapUsed);
    memoryUsage.labels('rss').set(memUsage.rss);
    memoryUsage.labels('external').set(memUsage.external);

    reply.type('text/plain');
    return metricsRegistry.metrics();
  });

  // ヘルスチェックエンドポイント（詳細版）
  fastify.get('/health/detailed', async (request, reply) => {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {
        database: await checkDatabase(fastify),
        filesystem: await checkFilesystem(),
      },
    };

    const isHealthy = Object.values(healthCheck.checks).every((check: any) => check.status === 'healthy');
    
    reply.status(isHealthy ? 200 : 503).send(healthCheck);
  });
});

async function checkDatabase(fastify: FastifyInstance): Promise<any> {
  try {
    // Supabaseの接続チェック
    // TODO: DIコンテナから取得する方法を実装
    const startTime = Date.now();
    // 簡易的なチェック - 実際の実装では適切なDI統合が必要
    const latency = Date.now() - startTime;
    
    return { status: 'healthy', latency };
  } catch (error: any) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkFilesystem(): Promise<any> {
  try {
    const { access, constants } = await import('fs/promises');
    const dataDir = './data';
    
    await access(dataDir, constants.R_OK);
    return { status: 'healthy' };
  } catch (error: any) {
    return { status: 'unhealthy', error: error.message };
  }
}