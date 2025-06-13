import fastify from 'fastify';
import { pino } from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
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
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async (): Promise<void> => {
  try {
    const port = parseInt(process.env.PORT || '8080', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    logger.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();