import { FastifyPluginAsync } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { container } from 'tsyringe';
import { AuthenticationUseCase } from '@/application/use-cases/authentication.use-case';
import { toProblemDetails } from '@/presentation/errors/error-mapper';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

// リクエストボディのスキーマ
const RefreshTokenRequest = Type.Object({
  refresh_token: Type.String({
    description: 'The refresh token obtained from login or previous refresh',
    minLength: 1,
  }),
});

// レスポンスボディのスキーマ
const RefreshTokenResponse = Type.Object({
  access_token: Type.String({
    description: 'New JWT access token',
  }),
  refresh_token: Type.String({
    description: 'New refresh token',
  }),
  expires_in: Type.Number({
    description: 'Token expiration time in seconds',
  }),
  token_type: Type.Literal('bearer'),
});

// エラーレスポンスのスキーマ
const ErrorResponse = Type.Object({
  type: Type.String(),
  title: Type.String(),
  status: Type.Number(),
  detail: Type.Optional(Type.String()),
  instance: Type.String(),
});

type RefreshTokenRequestType = Static<typeof RefreshTokenRequest>;
type RefreshTokenResponseType = Static<typeof RefreshTokenResponse>;

const refreshRoute: FastifyPluginAsync = async (fastify) => {
  const authUseCase = container.resolve<AuthenticationUseCase>(DI_TOKENS.AuthenticationUseCase);

  fastify.post<{
    Body: RefreshTokenRequestType;
    Reply: RefreshTokenResponseType | Static<typeof ErrorResponse>;
  }>(
    '/refresh',
    {
      schema: {
        description: 'Refresh access token using refresh token',
        tags: ['Authentication'],
        body: RefreshTokenRequest,
        response: {
          200: {
            description: 'Token refreshed successfully',
            ...RefreshTokenResponse,
          },
          401: {
            description: 'Invalid or expired refresh token',
            ...ErrorResponse,
          },
          503: {
            description: 'Service unavailable',
            ...ErrorResponse,
          },
        },
      },
      // このエンドポイントは認証不要（refresh tokenで認証）
      config: {
        requireAuth: false,
      },
    },
    async (request, reply) => {
      const { refresh_token } = request.body;

      request.log.info(
        {
          hasRefreshToken: !!refresh_token,
          tokenLength: refresh_token?.length,
        },
        'Token refresh request received',
      );

      try {
        // リフレッシュトークンの基本検証
        if (!refresh_token || refresh_token.trim().length === 0) {
          const problemDetails = toProblemDetails(
            {
              code: 'MISSING_REFRESH_TOKEN',
              message: 'Refresh token is required',
              type: 'UNAUTHORIZED',
            },
            request.url,
          );

          return reply
            .code(401)
            .header('content-type', 'application/problem+json')
            .send(problemDetails);
        }

        // トークンリフレッシュ処理
        const result = await authUseCase.refreshToken(refresh_token);

        if (!result.success) {
          const problemDetails = toProblemDetails(result.error, request.url);

          request.log.warn(
            {
              error: result.error?.code,
              message: result.error?.message,
            },
            'Token refresh failed',
          );

          // エラーの種類によってステータスコードを決定
          const statusCode = result.error?.type === 'EXTERNAL_SERVICE' ? 503 : 401;

          return reply
            .code(statusCode)
            .header('content-type', 'application/problem+json')
            .send(problemDetails);
        }

        request.log.info(
          {
            expiresIn: result.data.expiresIn,
          },
          'Token refreshed successfully',
        );

        // 成功レスポンス
        const response: RefreshTokenResponseType = {
          access_token: result.data.accessToken,
          refresh_token: result.data.refreshToken,
          expires_in: result.data.expiresIn,
          token_type: 'bearer',
        };

        return reply.send(response);
      } catch (error) {
        request.log.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
          'Unexpected error during token refresh',
        );

        const problemDetails = toProblemDetails(
          {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
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

export default refreshRoute;
