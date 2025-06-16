export default async function handler(req, res) {
  const { default: buildApp } = await import('../packages/backend/dist/app.js');

  // Fastifyアプリケーションの初期化
  const fastify = await buildApp({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          headers: req.headers,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    },
  });

  // リクエストの処理
  await fastify.ready();

  // Vercelアダプターを使用
  const { VercelAdapter } = await import('../packages/backend/dist/adapters/vercel.js');
  const adapter = new VercelAdapter(fastify);
  await adapter.handleRequest(req, res);
}
