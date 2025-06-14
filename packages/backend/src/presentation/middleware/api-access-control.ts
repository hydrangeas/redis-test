import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { IAPIAccessControlUseCase } from '@/application/interfaces/api-access-control-use-case.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { createProblemDetails } from '../errors/error-mapper';

/**
 * APIアクセス制御ミドルウェア
 * 認証、認可、レート制限を統合的にチェック
 */
export async function apiAccessControlMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiAccessControlUseCase = container.resolve<IAPIAccessControlUseCase>(
    DI_TOKENS.APIAccessControlUseCase
  );

  // ユーザー情報の取得（認証ミドルウェアで設定されたもの）
  const user = request.user;
  if (!user) {
    const problemDetails = createProblemDetails({
      type: 'unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Authentication required',
      instance: request.url
    });
    return reply.code(401).send(problemDetails);
  }

  // AuthenticatedUserオブジェクトの作成
  const userIdResult = UserId.create(user.sub);
  if (userIdResult.isFailure) {
    const problemDetails = createProblemDetails({
      type: 'internal_error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Invalid user ID format',
      instance: request.url
    });
    return reply.code(500).send(problemDetails);
  }

  // ティア情報の取得（デフォルトはtier1）
  const tierLevel = user.tier || 'tier1';
  const rateLimitConfig = getRateLimitForTier(tierLevel);
  
  const tierResult = UserTier.create({
    level: tierLevel,
    rateLimit: new RateLimit(rateLimitConfig.limit, rateLimitConfig.window)
  });

  if (tierResult.isFailure) {
    const problemDetails = createProblemDetails({
      type: 'internal_error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Invalid tier configuration',
      instance: request.url
    });
    return reply.code(500).send(problemDetails);
  }

  const authenticatedUserResult = AuthenticatedUser.create({
    id: userIdResult.getValue(),
    email: user.email || '',
    tier: tierResult.getValue(),
    provider: user.provider || 'unknown'
  });

  if (authenticatedUserResult.isFailure) {
    const problemDetails = createProblemDetails({
      type: 'internal_error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to create authenticated user',
      instance: request.url
    });
    return reply.code(500).send(problemDetails);
  }

  // APIアクセス制御チェック
  const endpoint = request.url.split('?')[0]; // クエリパラメータを除去
  const method = request.method;
  const metadata = {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    correlationId: request.id
  };

  const accessResult = await apiAccessControlUseCase.checkAndRecordAccess(
    authenticatedUserResult.getValue(),
    endpoint,
    method,
    metadata
  );

  if (accessResult.isFailure) {
    request.log.error({
      error: accessResult.error,
      userId: user.sub,
      endpoint,
      method
    }, 'API access control check failed');

    const problemDetails = createProblemDetails({
      type: 'internal_error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to check access permissions',
      instance: request.url
    });
    return reply.code(500).send(problemDetails);
  }

  const decision = accessResult.getValue();

  // アクセス拒否の場合
  if (!decision.allowed) {
    switch (decision.reason) {
      case 'rate_limit_exceeded':
        // レート制限ヘッダーの設定
        if (decision.rateLimitStatus) {
          reply.header('X-RateLimit-Limit', decision.rateLimitStatus.limit.toString());
          reply.header('X-RateLimit-Remaining', decision.rateLimitStatus.remainingRequests.toString());
          reply.header('X-RateLimit-Reset', decision.rateLimitStatus.windowEnd.toISOString());
          if (decision.rateLimitStatus.retryAfter) {
            reply.header('Retry-After', decision.rateLimitStatus.retryAfter.toString());
          }
        }

        const rateLimitDetails = createProblemDetails({
          type: 'rate_limit_exceeded',
          title: 'Too Many Requests',
          status: 429,
          detail: decision.message || 'Rate limit exceeded',
          instance: request.url
        });
        return reply.code(429).send(rateLimitDetails);

      case 'unauthorized':
        const unauthorizedDetails = createProblemDetails({
          type: 'forbidden',
          title: 'Forbidden',
          status: 403,
          detail: decision.message || 'Access to this resource is forbidden',
          instance: request.url
        });
        return reply.code(403).send(unauthorizedDetails);

      case 'endpoint_not_found':
        const notFoundDetails = createProblemDetails({
          type: 'not_found',
          title: 'Not Found',
          status: 404,
          detail: decision.message || 'Endpoint not found',
          instance: request.url
        });
        return reply.code(404).send(notFoundDetails);

      default:
        const genericDetails = createProblemDetails({
          type: 'forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'Access denied',
          instance: request.url
        });
        return reply.code(403).send(genericDetails);
    }
  }

  // アクセス許可の場合、レート制限ヘッダーを設定
  if (decision.rateLimitStatus) {
    reply.header('X-RateLimit-Limit', decision.rateLimitStatus.limit.toString());
    reply.header('X-RateLimit-Remaining', decision.rateLimitStatus.remainingRequests.toString());
    reply.header('X-RateLimit-Reset', decision.rateLimitStatus.windowEnd.toISOString());
  }

  // リクエストにレート制限情報を追加（後続の処理で使用可能）
  request.rateLimitStatus = decision.rateLimitStatus;
}

/**
 * ティアに基づくレート制限設定を取得
 */
function getRateLimitForTier(tier: string): { limit: number; window: number } {
  const config = {
    tier1: { limit: 60, window: 60 },
    tier2: { limit: 120, window: 60 },
    tier3: { limit: 300, window: 60 }
  };

  return config[tier as keyof typeof config] || config.tier1;
}

/**
 * 公開エンドポイントのアクセスを記録するミドルウェア
 */
export async function publicAccessLoggingMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiAccessControlUseCase = container.resolve<IAPIAccessControlUseCase>(
    DI_TOKENS.APIAccessControlUseCase
  );

  const endpoint = request.url.split('?')[0];
  const method = request.method;
  const metadata = {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    correlationId: request.id
  };

  // 公開エンドポイントへのアクセスを記録（エラーは無視）
  await apiAccessControlUseCase.recordPublicAccess(endpoint, method, metadata);
}