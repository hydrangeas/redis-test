import { Type } from '@sinclair/typebox';
import { container } from 'tsyringe';

import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { toProblemDetails } from '@/presentation/errors/error-mapper';

import type { IDataRetrievalUseCase } from '@/application/interfaces/data-retrieval-use-case.interface';
import type { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import type { Static } from '@sinclair/typebox';
import type { FastifyPluginAsync } from 'fastify';

const DataQueryParams = Type.Object({
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000, default: 100 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
  sort: Type.Optional(Type.String()),
  filter: Type.Optional(Type.Record(Type.String(), Type.Any())),
  fields: Type.Optional(Type.Array(Type.String())),
});

type DataQueryParamsType = Static<typeof DataQueryParams>;

const dataRoutesV2: FastifyPluginAsync = (fastify) => {
  const dataRetrievalUseCase = container.resolve<IDataRetrievalUseCase>(
    DI_TOKENS.DataRetrievalUseCase,
  );

  // v2/v2.1専用のエンドポイント（拡張機能付き）
  fastify.get('/*', {
    schema: {
      description: 'Get open data with filtering and pagination (API v2)',
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
            total: Type.Optional(Type.Number()),
            limit: Type.Optional(Type.Number()),
            offset: Type.Optional(Type.Number()),
          }),
        }),
      },
    },
    preHandler: [fastify.authenticate, fastify.checkRateLimit],
  }, async (_request, _reply) => {
    // バージョンチェック
    const acceptedVersions = ['2', '2.1'];
    if (!acceptedVersions.includes(_request.apiVersion || '')) {
      return _reply.code(404).send({
        type: `${process.env.API_URL}/errors/not_found`,
        title: 'Endpoint not found',
        status: 404,
        detail: `This endpoint is not available in version ${_request.apiVersion}`,
        instance: _request.url,
        availableVersions: acceptedVersions,
      });
    }

    try {
      const user = _request.user as AuthenticatedUser;
      const params = _request.params as Record<string, string>;
      const dataPath = params['*'];
      const { filter, fields, sort, limit, offset } = _request.query as DataQueryParamsType;

      // v2の実装（フィルタリング機能追加）
      const result = await dataRetrievalUseCase.retrieveData(dataPath, user);

      if (result.isFailure) {
        const error = result.getError();
        const problemDetails = toProblemDetails(error, _request.url);

        let statusCode = 500;
        if (error instanceof DomainError && error.type === ErrorType.NOT_FOUND) {
          statusCode = 404;
        } else if (error instanceof DomainError && error.type === ErrorType.VALIDATION) {
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
            return (item as Record<string, unknown>)[key] === value;
          });
        });
      }

      // フィールド選択
      if (fields && fields.length > 0 && Array.isArray(processedContent)) {
        processedContent = processedContent.map((item) => {
          const filtered: Record<string, unknown> = {};
          const itemRecord = item as Record<string, unknown>;
          fields.forEach((field: string) => {
            if (field in itemRecord) {
              filtered[field] = itemRecord[field];
            }
          });
          return filtered;
        });
      }

      // ソート（簡易実装）
      if (sort && Array.isArray(processedContent)) {
        const [field, order] = sort.split(':');
        processedContent.sort((a, b) => {
          const aRecord = a as Record<string, unknown>;
          const bRecord = b as Record<string, unknown>;
          if (order === 'desc') {
            return bRecord[field] > aRecord[field] ? 1 : -1;
          }
          return aRecord[field] > bRecord[field] ? 1 : -1;
        });
      }

      // ページネーション
      const total = Array.isArray(processedContent) ? processedContent.length : undefined;
      if (Array.isArray(processedContent) && limit) {
        const start = offset || 0;
        processedContent = processedContent.slice(start, start + limit);
      }

      // キャッシュヘッダー（より積極的）
      void _reply.headers({
        'Cache-Control': 'public, max-age=7200, s-maxage=86400',
        'ETag': `"${data.checksum}"`,
        'Last-Modified': data.lastModified.toUTCString(),
        'Content-Type': 'application/json',
      });

      return {
        version: _request.apiVersion || '2',
        data: processedContent,
        metadata: {
          total,
          limit,
          offset,
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
  });
  return Promise.resolve();
};

export default dataRoutesV2;