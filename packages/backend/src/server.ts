import 'reflect-metadata';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import * as dotenv from 'dotenv';
import { container } from 'tsyringe';

import buildApp from './app';
import { DI_TOKENS } from './infrastructure/di';

import type { EnvConfig } from './infrastructure/config';
import type { Logger } from 'pino';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });


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
