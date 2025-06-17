import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../infrastructure/di';

import type { EnvConfig } from '../../infrastructure/config';

/**
 * CORS設定プラグイン
 */
export default fp(
  async function corsPlugin(fastify) {
    const config = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);

    // 許可するオリジンのリスト
    const allowedOrigins = [
      config.FRONTEND_URL,
      // 開発環境用の追加オリジン
      ...(config.NODE_ENV === 'development'
        ? [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
          ]
        : []),
    ].filter(Boolean);

    await fastify.register(cors, {
      // 許可するオリジン
      origin: (origin, callback) => {
        // オリジンがない場合（同一オリジンリクエスト）は許可
        if (!origin) {
          callback(null, true);
          return;
        }

        // 許可リストに含まれているか確認
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        // 開発環境では全て許可（警告付き）
        if (config.NODE_ENV === 'development') {
          fastify.log.warn(`CORS: Allowing origin ${origin} in development mode`);
          callback(null, true);
          return;
        }

        // それ以外は拒否
        callback(new Error('Not allowed by CORS'), false);
      },

      // 許可するHTTPメソッド
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

      // 許可するヘッダー
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],

      // レスポンスに含めるヘッダー
      exposedHeaders: [
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],

      // 認証情報の送信を許可
      credentials: true,

      // プリフライトリクエストのキャッシュ時間（秒）
      maxAge: 86400, // 24時間
    });

    fastify.log.info('CORS plugin registered');
  },
  {
    name: 'cors',
    fastify: '4.x',
  },
);
