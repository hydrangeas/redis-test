import 'reflect-metadata';
import fastify from 'fastify';
import { container } from 'tsyringe';

import { setupDI, DI_TOKENS } from './infrastructure/di';
import { createFastifyLoggerConfig, setupRequestLogging } from './infrastructure/logging';

import type { FastifyServerOptions, FastifyInstance } from 'fastify';
import type { EnvConfig } from './infrastructure/config';

export default async function buildApp(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  // DIコンテナをセットアップ
  await setupDI();

  // DIコンテナから依存性を取得
  const config = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);

  // Fastifyサーバーの作成（ロガー設定を含む）
  const loggerConfig = createFastifyLoggerConfig(config);
  const server = fastify({ ...loggerConfig, ...opts });

  // リクエストロギングの設定
  setupRequestLogging(server);

  // セキュリティ設定（順序重要: CORS → セキュリティヘッダー → パス検証 → エラーハンドラー）
  await server.register(import('./presentation/plugins/cors'));
  await server.register(import('./presentation/plugins/security-headers'));
  await server.register(import('./presentation/plugins/path-validation'));
  await server.register(import('./presentation/plugins/error-handler'));

  // 認証プラグインの登録
  await server.register(import('./presentation/plugins/auth.plugin'));

  // レート制限プラグインの登録（認証プラグインの後）
  await server.register(import('./presentation/plugins/rate-limit.plugin'));

  // APIロギングプラグインの登録（認証とレート制限の後）
  await server.register(import('./presentation/plugins/api-logging.plugin'));

  // モニタリングプラグインの登録
  await server.register(import('./plugins/monitoring'));

  // APIドキュメントプラグインの登録
  await server.register(import('./plugins/api-docs'));

  // Vercel Analytics（Vercel環境でのみ有効）
  if (process.env.VERCEL) {
    await server.register(import('./plugins/vercel-analytics'));
  }

  // APIルートの登録
  await server.register(import('./presentation/routes'), { prefix: '/api/v1' });

  server.get('/health', () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      region: process.env.VERCEL_REGION || 'local',
    };
  });

  return server;
}
