import fastify from 'fastify';
import { pino } from 'pino';
import { getEnvConfig } from './infrastructure/config';

// 環境変数を読み込み
const config = getEnvConfig();

const logger = pino({
  level: config.LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
});

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