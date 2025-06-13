import 'reflect-metadata';
import fastify from 'fastify';
import { container } from 'tsyringe';
import { Logger } from 'pino';
import { setupDI, DI_TOKENS } from './infrastructure/di';
import type { EnvConfig } from './infrastructure/config';

// DIコンテナをセットアップ
await setupDI();

// DIコンテナから依存性を取得
const config = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);
const logger = container.resolve<Logger>(DI_TOKENS.Logger);

const server = fastify({
  logger,
});

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