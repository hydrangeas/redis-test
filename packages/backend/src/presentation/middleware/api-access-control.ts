import { container } from 'tsyringe';

import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

// AuthenticatedUser import removed - using from request.user directly
import { toProblemDetails } from '../errors/error-mapper';

import type { IAPIAccessControlUseCase } from '@/application/interfaces/api-access-control-use-case.interface';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * APIアクセス制御ミドルウェア
 * 認証、認可、レート制限を統合的にチェック
 */
export async function apiAccessControlMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const apiAccessControlUseCase = container.resolve<IAPIAccessControlUseCase>(
    DI_TOKENS.APIAccessControlUseCase,
  );

  // ユーザー情報の取得（認証ミドルウェアで設定されたもの）
  const authenticatedUser = request.user;
  if (!authenticatedUser) {
    const problemDetails = toProblemDetails(
      new DomainError('UNAUTHORIZED', 'Authentication required', ErrorType.UNAUTHORIZED),
      request.url
    );
    return reply.code(401).send(problemDetails);
  }

  // AuthenticatedUserはすでに認証ミドルウェアで作成されている
  request.authenticatedUser = authenticatedUser;

  // APIアクセス制御チェック
  const endpoint = request.url.split('?')[0]; // クエリパラメータを除去
  const method = request.method;
  const metadata = {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    correlationId: request.id,
  };

  const accessResult = await apiAccessControlUseCase.checkAndRecordAccess(
    authenticatedUser,
    endpoint,
    method,
    metadata,
  );

  if (accessResult.isFailure) {
    request.log.error(
      {
        error: accessResult.getError(),
        userId: authenticatedUser.userId.value,
        endpoint,
        method,
      },
      'API access control check failed',
    );

    const problemDetails = toProblemDetails(
      new DomainError('ACCESS_CHECK_FAILED', 'Failed to check access permissions', ErrorType.INTERNAL),
      request.url
    );
    return reply.code(500).send(problemDetails);
  }

  const decision = accessResult.getValue();

  // アクセス拒否の場合
  if (!decision.allowed) {
    switch (decision.reason) {
      case 'rate_limit_exceeded':
        // レート制限ヘッダーの設定
        if (decision.rateLimitStatus) {
          void reply.header('X-RateLimit-Limit', decision.rateLimitStatus.limit.toString());
          void reply.header(
            'X-RateLimit-Remaining',
            decision.rateLimitStatus.remaining.toString(),
          );
          void reply.header('X-RateLimit-Reset', new Date(decision.rateLimitStatus.resetAt * 1000).toISOString());
          if (decision.rateLimitStatus.retryAfter) {
            void reply.header('Retry-After', decision.rateLimitStatus.retryAfter.toString());
          }
        }

        const rateLimitDetails = toProblemDetails(
          new DomainError(
            'RATE_LIMIT_EXCEEDED',
            decision.message || 'Rate limit exceeded',
            ErrorType.RATE_LIMIT,
          ),
          request.url,
        );
        return reply.code(429).send(rateLimitDetails);

      case 'unauthorized':
        const unauthorizedDetails = toProblemDetails(
          new DomainError(
            'FORBIDDEN',
            decision.message || 'Access to this resource is forbidden',
            ErrorType.FORBIDDEN,
          ),
          request.url,
        );
        return reply.code(403).send(unauthorizedDetails);

      case 'endpoint_not_found':
        const notFoundDetails = toProblemDetails(
          new DomainError(
            'ENDPOINT_NOT_FOUND',
            decision.message || 'Endpoint not found',
            ErrorType.NOT_FOUND,
          ),
          request.url,
        );
        return reply.code(404).send(notFoundDetails);

      default:
        const genericDetails = toProblemDetails(
          new DomainError(
            'ACCESS_DENIED',
            'Access denied',
            ErrorType.FORBIDDEN,
          ),
          request.url,
        );
        return reply.code(403).send(genericDetails);
    }
  }

  // アクセス許可の場合、レート制限ヘッダーを設定
  if (decision.rateLimitStatus) {
    void reply.header('X-RateLimit-Limit', decision.rateLimitStatus.limit.toString());
    void reply.header('X-RateLimit-Remaining', decision.rateLimitStatus.remaining.toString());
    void reply.header('X-RateLimit-Reset', new Date(decision.rateLimitStatus.resetAt * 1000).toISOString());
  }

  // リクエストにレート制限情報を追加（後続の処理で使用可能）
  request.rateLimitStatus = decision.rateLimitStatus;
}

// getRateLimitForTier function removed - rate limit is already configured in AuthenticatedUser

/**
 * 公開エンドポイントのアクセスを記録するミドルウェア
 */
export async function publicAccessLoggingMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const apiAccessControlUseCase = container.resolve<IAPIAccessControlUseCase>(
    DI_TOKENS.APIAccessControlUseCase,
  );

  const endpoint = request.url.split('?')[0];
  const method = request.method;
  const metadata = {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    correlationId: request.id,
  };

  // 公開エンドポイントへのアクセスを記録（エラーは無視）
  await apiAccessControlUseCase.recordPublicAccess(endpoint, method, metadata);
}
