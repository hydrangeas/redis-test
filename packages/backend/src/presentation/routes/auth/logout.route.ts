import { Type } from '@sinclair/typebox';
import { container } from 'tsyringe';

import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { toProblemDetails } from '@/presentation/errors/error-mapper';

import type { AuthenticationUseCase } from '@/application/use-cases/authentication.use-case';
import type { Static} from '@sinclair/typebox';
import type { FastifyPluginAsync } from 'fastify';

// レスポンススキーマ
const LogoutResponse = Type.Object({
  message: Type.String({
    description: 'Success message',
  }),
  timestamp: Type.String({
    description: 'Logout timestamp in ISO 8601 format',
  }),
});

// エラーレスポンスのスキーマ
const ErrorResponse = Type.Object({
  type: Type.String(),
  title: Type.String(),
  status: Type.Number(),
  detail: Type.Optional(Type.String()),
  instance: Type.Optional(Type.String()),
});

type LogoutResponseType = Static<typeof LogoutResponse>;

const logoutRoute: FastifyPluginAsync = async (fastify) => {
  const authUseCase = container.resolve<AuthenticationUseCase>(DI_TOKENS.AuthenticationUseCase);

  fastify.post<{
    Reply: LogoutResponseType | Static<typeof ErrorResponse>;
  }>(
    '/logout',
    {
      schema: {
        description: 'Logout the authenticated user',
        tags: ['Authentication'],
        response: {
          200: {
            description: 'Logout successful',
            ...LogoutResponse,
          },
          401: {
            description: 'Unauthorized - Invalid or missing token',
            ...ErrorResponse,
          },
          503: {
            description: 'Service unavailable',
            ...ErrorResponse,
          },
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
      try {
        // 認証済みユーザーの取得（preHandlerで保証される）
        const authenticatedUser = request.user;

        if (!authenticatedUser) {
          const problemDetails = toProblemDetails(
            {
              code: 'USER_NOT_AUTHENTICATED',
              message: 'User not authenticated',
              type: 'UNAUTHORIZED',
            },
            request.url,
          );

          return reply
            .code(401)
            .header('content-type', 'application/problem+json')
            .send(problemDetails);
        }

        request.log.info(
          {
            userId: authenticatedUser.userId.value,
            tier: authenticatedUser.tier.level,
          },
          'Logout request received',
        );

        // ログアウト処理
        const result = await authUseCase.signOut(authenticatedUser.userId.value);

        if (!result.success) {
          const problemDetails = toProblemDetails(result.error, request.url);

          request.log.error(
            {
              userId: authenticatedUser.userId.value,
              error: result.error?.code,
            },
            'Logout failed',
          );

          // エラーの種類によってステータスコードを決定
          const statusCode = result.error?.type === 'EXTERNAL_SERVICE' ? 503 : 500;

          return reply
            .code(statusCode)
            .header('content-type', 'application/problem+json')
            .send(problemDetails);
        }

        request.log.info(
          {
            userId: authenticatedUser.userId.value,
          },
          'User logged out successfully',
        );

        // 成功レスポンス
        const response: LogoutResponseType = {
          message: 'Logout successful',
          timestamp: new Date().toISOString(),
        };

        // クライアントへのヒント：トークンを削除するよう指示
        void reply.header('Clear-Site-Data', '"storage"');

        return reply.send(response);
      } catch (error) {
        request.log.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            userId: request.user?.userId.value,
          },
          'Unexpected error during logout',
        );

        const problemDetails = toProblemDetails(
          {
            code: 'LOGOUT_ERROR',
            message: 'An error occurred during logout',
            type: 'EXTERNAL_SERVICE',
          },
          request.url,
        );

        return reply
          .code(503)
          .header('content-type', 'application/problem+json')
          .send(problemDetails);
      }
    },
  );
};

export default logoutRoute;
