import dataAccessRoute from './data-access.route';

import type { FastifyPluginAsync } from 'fastify';


const dataRoutes: FastifyPluginAsync = async (fastify) => {
  // Register data access routes
  await fastify.register(dataAccessRoute);
};

export default dataRoutes;
