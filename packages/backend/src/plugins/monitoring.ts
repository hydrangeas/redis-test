import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { Logger } from 'pino';
import { container } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

declare module 'fastify' {
  interface FastifyRequest {
    startTime?: bigint;
  }
}

// Create a custom registry for our metrics
const register = new Registry();

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Define custom metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['user_tier', 'endpoint'],
  registers: [register],
});

const rateLimitExceeded = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['user_tier', 'endpoint'],
  registers: [register],
});

const authenticationAttempts = new Counter({
  name: 'authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['provider', 'status'],
  registers: [register],
});

const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users',
  labelNames: ['tier'],
  registers: [register],
});

const dataAccessTotal = new Counter({
  name: 'data_access_total',
  help: 'Total number of data access requests',
  labelNames: ['resource_type', 'status'],
  registers: [register],
});

const dataTransferBytes = new Counter({
  name: 'data_transfer_bytes_total',
  help: 'Total bytes transferred',
  labelNames: ['direction'], // 'in' or 'out'
  registers: [register],
});

const errorTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code'],
  registers: [register],
});

// Export metrics for use in other parts of the application
export const metrics = {
  httpRequestDuration,
  httpRequestTotal,
  rateLimitHits,
  rateLimitExceeded,
  authenticationAttempts,
  activeUsers,
  dataAccessTotal,
  dataTransferBytes,
  errorTotal,
};

const monitoringPlugin: FastifyPluginAsync = async (fastify) => {
  const logger = container.resolve<Logger>(DI_TOKENS.Logger).child({ context: 'monitoring' });

  // Add hook to track request start time
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.startTime = process.hrtime.bigint();
  });

  // Add hook to record metrics after response
  fastify.addHook('onResponse', async (request, reply) => {
    if (request.startTime) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - request.startTime) / 1e9; // Convert nanoseconds to seconds

      const labels = {
        method: request.method,
        route: request.routerPath || request.url.split('?')[0],
        status_code: reply.statusCode.toString(),
      };

      httpRequestDuration.observe(labels, duration);
      httpRequestTotal.inc(labels);

      // Log request details
      logger.info({
        type: 'http_request',
        request: {
          id: request.id,
          method: request.method,
          url: request.url,
          route: request.routerPath,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        },
        response: {
          statusCode: reply.statusCode,
          duration,
          size: reply.getHeader('content-length'),
        },
        user: request.user
          ? {
              id: request.user.userId.value,
              tier: request.user.tier.level,
            }
          : undefined,
      });

      // Track rate limit metrics
      if (reply.statusCode === 429) {
        const userTier = request.user?.tier.level || 'anonymous';
        const endpoint = request.routerPath || request.url.split('?')[0];
        rateLimitExceeded.inc({ user_tier: userTier, endpoint });
      }

      // Track data access metrics
      if (request.routerPath?.startsWith('/api/v1/data/') && reply.statusCode < 400) {
        dataAccessTotal.inc({ resource_type: 'json', status: 'success' });

        const contentLength = reply.getHeader('content-length');
        if (contentLength) {
          dataTransferBytes.inc({ direction: 'out' }, parseInt(contentLength as string, 10));
        }
      }
    }
  });

  // Error tracking
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
        statusCode: error.statusCode,
      },
      request: {
        id: request.id,
        method: request.method,
        url: request.url,
        headers: request.headers,
      },
    });

    // Let the default error handler continue
    return reply.status(error.statusCode || 500).send({
      error: error.name || 'Internal Server Error',
      message: error.message,
      code: error.code,
    });
  });

  // Metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return register.metrics();
  });

  // Detailed health check endpoint
  fastify.get('/health/detailed', async (request, reply) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        human: formatUptime(uptime),
      },
      memory: {
        rss: formatBytes(memoryUsage.rss),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        external: formatBytes(memoryUsage.external),
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'development',
      },
      checks: {
        database: await checkDatabase(),
        filesystem: await checkFilesystem(),
      },
    };

    const isHealthy = Object.values(healthCheck.checks).every(
      (check) => check.status === 'healthy',
    );

    reply.status(isHealthy ? 200 : 503).send(healthCheck);
  });

  logger.info('Monitoring plugin loaded');
};

async function checkDatabase(): Promise<{ status: string; latency?: number; error?: string }> {
  try {
    const start = Date.now();
    // For now, we'll assume the database is healthy if we can resolve the Supabase client
    const supabaseClient = container.resolve(DI_TOKENS.SupabaseClient);
    const latency = Date.now() - start;

    return { status: 'healthy', latency };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkFilesystem(): Promise<{ status: string; error?: string }> {
  try {
    const fs = await import('fs/promises');
    const dataDir = container.resolve<string>(DI_TOKENS.DataDirectory);

    // Check if data directory exists and is readable
    await fs.access(dataDir, fs.constants.R_OK);

    return { status: 'healthy' };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export default fp(monitoringPlugin, {
  name: 'monitoring',
  dependencies: [],
});
