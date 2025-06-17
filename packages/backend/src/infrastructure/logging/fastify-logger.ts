import { randomUUID } from 'crypto';


import { createLogger } from './logger';

import type { EnvConfig } from '../config';
import type { FastifyServerOptions, FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';

/**
 * Fastify用のロガー設定を生成
 */
export function createFastifyLoggerConfig(config: EnvConfig): FastifyServerOptions {
  return {
    logger: createLogger(config),
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
    genReqId: (req: FastifyRequest) => (req.headers['x-request-id'] as string) || randomUUID(),
  };
}

/**
 * リクエスト/レスポンスのロギングフックを設定
 */
export function setupRequestLogging(server: FastifyInstance): void {
  // リクエスト開始時のログ
  server.addHook('onRequest', async (request: FastifyRequest) => {
    request.log.info(
      {
        req: request,
        event: 'request_start',
      },
      'incoming request',
    );
  });

  // レスポンス送信時のログ
  server.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    request.log.info(
      {
        req: request,
        res: reply,
        event: 'request_complete',
        responseTime: reply.getResponseTime(),
      },
      'request completed',
    );
  });

  // エラー発生時のログ
  server.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    request.log.error(
      {
        req: request,
        res: reply,
        err: error,
        event: 'request_error',
      },
      'request error',
    );
  });
}
