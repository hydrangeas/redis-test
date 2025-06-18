import fp from 'fastify-plugin';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * シンプルなパス検証プラグイン
 * パストラバーサル攻撃の防止
 */
export default fp(
  function pathValidationPlugin(fastify: FastifyInstance) {
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      // ヘルスチェックとドキュメントエンドポイントは除外
      if (request.url === '/health' || request.url.startsWith('/api-docs')) {
        return;
      }

      const [pathname] = request.url.split('?');

      // パストラバーサル攻撃の基本的なチェック
      if (pathname.includes('..') || pathname.includes('\\')) {
        return reply.code(400).send({
          type: 'https://example.com/errors/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid path: Path contains dangerous patterns',
          instance: pathname,
        });
      }

      // クエリパラメータのXSS対策
      if (request.query && typeof request.query === 'object') {
        const sanitizedQuery: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(request.query)) {
          if (typeof value === 'string') {
            const sanitizedValue = value
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#x27;')
              .replace(/\//g, '&#x2F;');

            sanitizedQuery[key] = sanitizedValue;
          } else {
            sanitizedQuery[key] = value;
          }
        }

        // Type assertion for Fastify query object
        (request as unknown as { query: Record<string, unknown> }).query = sanitizedQuery;
      }
    });

    fastify.log.info('Path validation plugin registered');
  },
  {
    name: 'path-validation',
    fastify: '4.x',
  },
);
