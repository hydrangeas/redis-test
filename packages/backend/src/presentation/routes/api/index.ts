import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import versioningPlugin from '@/presentation/plugins/versioning.plugin';
import authRoutes from './auth';
import dataRoutes from './data';
import dataRoutesV1 from './v1/data.routes';
import dataRoutesV2 from './v2/data.routes';

const apiRoutes: FastifyPluginAsync = async (fastify) => {
  // バージョニングプラグインを登録
  await fastify.register(versioningPlugin, {
    defaultVersion: '2',
    supportedVersions: ['1', '2', '2.1'],
    deprecatedVersions: ['1'],
    enableFallback: true,
  });

  // 共通エンドポイント（全バージョン）
  fastify.get(
    '/status',
    {
      schema: {
        description: 'Get API status',
        tags: ['Health'],
        response: {
          200: Type.Object({
            status: Type.String(),
            version: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      return {
        status: 'ok',
        version: request.apiVersion!,
      };
    },
  );

  // APIバージョン情報
  fastify.get(
    '/version',
    {
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
    },
    async () => {
      return {
        version: process.env.API_VERSION || '1.0.0',
        build: process.env.BUILD_NUMBER || process.env.COMMIT_HASH || 'unknown',
        timestamp: new Date().toISOString(),
      };
    },
  );

  // API情報
  fastify.get(
    '/',
    {
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
    },
    async (request) => {
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
    },
  );

  // 条件付きルート - バージョンに応じて利用可能な機能を返す
  fastify.get(
    '/features',
    {
      schema: {
        description: 'Get available features for current API version',
        tags: ['Health'],
        response: {
          200: Type.Object({
            base: Type.Array(Type.String()),
            advanced: Type.Optional(Type.Array(Type.String())),
          }),
        },
      },
    },
    async (request, reply) => {
      const features = {
        base: ['data_access', 'rate_limiting', 'authentication'],
      };

      // v2以上でのみ利用可能な機能
      if (request.apiVersion && parseFloat(request.apiVersion) >= 2) {
        features['advanced'] = ['filtering', 'sorting', 'pagination', 'field_selection'];
      }

      return features;
    },
  );

  // 認証関連ルート（バージョン共通）
  await fastify.register(authRoutes, { prefix: '/auth' });

  // データルートの登録
  // バージョニングプラグインがバージョンに応じて適切なルートを選択するため
  // 現在のバージョンに応じたデータルートのみを登録
  await fastify.register(dataRoutes, { prefix: '/data' });
};

export default apiRoutes;
