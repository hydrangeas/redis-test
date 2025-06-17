import { FastifyPluginAsync } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { container } from 'tsyringe';
import { IDataRetrievalUseCase } from '@/application/interfaces/data-retrieval-use-case.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { toProblemDetails } from '@/presentation/errors/error-mapper';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { DomainError } from '@/domain/errors/domain-error';

// v2で追加されたフィルタリング機能のスキーマ
const DataQueryParams = Type.Object({
  filter: Type.Optional(Type.Record(Type.String(), Type.Any())),
  fields: Type.Optional(Type.Array(Type.String())),
  sort: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000, default: 100 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});

type DataQueryParamsType = Static<typeof DataQueryParams>;

const dataRoutesV2: FastifyPluginAsync = async (fastify) => {
  const dataRetrievalUseCase = container.resolve<IDataRetrievalUseCase>(
    DI_TOKENS.DataRetrievalUseCase,
  );

  // v2のエンドポイント（拡張機能付き）
  fastify.get<{
    Params: { '*': string };
    Querystring: DataQueryParamsType;
  }>('/*', {
    handler: fastify.routeVersion(['2', '2.1'], async (_request: import('fastify').FastifyRequest<{
      Params: { '*': string };
      Querystring: DataQueryParamsType;
    }>, _reply: import('fastify').FastifyReply) => {
      try {
        const user = _request.user as AuthenticatedUser;
        const dataPath = _request.params['*'];
        const { filter, fields, sort, limit, offset } = _request.query;

        // v2の実装（フィルタリング機能追加）
        const result = await dataRetrievalUseCase.retrieveData(dataPath, user);

        if (result.isFailure) {
          const error = result.getError();
          const problemDetails = toProblemDetails(error, _request.url);

          let statusCode = 500;
          if (error instanceof DomainError && error.type === 'NOT_FOUND') {
            statusCode = 404;
          } else if (error instanceof DomainError && error.type === 'VALIDATION') {
            statusCode = 400;
          }

          return _reply.code(statusCode).send(problemDetails);
        }

        const data = result.getValue();
        let processedContent = data.content;

        // v2で追加されたフィルタリング処理（仮実装）
        if (filter && typeof processedContent === 'object' && Array.isArray(processedContent)) {
          processedContent = processedContent.filter((item) => {
            return Object.entries(filter).every(([key, value]) => {
              return item[key] === value;
            });
          });
        }

        // フィールド選択
        if (fields && fields.length > 0 && Array.isArray(processedContent)) {
          processedContent = processedContent.map((item: any) => {
            const filtered: any = {};
            fields.forEach((field: any) => {
              if (field in item) {
                filtered[field] = item[field];
              }
            });
            return filtered;
          });
        }

        // ソート（簡易実装）
        if (sort && Array.isArray(processedContent)) {
          const [field, order] = sort.split(':');
          processedContent.sort((a, b) => {
            if (order === 'desc') {
              return b[field] > a[field] ? 1 : -1;
            }
            return a[field] > b[field] ? 1 : -1;
          });
        }

        // ページネーション
        let paginatedContent = processedContent;
        let totalCount = Array.isArray(processedContent) ? processedContent.length : 1;

        if (Array.isArray(processedContent) && (limit || offset)) {
          const start = offset || 0;
          const end = limit ? start + limit : undefined;
          paginatedContent = processedContent.slice(start, end);
        }

        // v2では拡張ヘッダーを含む
        _reply.headers({
          'Cache-Control': 'public, max-age=3600',
          ETag: `"${data.checksum}"`,
          'Last-Modified': data.lastModified.toUTCString(),
          'Content-Type': 'application/json',
          'X-Total-Count': totalCount.toString(),
        });

        return {
          version: '2',
          data: paginatedContent,
          metadata: {
            filtered: !!filter,
            sorted: !!sort,
            fields: fields || [],
            pagination: {
              limit: limit || null,
              offset: offset || 0,
              total: totalCount,
            },
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        const problemDetails = toProblemDetails(
          {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            type: 'INTERNAL' as const,
          },
          _request.url,
        );

        return _reply.code(500).send(problemDetails);
      }
    }),
    schema: {
      description: 'Get open data with filtering (API v2)',
      tags: ['Data', 'v2'],
      params: Type.Object({
        '*': Type.String({
          description: 'Data file path',
        }),
      }),
      querystring: DataQueryParams,
      response: {
        200: Type.Object({
          version: Type.String(),
          data: Type.Any(),
          metadata: Type.Object({
            filtered: Type.Boolean(),
            sorted: Type.Boolean(),
            fields: Type.Array(Type.String()),
            pagination: Type.Object({
              limit: Type.Union([Type.Number(), Type.Null()]),
              offset: Type.Number(),
              total: Type.Number(),
            }),
            timestamp: Type.String(),
          }),
        }),
      },
    },
    preHandler: [fastify.authenticate, fastify.checkRateLimit],
  });
};

export default dataRoutesV2;
