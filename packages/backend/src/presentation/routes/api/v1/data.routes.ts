import { Type } from '@sinclair/typebox';
import { container } from 'tsyringe';

import { DomainError } from '@/domain/errors/domain-error';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { toProblemDetails } from '@/presentation/errors/error-mapper';

import type { IDataRetrievalUseCase } from '@/application/interfaces/data-retrieval-use-case.interface';
import type { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

const dataRoutesV1: FastifyPluginAsync = async (fastify) => {
  const dataRetrievalUseCase = container.resolve<IDataRetrievalUseCase>(
    DI_TOKENS.DataRetrievalUseCase,
  );

  // v1専用のエンドポイント
  fastify.get<{ Params: { '*': string } }>('/*', {
    handler: fastify.routeVersion('1', async (_request: FastifyRequest<{ Params: { '*': string } }>, _reply: FastifyReply) => {
      try {
        const user = _request.user as AuthenticatedUser;
        const dataPath = _request.params['*'];

        // v1の実装（基本機能のみ）
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

        // v1では基本的なヘッダーのみ
        _reply.headers({
          'Cache-Control': 'public, max-age=3600',
          'Content-Type': 'application/json',
        });

        return {
          version: '1',
          data: data.content,
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
      description: 'Get open data (API v1)',
      tags: ['Data', 'v1'],
      deprecated: true, // v1は非推奨
      params: Type.Object({
        '*': Type.String({
          description: 'Data file path',
        }),
      }),
      response: {
        200: Type.Object({
          version: Type.String(),
          data: Type.Any(),
        }),
      },
    },
    preHandler: [fastify.authenticate, fastify.checkRateLimit],
  });
};

export default dataRoutesV1;
