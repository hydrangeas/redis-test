import { FastifyPluginAsync } from 'fastify';
import dataAccessRoute from './data-access.route';

const dataRoutes: FastifyPluginAsync = async (fastify) => {
  // Register data access routes
  await fastify.register(dataAccessRoute);
};

export default dataRoutes;
