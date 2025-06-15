import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { container } from 'tsyringe';
import type { Logger } from 'pino';
import { DI_TOKENS } from './infrastructure/di';
import type { EnvConfig } from './infrastructure/config';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

import buildApp from './app';

const server = await buildApp();

// DIコンテナから依存性を取得
const config = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);
const logger = container.resolve<Logger>(DI_TOKENS.Logger);

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