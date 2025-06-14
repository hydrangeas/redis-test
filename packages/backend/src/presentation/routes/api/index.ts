import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import authRoutes from './auth';
import dataRoutes from './data';

const apiRoutes: FastifyPluginAsync = async (fastify) => {
  // APIバージョン情報
  fastify.get('/version', {
    schema: {
      description: 'Get API version information',
      tags: ['Health'],
      response: {
        200: Type.Object({
          version: Type.String({ description: 'API version' }),
          build: Type.String({ description: 'Build number or commit hash' }),
          timestamp: Type.String({ description: 'Current server time in ISO format' }),
        }),
      },
    },
  }, async () => {
    return {
      version: process.env.API_VERSION || '1.0.0',
      build: process.env.BUILD_NUMBER || process.env.COMMIT_HASH || 'unknown',
      timestamp: new Date().toISOString(),
    };
  });

  // API情報
  fastify.get('/', {
    schema: {
      description: 'Get API information',
      tags: ['Health'],
      response: {
        200: Type.Object({
          name: Type.String({ description: 'API name' }),
          version: Type.String({ description: 'API version' }),
          endpoints: Type.Object({
            auth: Type.String({ description: 'Authentication endpoints' }),
            data: Type.String({ description: 'Data access endpoints' }),
            docs: Type.String({ description: 'API documentation' }),
          }),
        }),
      },
    },
  }, async (request) => {
    const baseUrl = `${request.protocol}://${request.hostname}`;
    
    return {
      name: 'Open Data API',
      version: process.env.API_VERSION || '1.0.0',
      endpoints: {
        auth: `${baseUrl}/api/auth`,
        data: `${baseUrl}/api/data`,
        docs: `${baseUrl}/api-docs`,
      },
    };
  });

  // 認証関連ルート
  await fastify.register(authRoutes, { prefix: '/auth' });
  
  // データアクセスルート
  await fastify.register(dataRoutes, { prefix: '/data' });
};

export default apiRoutes;