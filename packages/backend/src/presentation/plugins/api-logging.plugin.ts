import fp from 'fastify-plugin';

import { apiLoggingMiddleware } from '../middleware/api-logging.middleware';

import type { FastifyPluginAsync } from 'fastify';

const apiLoggingPlugin: FastifyPluginAsync = (fastify) => {
  // API logging middleware
  fastify.addHook('onRequest', apiLoggingMiddleware.onRequest);
  fastify.addHook('onSend', apiLoggingMiddleware.onSend);

  fastify.log.info('API logging plugin registered');
};

export default fp(apiLoggingPlugin, {
  name: 'api-logging',
  // Remove the dependency as DI is setup before plugin registration
});
