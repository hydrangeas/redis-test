import { randomUUID } from 'crypto';


import { createLogger } from './logger';

import type { EnvConfig } from '../config';
import type { FastifyServerOptions } from 'fastify';

/**
 * Fastify用のロガー設定を生成
 */
export function createFastifyLoggerConfig(config: EnvConfig): FastifyServerOptions {
  return {
    logger: createLogger(config),
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
    genReqId: (req: any) => req.headers['x-request-id'] || randomUUID(),
  };
}

/**
 * リクエスト/レスポンスのロギングフックを設定
 */
export function setupRequestLogging(server: any): void {
  // リクエスト開始時のログ
  server.addHook('onRequest', async (request: any) => {
    request.log.info(
      {
        req: request,
        event: 'request_start',
      },
      'incoming request',
    );
  });

  // レスポンス送信時のログ
  server.addHook('onResponse', async (request: any, reply: any) => {
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
  server.addHook('onError', async (request: any, reply: any, error: Error) => {
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
