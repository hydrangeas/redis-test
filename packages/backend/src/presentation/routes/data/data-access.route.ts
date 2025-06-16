import { FastifyPluginAsync } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { container } from 'tsyringe';
import { DataAccessUseCase } from '@/application/use-cases/data-access.use-case';
import { toProblemDetails } from '@/presentation/errors/error-mapper';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

// レスポンススキーマ
const DataResponse = Type.Object({
  data: Type.Any(),
  metadata: Type.Object({
    etag: Type.String({
      description: 'ETag for caching',
    }),
    lastModified: Type.String({
      description: 'Last modified timestamp in ISO 8601 format',
    }),
    size: Type.Number({
      description: 'Size of the data in bytes',
    }),
  }),
});

// エラーレスポンスのスキーマ
const ErrorResponse = Type.Object({
  type: Type.String(),
  title: Type.String(),
  status: Type.Number(),
  detail: Type.Optional(Type.String()),
  instance: Type.String(),
});

type DataResponseType = Static<typeof DataResponse>;

const dataAccessRoute: FastifyPluginAsync = async (fastify) => {
  const dataAccessUseCase = container.resolve<DataAccessUseCase>(DI_TOKENS.DataAccessUseCase);

  // ワイルドカードルートでデータアクセス
  fastify.get<{
    Params: { '*': string };
    Reply: DataResponseType | Static<typeof ErrorResponse>;
  }>(
    '/*',
    {
      schema: {
        description: 'Access open data JSON files',
        tags: ['Data'],
        params: Type.Object({
          '*': Type.String({
            description: 'Path to the JSON data file',
          }),
        }),
        response: {
          200: DataResponse,
          304: Type.Any(),
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          429: ErrorResponse,
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      // 認証とレート制限が必須
      preHandler: [fastify.authenticate, fastify.checkRateLimit],
    },
    async (request, reply) => {
      const dataPath = request.params['*'];
      const user = request.user!;

      request.log.info(
        {
          userId: user.userId.value,
          tier: user.tier.level,
          path: dataPath,
        },
        'Data access request received',
      );

      try {
        // ETag処理
        const ifNoneMatch = request.headers['if-none-match'];
        const ifModifiedSince = request.headers['if-modified-since'];

        // データアクセス処理
        const result = await dataAccessUseCase.getData({
          path: dataPath,
          user,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });

        if (!result.success) {
          const error = result.error!;
          const problemDetails = toProblemDetails(error, request.url);

          // エラータイプに応じたステータスコード
          let statusCode = 500;
          if (error.type === 'NOT_FOUND') {
            statusCode = 404;
          } else if (error.type === 'VALIDATION' || error.type === 'SECURITY') {
            statusCode = 400;
          } else if (error.type === 'FORBIDDEN') {
            statusCode = 403;
          } else if (error.type === 'RATE_LIMIT') {
            statusCode = 429;
            // レート制限情報をヘッダーに追加
            const metadata = error.metadata as any;
            if (metadata) {
              reply.header('Retry-After', String(metadata.retryAfter || 60));
              reply.header('X-RateLimit-Limit', String(metadata.limit));
              reply.header('X-RateLimit-Remaining', String(metadata.remaining));
              reply.header('X-RateLimit-Reset', String(metadata.reset));
            }
          }

          request.log.warn(
            {
              error: error.code,
              message: error.message,
              statusCode,
            },
            'Data access failed',
          );

          return reply
            .code(statusCode)
            .header('content-type', 'application/problem+json')
            .send(problemDetails);
        }

        const data = result.data!;

        // キャッシュ検証
        if (ifNoneMatch && ifNoneMatch === data.etag) {
          return reply.code(304).send();
        }

        if (ifModifiedSince) {
          const modifiedSince = new Date(ifModifiedSince);
          if (!isNaN(modifiedSince.getTime()) && data.lastModified <= modifiedSince) {
            return reply.code(304).send();
          }
        }

        // 成功レスポンス
        const response: DataResponseType = {
          data: data.content,
          metadata: {
            etag: data.etag,
            lastModified: data.lastModified.toISOString(),
            size: data.size,
          },
        };

        // キャッシュヘッダーの設定
        reply.header('ETag', data.etag);
        reply.header('Last-Modified', data.lastModified.toUTCString());
        reply.header('Cache-Control', 'public, max-age=3600'); // 1時間キャッシュ

        request.log.info(
          {
            userId: user.userId.value,
            path: dataPath,
            size: data.size,
          },
          'Data access successful',
        );

        return reply.send(response);
      } catch (error) {
        request.log.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            userId: user.userId.value,
            path: dataPath,
          },
          'Unexpected error during data access',
        );

        const problemDetails = toProblemDetails(
          {
            code: 'DATA_ACCESS_ERROR',
            message: 'An unexpected error occurred while accessing data',
            type: 'INTERNAL',
          },
          request.url,
        );

        return reply
          .code(500)
          .header('content-type', 'application/problem+json')
          .send(problemDetails);
      }
    },
  );
};

export default dataAccessRoute;
