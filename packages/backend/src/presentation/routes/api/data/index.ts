import { FastifyPluginAsync } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { container } from 'tsyringe';
import { IDataRetrievalUseCase } from '@/application/interfaces/data-retrieval-use-case.interface';
import { IRateLimitUseCase } from '@/application/interfaces/rate-limit-use-case.interface';
import {
  ISecureFileAccess,
  SecurityContext,
} from '@/domain/data/interfaces/secure-file-access.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { toProblemDetails } from '@/presentation/errors/error-mapper';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { fileSecurityMiddleware } from '@/presentation/middleware/file-security.middleware';

// パスパラメータのスキーマ
const DataPathParams = Type.Object({
  '*': Type.String({
    description: 'Data file path (e.g., secure/319985/r5.json)',
    pattern: '^[a-zA-Z0-9/_.-]+\\.json$',
  }),
});

// レスポンススキーマ（動的なJSONデータ）
const DataResponse = Type.Any();

// エラーレスポンス
const ErrorResponse = Type.Object({
  type: Type.String({ description: 'Error type URI' }),
  title: Type.String({ description: 'Error title' }),
  status: Type.Number({ description: 'HTTP status code' }),
  detail: Type.Optional(Type.String({ description: 'Error details' })),
  instance: Type.String({ description: 'Instance URI' }),
});

// データ一覧のクエリパラメータ
const ListQueryParams = Type.Object({
  prefix: Type.Optional(Type.String({ description: 'Filter by path prefix' })),
  limit: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Number of items to return',
    }),
  ),
  offset: Type.Optional(
    Type.Integer({
      minimum: 0,
      default: 0,
      description: 'Number of items to skip',
    }),
  ),
});

// データ一覧のレスポンス
const ListResponse = Type.Object({
  items: Type.Array(
    Type.Object({
      path: Type.String({ description: 'File path' }),
      size: Type.Number({ description: 'File size in bytes' }),
      lastModified: Type.String({ description: 'Last modified date in ISO format' }),
    }),
  ),
  total: Type.Number({ description: 'Total number of items' }),
  limit: Type.Number({ description: 'Number of items per page' }),
  offset: Type.Number({ description: 'Number of items skipped' }),
});

type DataPathParamsType = Static<typeof DataPathParams>;
type ListQueryParamsType = Static<typeof ListQueryParams>;

const dataRoutes: FastifyPluginAsync = async (fastify) => {
  // デバッグ: authenticateが存在するか確認
  if (process.env.NODE_ENV === 'test') {
    console.log('fastify.authenticate exists?', typeof fastify.authenticate);
  }

  const dataRetrievalUseCase = container.resolve<IDataRetrievalUseCase>(
    DI_TOKENS.DataRetrievalUseCase,
  );
  const rateLimitUseCase = container.resolve<IRateLimitUseCase>(DI_TOKENS.RateLimitUseCase);
  const secureFileAccess = container.resolve<ISecureFileAccess>(DI_TOKENS.SecureFileAccessService);

  // ワイルドカードルートでデータアクセス
  fastify.get<{
    Params: DataPathParamsType;
    Reply: any | Static<typeof ErrorResponse>;
  }>(
    '/*',
    {
      schema: {
        description: 'Access open data files',
        tags: ['Data'],
        params: DataPathParams,
        response: {
          200: {
            description: 'Data retrieved successfully',
            content: {
              'application/json': {
                schema: DataResponse,
              },
            },
          },
          401: {
            description: 'Unauthorized',
            ...ErrorResponse,
          },
          404: {
            description: 'Data not found',
            ...ErrorResponse,
          },
          429: {
            description: 'Rate limit exceeded',
            ...ErrorResponse,
            headers: Type.Object({
              'X-RateLimit-Limit': Type.String({ description: 'Rate limit' }),
              'X-RateLimit-Remaining': Type.String({ description: 'Remaining requests' }),
              'X-RateLimit-Reset': Type.String({ description: 'Reset timestamp' }),
              'Retry-After': Type.String({ description: 'Seconds to wait' }),
            }),
          },
          500: {
            description: 'Internal server error',
            ...ErrorResponse,
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      preHandler: [fastify.authenticate, fastify.checkRateLimit, fileSecurityMiddleware],
    },
    async (request, reply) => {
      try {
        // preHandlerで認証済みなので、request.userは必ず存在する
        // ただし、念のためチェック
        if (!request.user) {
          // この場合は認証ミドルウェアが正しく動作していない
          throw new Error('Authentication middleware did not set request.user');
        }
        const user = request.user as AuthenticatedUser;
        const dataPath = request.params['*'];
        const endpoint = `/api/data/${dataPath}`;
        const method = request.method;

        request.log.info(
          {
            userId: user.userId.value,
            tier: user.tier.level,
            dataPath,
          },
          'Data access request',
        );

        // セキュアファイルアクセスによるパス検証
        const securityContext = request.securityContext || {
          userId: user.userId.value,
          userTier: user.tier.level,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] || 'unknown',
        };

        const pathValidation = await secureFileAccess.validateAndSanitizePath(
          dataPath,
          securityContext,
        );
        if (pathValidation.isFailure) {
          const error = pathValidation.getError();
          const problemDetails = toProblemDetails(error, request.url);

          let statusCode = 400;
          if (error.type === 'NOT_FOUND') {
            statusCode = 404;
          } else if (error.type === 'SECURITY') {
            statusCode = 403;
          }

          return reply.code(statusCode).send(problemDetails);
        }

        const sanitizedPath = pathValidation.getValue();

        // アクセス権限チェック
        const accessCheck = await secureFileAccess.checkAccess(sanitizedPath, securityContext);
        if (accessCheck.isFailure) {
          const error = accessCheck.getError();
          const problemDetails = toProblemDetails(error, request.url);
          return reply.code(403).send(problemDetails);
        }

        // データ取得処理（サニタイズされたパスを使用）
        const result = await dataRetrievalUseCase.retrieveData(sanitizedPath, user);

        if (result.isFailure) {
          const error = result.getError();
          const problemDetails = toProblemDetails(error, request.url);

          // エラータイプによるステータスコード決定
          let statusCode = 500;
          if (error.type === 'NOT_FOUND') {
            statusCode = 404;
          } else if (error.type === 'VALIDATION') {
            statusCode = 400;
          } else if (error.type === 'UNAUTHORIZED') {
            statusCode = 403;
          }

          return reply.code(statusCode).send(problemDetails);
        }

        // 成功レスポンス
        const data = result.getValue();

        // キャッシュヘッダー
        reply.headers({
          'Cache-Control': 'public, max-age=3600',
          ETag: `"${data.checksum}"`,
          'Last-Modified': data.lastModified.toUTCString(),
          'Content-Type': 'application/json',
        });

        // ETagによる条件付きリクエストの処理
        const ifNoneMatch = request.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === `"${data.checksum}"`) {
          return reply.code(304).send();
        }

        const ifModifiedSince = request.headers['if-modified-since'];
        if (ifModifiedSince) {
          const ifModifiedSinceDate = new Date(ifModifiedSince);
          if (data.lastModified <= ifModifiedSinceDate) {
            return reply.code(304).send();
          }
        }

        return reply.send(data.content);
      } catch (error) {
        request.log.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            url: request.url,
            userId: request.user?.userId?.value,
          },
          'Unexpected error during data access',
        );

        // テスト中は詳細なエラーを表示
        if (process.env.NODE_ENV === 'test') {
          console.error('Data route error:', error);
        }

        const problemDetails = toProblemDetails(
          {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            type: 'INTERNAL' as const,
          },
          request.url,
        );

        return reply.code(500).send(problemDetails);
      }
    },
  );

  // データ一覧取得（オプション）
  fastify.get<{
    Querystring: ListQueryParamsType;
    Reply: Static<typeof ListResponse> | Static<typeof ErrorResponse>;
  }>(
    '/',
    {
      schema: {
        description: 'List available data files',
        tags: ['Data'],
        querystring: ListQueryParams,
        response: {
          200: ListResponse,
          401: {
            description: 'Unauthorized',
            ...ErrorResponse,
          },
          429: {
            description: 'Rate limit exceeded',
            ...ErrorResponse,
          },
          500: {
            description: 'Internal server error',
            ...ErrorResponse,
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      preHandler: [fastify.authenticate, fastify.checkRateLimit, fileSecurityMiddleware],
    },
    async (request, reply) => {
      try {
        const user = request.user as AuthenticatedUser;
        const { prefix, limit = 20, offset = 0 } = request.query;

        // データ一覧の実装（現時点では仮実装）
        // TODO: 実際のファイルシステムまたはメタデータストアから取得
        return {
          items: [],
          total: 0,
          limit,
          offset,
        };
      } catch (error) {
        request.log.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            url: request.url,
            userId: request.user?.userId?.value,
          },
          'Unexpected error during data listing',
        );

        const problemDetails = toProblemDetails(
          {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            type: 'INTERNAL' as const,
          },
          request.url,
        );

        return reply.code(500).send(problemDetails);
      }
    },
  );
};

export default dataRoutes;
