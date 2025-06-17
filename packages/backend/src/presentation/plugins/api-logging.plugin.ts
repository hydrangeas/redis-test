import fp from 'fastify-plugin';

import { apiLoggingMiddleware } from '../middleware/api-logging.middleware';

import type { FastifyPluginAsync } from 'fastify';

const apiLoggingPlugin: FastifyPluginAsync = async (fastify) => {
  // API logging middleware
  void fastify.addHook('onRequest', apiLoggingMiddleware.onRequest);
  void fastify.addHook('onSend', apiLoggingMiddleware.onSend);

  fastify.log.info('API logging plugin registered');
};

export default fp(apiLoggingPlugin, {
  name: 'api-logging',
  dependencies: ['di-container'], // Ensure DI is set up first
});
