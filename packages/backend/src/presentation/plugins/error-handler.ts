import fp from 'fastify-plugin';

import { toProblemDetails, mapValidationError } from '../errors/error-mapper';

import type { DomainException } from '../../domain/errors/exceptions';
import type { ProblemDetails } from '../../domain/errors/problem-details';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

/**
 * グローバルエラーハンドラー
 */
export async function errorHandler(
  error: FastifyError | DomainException | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const logger = request.log;

  // リクエスト情報と共にエラーをログ記録
  logger.error(
    {
      err: error,
      requestId: request.id,
      method: request.method,
      url: request.url,
      userId: request.user?.userId?.value,
      ip: request.ip,
    },
    'Request error occurred',
  );

  // エラーがすでにレスポンス送信済みの場合は何もしない
  if (reply.sent) {
    return;
  }

  // Content-Typeを設定
  void reply.header('Content-Type', 'application/problem+json');

  // Fastifyバリデーションエラー
  if ('validation' in error && error.validation) {
    const problemDetails = mapValidationError(error.validation as any, request.url);
    return reply.status(problemDetails.status).send(problemDetails);
  }

  // DomainExceptionまたはその他のエラー
  const problemDetails = toProblemDetails(error, request.url);

  // ステータスコードを設定してレスポンス送信
  return reply.status(problemDetails.status).send(problemDetails);
}

/**
 * エラーハンドラープラグイン
 */
export default fp(
  function errorHandlerPlugin(fastify) {
    fastify.setErrorHandler(errorHandler);

    // 404エラーのカスタムハンドラー
    fastify.setNotFoundHandler((request, reply) => {
      const problemDetails: ProblemDetails = {
        type: `${process.env.API_BASE_URL || 'https://api.example.com'}/errors/not-found`,
        title: 'Resource not found',
        status: 404,
        detail: `The requested resource '${request.url}' does not exist`,
        instance: request.url,
      };

      void reply.status(404).header('Content-Type', 'application/problem+json').send(problemDetails);
    });
  },
  {
    name: 'error-handler',
    fastify: '4.x',
  },
);
