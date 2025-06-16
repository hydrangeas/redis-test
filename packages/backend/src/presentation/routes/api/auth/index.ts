import { FastifyPluginAsync } from 'fastify';
import { Type, Static } from '@sinclair/typebox';
import { container } from 'tsyringe';
import { IUserRepository } from '@/domain/auth/interfaces/user-repository.interface';
import { IRateLimitUseCase } from '@/application/interfaces/rate-limit-use-case.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { toProblemDetails } from '@/presentation/errors/error-mapper';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';

// レスポンススキーマ
const UserInfoResponse = Type.Object({
  userId: Type.String({ description: 'User ID' }),
  tier: Type.String({ description: 'User tier level' }),
  rateLimit: Type.Object({
    limit: Type.Number({ description: 'Maximum requests allowed' }),
    windowSeconds: Type.Number({ description: 'Time window in seconds' }),
  }),
});

const UsageStatusResponse = Type.Object({
  currentUsage: Type.Number({ description: 'Current usage count' }),
  limit: Type.Number({ description: 'Maximum allowed requests' }),
  remaining: Type.Number({ description: 'Remaining requests' }),
  resetAt: Type.Number({ description: 'Reset timestamp (Unix timestamp)' }),
  windowStart: Type.String({ description: 'Window start time (ISO format)' }),
  windowEnd: Type.String({ description: 'Window end time (ISO format)' }),
});

const ErrorResponse = Type.Object({
  type: Type.String({ description: 'Error type URI' }),
  title: Type.String({ description: 'Error title' }),
  status: Type.Number({ description: 'HTTP status code' }),
  detail: Type.Optional(Type.String({ description: 'Error details' })),
  instance: Type.String({ description: 'Instance URI' }),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const userRepository = container.resolve<IUserRepository>(DI_TOKENS.UserRepository);
  const rateLimitUseCase = container.resolve<IRateLimitUseCase>(DI_TOKENS.RateLimitUseCase);

  // 現在のユーザー情報取得
  fastify.get<{
    Reply: Static<typeof UserInfoResponse> | Static<typeof ErrorResponse>;
  }>(
    '/me',
    {
      schema: {
        description: 'Get current authenticated user information',
        tags: ['Authentication'],
        response: {
          200: UserInfoResponse,
          401: {
            description: 'Unauthorized',
            ...ErrorResponse,
          },
          500: {
            description: 'Internal server error',
            ...ErrorResponse,
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      preHandler: [fastify.authenticate, fastify.checkRateLimit],
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;

      try {
        return {
          userId: user.userId.toString(),
          tier: user.tier.level,
          rateLimit: {
            limit: user.tier.rateLimit.maxRequests,
            windowSeconds: user.tier.rateLimit.windowSeconds,
          },
        };
      } catch (error) {
        request.log.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: user.userId.toString(),
          },
          'Error getting user info',
        );

        const problemDetails = toProblemDetails(
          {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get user information',
            type: 'INTERNAL' as const,
          },
          request.url,
        );

        return reply.code(500).send(problemDetails);
      }
    },
  );

  // ユーザーの使用状況取得
  fastify.get<{
    Reply: Static<typeof UsageStatusResponse> | Static<typeof ErrorResponse>;
  }>(
    '/usage',
    {
      schema: {
        description: 'Get current API usage status',
        tags: ['Authentication'],
        response: {
          200: UsageStatusResponse,
          401: {
            description: 'Unauthorized',
            ...ErrorResponse,
          },
          500: {
            description: 'Internal server error',
            ...ErrorResponse,
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      preHandler: [fastify.authenticate, fastify.checkRateLimit],
    },
    async (request, reply) => {
      const user = request.user as AuthenticatedUser;

      try {
        // 使用状況を取得
        const usageResult = await rateLimitUseCase.getUserUsageStatus(user);

        if (usageResult.isFailure) {
          const error = usageResult.getError();
          const problemDetails = toProblemDetails(error, request.url);
          return reply.code(500).send(problemDetails);
        }

        const usage = usageResult.getValue();
        const remaining = Math.max(0, usage.limit - usage.currentCount);
        const resetAt = Math.floor(usage.windowEnd.getTime() / 1000);

        return {
          currentUsage: usage.currentCount,
          limit: usage.limit,
          remaining,
          resetAt,
          windowStart: usage.windowStart.toISOString(),
          windowEnd: usage.windowEnd.toISOString(),
        };
      } catch (error) {
        request.log.error(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: user.userId.toString(),
          },
          'Error getting usage status',
        );

        const problemDetails = toProblemDetails(
          {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get usage status',
            type: 'INTERNAL' as const,
          },
          request.url,
        );

        return reply.code(500).send(problemDetails);
      }
    },
  );

  // ティア情報取得
  fastify.get(
    '/tiers',
    {
      schema: {
        description: 'Get available tier information',
        tags: ['Authentication'],
        response: {
          200: Type.Object({
            tiers: Type.Array(
              Type.Object({
                name: Type.String({ description: 'Tier name' }),
                level: Type.String({ description: 'Tier level identifier' }),
                rateLimit: Type.Object({
                  requestsPerMinute: Type.Number({ description: 'Requests allowed per minute' }),
                  burstLimit: Type.Optional(
                    Type.Number({ description: 'Burst limit if applicable' }),
                  ),
                }),
                features: Type.Array(
                  Type.String({ description: 'Features available in this tier' }),
                ),
              }),
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      // ティア情報（設定から読み込むか、ハードコード）
      return {
        tiers: [
          {
            name: 'Basic',
            level: 'tier1',
            rateLimit: {
              requestsPerMinute: 60,
            },
            features: ['Basic API access', 'Standard data formats'],
          },
          {
            name: 'Standard',
            level: 'tier2',
            rateLimit: {
              requestsPerMinute: 120,
            },
            features: ['Enhanced API access', 'Priority support', 'Advanced data formats'],
          },
          {
            name: 'Premium',
            level: 'tier3',
            rateLimit: {
              requestsPerMinute: 300,
            },
            features: [
              'Unlimited API access',
              'Premium support',
              'All data formats',
              'Bulk download',
            ],
          },
        ],
      };
    },
  );
};

export default authRoutes;
