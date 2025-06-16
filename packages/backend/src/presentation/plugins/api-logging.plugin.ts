import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { apiLoggingMiddleware } from '../middleware/api-logging.middleware';

const apiLoggingPlugin: FastifyPluginAsync = async (fastify) => {
  // API logging middleware
  fastify.addHook('onRequest', apiLoggingMiddleware.onRequest);
  fastify.addHook('onSend', apiLoggingMiddleware.onSend);

  fastify.log.info('API logging plugin registered');
};

export default fp(apiLoggingPlugin, {
  name: 'api-logging',
  dependencies: ['di-container'], // Ensure DI is set up first
});
