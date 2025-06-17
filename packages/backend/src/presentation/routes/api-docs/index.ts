import scalarPlugin from '@scalar/fastify-api-reference';
import * as yaml from 'yaml';

import type { FastifyPluginAsync } from 'fastify';

/**
 * APIドキュメントルート
 * Scalar UIを使用してインタラクティブなAPIドキュメントを提供
 */
const apiDocsRoute: FastifyPluginAsync = async (fastify) => {
  // OpenAPI仕様書を取得するエンドポイント
  fastify.get(
    '/openapi.json',
    {
      schema: {
        hide: true, // Scalar UIから隠す
      },
    },
    async (_request, _reply) => {
      return fastify.swagger();
    },
  );

  // OpenAPI仕様書をYAML形式で取得するエンドポイント
  fastify.get(
    '/openapi.yaml',
    {
      schema: {
        hide: true, // Scalar UIから隠す
      },
    },
    async (_request, _reply) => {
      _reply.type('text/yaml');
      const spec = fastify.swagger();
      return yaml.stringify(spec);
    },
  );

  // Scalar APIドキュメントUI
  await fastify.register(scalarPlugin, {
    routePrefix: '/api-docs',
    configuration: {
      // spec: {
      //   url: '/api/openapi.json', // OpenAPI仕様書のURL
      // },
      theme: 'purple', // UIテーマ
      layout: 'modern', // レイアウトスタイル
      darkMode: true, // ダークモード有効
      hideModels: false, // モデル定義を表示
      hideDownloadButton: false, // ダウンロードボタンを表示
      metaData: {
        title: 'Open Data API - Documentation',
        description: '奈良県オープンデータ提供APIのドキュメント',
      },
      customCss: `
        .scalar-card {
          border-radius: 8px;
        }
        .scalar-button {
          border-radius: 4px;
        }
      `,
      authentication: {
        preferredSecurityScheme: 'bearerAuth', // デフォルトの認証スキーム
      },
      defaultOpenAllTags: false, // すべてのタグを展開しない
      onSpecUpdate: (_spec: any) => {
        // 仕様書が更新されたときの処理
        fastify.log.info('OpenAPI specification updated');
      },
    },
  });

  // APIドキュメントのルートパス
  fastify.get(
    '/',
    {
      schema: {
        description: 'API documentation root',
        tags: ['Documentation'],
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              ui: { type: 'string' },
              spec: {
                type: 'object',
                properties: {
                  json: { type: 'string' },
                  yaml: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      return {
        message: 'API Documentation',
        ui: '/api/api-docs',
        spec: {
          json: '/api/openapi.json',
          yaml: '/api/openapi.yaml',
        },
      };
    },
  );
};

export default apiDocsRoute;
