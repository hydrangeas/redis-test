import Fastify, { FastifyInstance } from 'fastify';
import { fastifySwagger } from '@fastify/swagger';
import { fastifySwaggerUi } from '@fastify/swagger-ui';
import { fastifyCors } from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { v4 as uuidv4 } from 'uuid';
import { container } from 'tsyringe';
import authPlugin from './plugins/auth.plugin';
import errorHandlerPlugin from './plugins/error-handler';
import loggingPlugin from './plugins/logging.plugin';
import apiRoutes from './routes/api';
import { Logger } from 'pino';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

export async function buildServer(): Promise<FastifyInstance> {
  const logger = container.resolve<Logger>(DI_TOKENS.Logger);
  
  const server = Fastify({
    logger,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: (req) => {
      return req.headers['x-request-id'] as string || 
             req.headers['x-correlation-id'] as string || 
             uuidv4();
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // セキュリティヘッダー
  await server.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });

  // CORS設定
  await server.register(fastifyCors, {
    origin: (origin, cb) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
      
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  });

  // OpenAPI仕様
  await server.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Open Data API',
        description: '奈良県オープンデータ提供API',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@example.com',
        },
      },
      servers: [
        {
          url: process.env.API_URL || 'http://localhost:8000',
          description: 'Current environment',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
      tags: [
        { name: 'Authentication', description: '認証関連のエンドポイント' },
        { name: 'Data', description: 'オープンデータアクセス' },
        { name: 'Health', description: 'ヘルスチェック' },
      ],
    },
  });

  // Swagger UI
  await server.register(fastifySwaggerUi, {
    routePrefix: '/api-docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    transformSpecificationClone: true,
  });

  // グローバルプラグイン
  await server.register(errorHandlerPlugin);
  await server.register(loggingPlugin);
  await server.register(authPlugin, {
    excludePaths: ['/', '/health', '/api-docs', '/api-docs/json', '/api-docs/yaml', '/api-docs/*'],
  });

  // ルート登録
  await server.register(apiRoutes, { prefix: '/api' });

  // ヘルスチェック
  server.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            environment: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  });

  // ルートエンドポイント
  server.get('/', {
    schema: {
      description: 'API root endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            documentation: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      name: 'Open Data API',
      version: process.env.API_VERSION || '1.0.0',
      documentation: '/api-docs',
    };
  });

  // 404ハンドラーはerror-handlerプラグインで設定されるためここでは設定しない

  return server;
}