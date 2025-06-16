import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    startTime: number;
  }
}

export default fp(async function vercelAnalytics(fastify: FastifyInstance) {
  // Vercel Analytics用のデータ収集
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - request.startTime;

    // Vercel Analyticsに送信
    if (process.env.VERCEL_ANALYTICS_ID) {
      // Web Vitalsの記録
      reply.header('Server-Timing', `total;dur=${duration}`);
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
