import 'reflect-metadata';
import fastify from 'fastify';
import { container } from 'tsyringe';
import { Logger } from 'pino';
import { setupDI, DI_TOKENS } from './infrastructure/di';
import { createFastifyLoggerConfig, setupRequestLogging } from './infrastructure/logging';
import type { EnvConfig } from './infrastructure/config';

// DIコンテナをセットアップ
await setupDI();

// DIコンテナから依存性を取得
const config = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);
const logger = container.resolve<Logger>(DI_TOKENS.Logger);

// Fastifyサーバーの作成（ロガー設定を含む）
const loggerConfig = createFastifyLoggerConfig(config);
const server = fastify(loggerConfig);

// リクエストロギングの設定
setupRequestLogging(server);

// セキュリティ設定（順序重要: CORS → セキュリティヘッダー → パス検証 → エラーハンドラー）
await server.register(import('./presentation/plugins/cors'));
await server.register(import('./presentation/plugins/security-headers'));
await server.register(import('./presentation/plugins/path-validation'));
await server.register(import('./presentation/plugins/error-handler'));

// APIルートの登録
await server.register(import('./presentation/routes'), { prefix: '/api/v1' });

server.get('/health', async () => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  };
});

const start = async (): Promise<void> => {
  try {
    await server.listen({ 
      port: config.PORT, 
      host: config.HOST,
    });
    
    logger.info({
      msg: 'Server started successfully',
      port: config.PORT,
      host: config.HOST,
      environment: config.NODE_ENV,
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// 環境変数の検証エラーをキャッチ
start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});