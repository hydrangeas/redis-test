import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { IRateLimitService } from '@/domain/api/interfaces/rate-limit-service.interface';
import { Endpoint as APIEndpoint } from '@/domain/api/value-objects/endpoint';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { ApiPath } from '@/domain/api/value-objects/api-path';
import { toProblemDetails } from '@/presentation/errors/error-mapper';
import { DomainError } from '@/domain/errors/domain-error';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { rateLimitHits, rateLimitExceeded } from '@/monitoring/metrics';

export interface RateLimitPluginOptions {
  // レート制限をスキップするパス
  excludePaths?: string[];
  // レート制限をスキップするパスパターン
  excludePatterns?: RegExp[];
  // カスタムキー生成関数
  keyGenerator?: (request: FastifyRequest) => string;
  // レート制限情報をレスポンスヘッダーに含めるか
  includeHeaders?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    checkRateLimit: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    rateLimitInfo?: any;
  }
}

const rateLimitPlugin: FastifyPluginAsync<RateLimitPluginOptions> = async (fastify, options) => {
  const rateLimitService = container.resolve<IRateLimitService>(DI_TOKENS.RateLimitService);

  const defaultExcludePaths = [
    '/',
    '/health',
    '/api-docs',
    '/openapi.json',
    '/api/v1/auth/refresh', // リフレッシュトークンは除外
  ];

  const excludePaths = [...defaultExcludePaths, ...(options.excludePaths || [])];

  const excludePatterns = options.excludePatterns || [/^\/static\//, /^\/public\//];

  const includeHeaders = options.includeHeaders !== false; // デフォルトはtrue

  /**
   * レート制限が必要かチェック
   */
  const requiresRateLimit = (request: FastifyRequest): boolean => {
    const path = request.url.split('?')[0];

    // 除外パスの完全一致チェック
    if (excludePaths.includes(path)) {
      return false;
    }

    // 除外パターンのマッチングチェック
    for (const pattern of excludePatterns) {
      if (pattern.test(path)) {
        return false;
      }
    }

    return true;
  };

  /**
   * レート制限をチェックする関数をデコレーターとして登録
   */
  const checkRateLimit = async (request: FastifyRequest, reply: FastifyReply) => {
    // 認証されていない場合はスキップ（認証ミドルウェアで処理）
    if (!request.user) {
      return;
    }

    // レート制限不要なパスはスキップ
    if (!requiresRateLimit(request)) {
      request.log.debug({ path: request.url }, 'Skipping rate limit');
      return;
    }

    try {
      const user = request.user;
      const endpoint = new APIEndpoint(
        HttpMethod[request.method as keyof typeof HttpMethod],
        new ApiPath(request.url.split('?')[0]),
      );

      // レート制限チェック
      const rateLimitResult = await rateLimitService.checkLimit(user, endpoint);

      // メトリクスの記録
      rateLimitHits.inc({
        user_tier: user.tier.level,
        endpoint: endpoint.toString(),
      });

      // ヘッダーの設定（成功・失敗に関わらず）
      if (includeHeaders) {
        reply.headers({
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': Math.max(0, rateLimitResult.remaining).toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
        });

        // 使用率が高い場合の警告
        const usagePercentage =
          ((rateLimitResult.limit - rateLimitResult.remaining) / rateLimitResult.limit) * 100;

        if (usagePercentage >= 80) {
          reply.header('X-RateLimit-Warning', `${Math.round(usagePercentage)}% of rate limit used`);
        }
      }

      // 制限を超えている場合
      if (!rateLimitResult.allowed) {
        // メトリクスの記録
        rateLimitExceeded.inc({
          user_tier: user.tier.level,
          endpoint: endpoint.toString(),
        });

        const problemDetails = toProblemDetails(
          new DomainError(
            'RATE_LIMIT_EXCEEDED',
            `API rate limit exceeded for ${user.tier.level}`,
            'RATE_LIMIT',
            {
              limit: rateLimitResult.limit,
              window: `${user.tier.rateLimit.windowSeconds} seconds`,
              tier: user.tier.level,
            },
          ),
          request.url,
        );

        // Retry-Afterヘッダーの設定
        reply.header('Retry-After', rateLimitResult.retryAfter.toString());

        request.log.warn(
          {
            userId: user.userId.value,
            tier: user.tier.level,
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            resetAt: new Date(rateLimitResult.resetAt * 1000).toISOString(),
            endpoint: endpoint.toString(),
          },
          'Rate limit exceeded',
        );

        await reply.code(429).send(problemDetails);
        return; // Early return to stop processing
      }

      // レート制限情報をリクエストに付加（後続処理で使用可能）
      request.rateLimitInfo = rateLimitResult;

      request.log.debug(
        {
          userId: user.userId.value,
          tier: user.tier.level,
          remaining: rateLimitResult.remaining,
          limit: rateLimitResult.limit,
        },
        'Rate limit check passed',
      );
    } catch (error) {
      // レート制限サービスのエラーはリクエストを通す（fail open）
      request.log.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Rate limit service error - allowing request',
      );

      // エラーが発生した場合でも、基本的なヘッダーは設定
      if (includeHeaders && request.user) {
        const tier = request.user.tier;
        reply.headers({
          'X-RateLimit-Limit': tier.rateLimit.maxRequests.toString(),
          'X-RateLimit-Remaining': 'unknown',
          'X-RateLimit-Reset': 'unknown',
        });
      }
    }
  };

  // checkRateLimitをデコレーターとして登録
  fastify.decorate('checkRateLimit', checkRateLimit);

  /**
   * レート制限使用量の記録（レスポンス後）
   */
  fastify.addHook('onResponse', async (request, reply) => {
    // 認証されていない、またはレート制限不要な場合はスキップ
    if (!request.user || !requiresRateLimit(request)) {
      return;
    }

    // 成功したリクエストのみカウント（4xx, 5xxはカウントしない）
    if (reply.statusCode >= 200 && reply.statusCode < 300) {
      try {
        const endpoint = new APIEndpoint(
          HttpMethod[request.method as keyof typeof HttpMethod],
          new ApiPath(request.url.split('?')[0]),
        );

        await rateLimitService.recordUsage(request.user, endpoint);

        request.log.debug(
          {
            userId: request.user.userId.value,
            endpoint: endpoint.toString(),
            statusCode: reply.statusCode,
          },
          'Rate limit usage recorded',
        );
      } catch (error) {
        // 記録の失敗はログのみ
        request.log.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to record rate limit usage',
        );
      }
    }
  });

  // Fastifyのデコレーター追加
  fastify.decorate('rateLimitInfo', null);
};

// TypeScript定義の拡張
declare module 'fastify' {
  interface FastifyRequest {
    rateLimitInfo?: {
      allowed: boolean;
      limit: number;
      remaining: number;
      resetAt: number;
      retryAfter: number;
    };
  }

  interface FastifyInstance {
    checkRateLimit: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(rateLimitPlugin, {
  fastify: '4.x',
  name: 'rate-limit-plugin',
  dependencies: ['auth-plugin'], // 認証プラグインの後に実行
});
