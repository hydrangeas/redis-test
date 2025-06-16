import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default fp(async function apiDocsPlugin(fastify: FastifyInstance) {
  // OpenAPI仕様書の読み込み
  let openapiSpec: any;

  try {
    const openapiPath = join(__dirname, '../openapi/openapi.yaml');
    const openapiContent = readFileSync(openapiPath, 'utf8');
    openapiSpec = yaml.load(openapiContent) as any;
  } catch (error) {
    fastify.log.error('Failed to load OpenAPI specification:', error);
    // フォールバック仕様
    openapiSpec = {
      openapi: '3.0.3',
      info: {
        title: 'Open Data API',
        version: '1.0.0',
        description: 'API documentation is temporarily unavailable',
      },
      paths: {},
    };
  }

  // 動的な情報の追加
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  openapiSpec.servers = [
    {
      url: `${baseUrl}/api/v1`,
      description: 'Current environment',
    },
    ...(openapiSpec.servers || []),
  ];

  // Scalar UIのHTMLを生成
  const scalarHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>${openapiSpec.info.title} - API Documentation</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <script
    id="api-reference"
    data-url="/api/v1/openapi.json"
    data-configuration='${JSON.stringify({
      theme: 'purple',
      layout: 'modern',
      hideModels: false,
      darkMode: true,
      authentication: {
        preferredSecurityScheme: 'bearerAuth',
      },
      customCss: `
        .scalar-header {
          background: linear-gradient(90deg, #6B46C1 0%, #9333EA 100%);
        }
        .scalar-sidebar {
          background-color: #1F2937;
        }
        .scalar-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .scalar-button-primary {
          background-color: #7C3AED;
        }
        .scalar-button-primary:hover {
          background-color: #6B46C1;
        }
        code {
          background-color: #374151;
          padding: 2px 4px;
          border-radius: 3px;
        }
      `,
    })}'
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>
  `;

  // APIドキュメントページ
  fastify.get('/api-docs', async (request, reply) => {
    reply.type('text/html');
    return scalarHtml;
  });

  // リダイレクト（ルートからドキュメントへ）
  fastify.get('/docs', async (request, reply) => {
    reply.redirect('/api-docs');
  });

  // OpenAPI JSON エンドポイント
  fastify.get('/api/v1/openapi.json', async (request, reply) => {
    reply.type('application/json');
    return openapiSpec;
  });

  // OpenAPI YAML エンドポイント
  fastify.get('/api/v1/openapi.yaml', async (request, reply) => {
    reply.type('text/yaml');
    return yaml.dump(openapiSpec);
  });

  // OpenAPI仕様を別パスでも提供（互換性のため）
  fastify.get('/openapi.json', async (request, reply) => {
    reply.redirect('/api/v1/openapi.json');
  });

  fastify.log.info('API documentation available at /api-docs');
});
