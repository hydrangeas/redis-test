import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { container } from 'tsyringe';
import { IDataRetrievalUseCase } from '@/application/interfaces/data-retrieval-use-case.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { toProblemDetails } from '@/presentation/errors/error-mapper';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';

const dataRoutesV1: FastifyPluginAsync = async (fastify) => {
  const dataRetrievalUseCase = container.resolve<IDataRetrievalUseCase>(DI_TOKENS.DataRetrievalUseCase);

  // v1専用のエンドポイント
  fastify.get('/*', {
    handler: fastify.routeVersion('1', async (request, reply) => {
      try {
        const user = request.user as AuthenticatedUser;
        const dataPath = request.params['*'];

        // v1の実装（基本機能のみ）
        const result = await dataRetrievalUseCase.retrieveData(dataPath, user);

        if (result.isFailure) {
          const error = result.getError();
          const problemDetails = toProblemDetails(error, request.url);
          
          let statusCode = 500;
          if (error.type === 'NOT_FOUND') {
            statusCode = 404;
          } else if (error.type === 'VALIDATION') {
            statusCode = 400;
          }
          
          return reply.code(statusCode).send(problemDetails);
        }

        const data = result.getValue();
        
        // v1では基本的なヘッダーのみ
        reply.headers({
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
          request.url
        );

        return reply.code(500).send(problemDetails);
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