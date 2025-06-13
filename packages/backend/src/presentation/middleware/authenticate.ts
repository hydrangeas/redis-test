import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { AuthenticationUseCase } from '@/application/use-cases/authentication.use-case';
import { toProblemDetails } from '@/presentation/errors/error-mapper';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

/**
 * 認証ミドルウェア
 * Authorizationヘッダーからトークンを抽出し、検証する
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Authorizationヘッダーの取得
    const authHeader = request.headers.authorization;
    
    if (!authHeader || typeof authHeader !== 'string') {
      const problemDetails = toProblemDetails(
        {
          code: 'MISSING_AUTH_HEADER',
          message: 'Missing or invalid authorization header',
          type: 'UNAUTHORIZED',
        },
        request.url
      );
      
      reply
        .code(401)
        .header('content-type', 'application/problem+json')
        .header('www-authenticate', 'Bearer')
        .send(problemDetails);
      return;
    }

    // Bearer トークンの抽出
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!bearerMatch || !bearerMatch[1]) {
      const problemDetails = toProblemDetails(
        {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Authorization header must use Bearer scheme',
          type: 'UNAUTHORIZED',
        },
        request.url
      );
      
      reply
        .code(401)
        .header('content-type', 'application/problem+json')
        .header('www-authenticate', 'Bearer')
        .send(problemDetails);
      return;
    }

    const token = bearerMatch[1];
    
    // トークンの検証
    const authUseCase = container.resolve<AuthenticationUseCase>(DI_TOKENS.AuthenticationUseCase);
    const result = await authUseCase.validateToken(token);

    if (!result.success) {
      const problemDetails = toProblemDetails(
        result.error,
        request.url
      );
      
      request.log.warn({
        error: result.error?.code,
        message: result.error?.message,
      }, 'Authentication failed');
      
      reply
        .code(401)
        .header('content-type', 'application/problem+json')
        .header('www-authenticate', 'Bearer')
        .send(problemDetails);
      return;
    }

    // 認証成功 - ユーザー情報をリクエストに追加
    request.user = result.data.user;
    request.authenticatedUser = result.data.user;
    
    request.log.info({
      userId: result.data.user.userId.value,
      tier: result.data.user.tier.level,
    }, 'User authenticated successfully');
    
  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Unexpected error during authentication');

    const problemDetails = toProblemDetails(
      {
        code: 'AUTH_ERROR',
        message: 'An error occurred during authentication',
        type: 'INTERNAL',
      },
      request.url
    );

    reply
      .code(500)
      .header('content-type', 'application/problem+json')
      .send(problemDetails);
  }
}

/**
 * 認証デコレータプラグイン
 * Fastifyインスタンスに認証メソッドを追加
 */
export function registerAuthDecorator(fastify: any): void {
  fastify.decorate('authenticate', authenticate);
}

// Fastifyの型定義を拡張
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
  }
}