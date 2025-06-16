import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { setupRequestLogging } from '@/infrastructure/logging';

interface LoggingPluginOptions {
  skipPaths?: string[];
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

const loggingPlugin: FastifyPluginAsync<LoggingPluginOptions> = async (fastify, options) => {
  const skipPaths = options.skipPaths || ['/health', '/metrics'];

  // インフラストラクチャ層のロギング設定を適用
  setupRequestLogging(fastify);

  // 追加のカスタムロギング（ユーザー情報など）
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // スキップするパスの場合はログを出力しない
    if (skipPaths.some((path) => request.url === path || request.url.startsWith(path))) {
      return;
    }

    // ユーザー情報があれば追加のログを出力
    if (request.user) {
      request.log.info(
        {
          userId: request.user.userId.value,
          userTier: request.user.tier.level,
          event: 'authenticated_request',
        },
        'Authenticated user request',
      );
    }
  });
};

// TypeScript宣言の拡張
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

export default fp(loggingPlugin, {
  name: 'logging-plugin',
});
