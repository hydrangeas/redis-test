import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { Type } from '@sinclair/typebox';
import { createClient } from '@supabase/supabase-js';
import { container } from 'tsyringe';

import { DI_TOKENS } from '@/infrastructure/di/tokens';

import type { FastifyPluginAsync } from 'fastify';
import type { Logger } from 'pino';


// ヘルスステータスのスキーマ
const HealthStatus = Type.Object({
  status: Type.Union([
    Type.Literal('healthy'),
    Type.Literal('degraded'),
    Type.Literal('unhealthy'),
  ]),
  timestamp: Type.String({ format: 'date-time' }),
  uptime: Type.Number({ description: 'Uptime in seconds' }),
  environment: Type.String(),
  version: Type.String(),
  services: Type.Object({
    database: Type.Object({
      status: Type.String(),
      message: Type.Optional(Type.String()),
    }),
    dataFiles: Type.Object({
      status: Type.String(),
      message: Type.Optional(Type.String()),
    }),
    cache: Type.Object({
      status: Type.String(),
      message: Type.Optional(Type.String()),
    }),
  }),
});

// 詳細ヘルスチェックのスキーマ
const DetailedHealthStatus = Type.Intersect([
  HealthStatus,
  Type.Object({
    memory: Type.Object({
      used: Type.Number(),
      total: Type.Number(),
      percentage: Type.Number(),
    }),
    cpu: Type.Object({
      usage: Type.Number(),
    }),
  }),
]);

const healthRoutes: FastifyPluginAsync = (fastify) => {
  const logger = container.resolve<Logger>(DI_TOKENS.Logger);

  // 基本的なヘルスチェック
  fastify.get(
    '/',
    {
      schema: {
        description: 'Basic health check endpoint',
        tags: ['Health'],
        response: {
          200: HealthStatus,
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const checks = await performHealthChecks();

        // 全体のステータスを決定
        const overallStatus = determineOverallStatus(checks);

        const response = {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0',
          services: checks,
        };

        if (overallStatus === 'unhealthy') {
          return reply.code(503).send(response);
        }

        return response;
      } catch (error) {
        logger.error({ error }, 'Health check failed');
        return reply.code(503).send({
          status: 'unhealthy',
          message: 'Health check failed',
        });
      }
    },
  );

  // 詳細なヘルスチェック
  fastify.get(
    '/detailed',
    {
      schema: {
        description: 'Detailed health check endpoint with system metrics',
        tags: ['Health'],
        response: {
          200: DetailedHealthStatus,
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const checks = await performHealthChecks();
        const overallStatus = determineOverallStatus(checks);

        // メモリ使用状況
        const memoryUsage = process.memoryUsage();
        const totalMemory = os.totalmem();
        const usedMemory = memoryUsage.heapUsed + memoryUsage.external;

        // CPU使用状況（簡易版）
        const cpuUsage = process.cpuUsage();
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // マイクロ秒をミリ秒に変換

        const response = {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0',
          services: checks,
          memory: {
            used: Math.round(usedMemory / 1024 / 1024), // MB単位
            total: Math.round(totalMemory / 1024 / 1024), // MB単位
            percentage: Math.round((usedMemory / totalMemory) * 100),
          },
          cpu: {
            usage: Math.round(cpuPercent),
          },
        };

        if (overallStatus === 'unhealthy') {
          return reply.code(503).send(response);
        }

        return response;
      } catch (error) {
        logger.error({ error }, 'Detailed health check failed');
        return reply.code(503).send({
          status: 'unhealthy',
          message: 'Health check failed',
        });
      }
    },
  );

  // Liveness probe (Kubernetes用)
  fastify.get(
    '/live',
    {
      schema: {
        description: 'Liveness probe for container orchestration',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
        },
      },
    },
    () => {
      // アプリケーションが動作していれば常にOK
      return { status: 'ok' };
    },
  );

  // Readiness probe (Kubernetes用)
  fastify.get(
    '/ready',
    {
      schema: {
        description: 'Readiness probe for container orchestration',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              checks: { type: 'object' },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              checks: { type: 'object' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      try {
        const checks = await performHealthChecks();
        const overallStatus = determineOverallStatus(checks);

        const response = {
          status: overallStatus === 'healthy' ? 'ready' : 'not_ready',
          checks,
        };

        if (overallStatus !== 'healthy') {
          return reply.code(503).send(response);
        }

        return response;
      } catch (error) {
        logger.error({ error }, 'Readiness check failed');
        return reply.code(503).send({
          status: 'not_ready',
          checks: {},
        });
      }
    },
  );
};

// ヘルスチェックの実行
async function performHealthChecks(): Promise<Record<string, { status: string; message?: string }>> {
  const checks = {
    database: await checkDatabase(),
    dataFiles: await checkDataFiles(),
    cache: checkCache(),
  };

  return checks;
}

// データベース接続チェック
async function checkDatabase(): Promise<{ status: string; message?: string }> {
  try {
    // Supabaseクライアントを使用した接続チェック
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        status: 'unhealthy',
        message: 'Database configuration missing',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 簡単なクエリを実行してデータベース接続を確認
    const { error } = await supabase.from('auth_logs').select('count').limit(1).single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116は"no rows found"エラー
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error.message}`,
      };
    }

    return {
      status: 'healthy',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// データファイルアクセスチェック
async function checkDataFiles(): Promise<{ status: string; message?: string }> {
  try {
    const dataDirectory = process.env.DATA_DIRECTORY || path.join(process.cwd(), 'data');

    // ディレクトリの存在確認
    const stats = await fs.stat(dataDirectory);
    if (!stats.isDirectory()) {
      return {
        status: 'unhealthy',
        message: 'Data directory is not accessible',
      };
    }

    // テストファイルの読み取り確認
    const testFile = path.join(dataDirectory, 'index.json');
    await fs.access(testFile, fs.constants.R_OK);

    return {
      status: 'healthy',
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: 'Data files may not be fully accessible',
    };
  }
}

// キャッシュステータスチェック
function checkCache(): { status: string; message?: string } {
  // 現在の実装では、キャッシュは常に利用可能
  // 将来的にRedisなどを使用する場合はここでチェック
  return {
    status: 'healthy',
  };
}

// 全体のステータスを決定
function determineOverallStatus(checks: Record<string, { status: string; message?: string }>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map((check) => check.status);

  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }

  if (statuses.includes('degraded')) {
    return 'degraded';
  }

  return 'healthy';
}

export default healthRoutes;
