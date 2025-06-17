import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

// startTime is already declared in monitoring.ts as bigint

export default fp(async function vercelAnalytics(fastify: FastifyInstance) {
  // Vercel Analytics用のデータ収集
  fastify.addHook('onRequest', async (request, _reply) => {
    request.startTime = BigInt(Date.now());
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Number(BigInt(Date.now()) - (request.startTime || BigInt(0)));

    // Vercel Analyticsに送信
    if (process.env.VERCEL_ANALYTICS_ID) {
      // Web Vitalsの記録
      void reply.header('Server-Timing', `total;dur=${duration}`);
    }

    // カスタムメトリクスの記録
    fastify.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
      region: process.env.VERCEL_REGION,
    });
  });
});
