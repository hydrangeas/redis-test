import { Stream } from 'stream';

import { container } from 'tsyringe';

import { ApiPath } from '@/domain/api/value-objects/api-path';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { LogId } from '@/domain/log/value-objects/log-id';
import { RequestInfo } from '@/domain/log/value-objects/request-info';
import { ResponseInfo } from '@/domain/log/value-objects/response-info';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

import type { HttpMethod } from '@/domain/api/value-objects/http-method';
import type { IApiLogService } from '@/domain/log/interfaces/api-log-service.interface';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Logger } from 'pino';

// ApiLoggingContext interface removed - defined in fastify.d.ts

export const apiLoggingMiddleware = {
  // リクエスト開始時
  onRequest: (request: FastifyRequest, _reply: FastifyReply): void => {
    request.apiLoggingContext = {
      startTime: Date.now(),
      requestId: request.id,
    };

    // ユーザー情報の取得（認証済みの場合）
    if (request.user) {
      request.apiLoggingContext.userId = request.user.userId.value;
      request.apiLoggingContext.userTier = request.user.tier.level.toString();
    }
  },

  // レスポンス送信時
  onSend: (request: FastifyRequest, reply: FastifyReply, payload: unknown): unknown => {
    const apiLogService = container.resolve<IApiLogService>(DI_TOKENS.ApiLogService);
    const logger = container.resolve<Logger>(DI_TOKENS.Logger);

    try {
      // レスポンスタイムの計算
      const responseTime = Date.now() - (request.apiLoggingContext?.startTime || Date.now());

      // レスポンスサイズの計算
      const responseSize = calculatePayloadSize(payload);

      // エンドポイントの作成
      let apiPath: ApiPath;
      try {
        apiPath = new ApiPath(sanitizeEndpoint(request.url));
      } catch (error) {
        logger.warn({ path: request.url, error }, 'Invalid API path');
        return payload;
      }

      let endpoint: Endpoint;
      try {
        endpoint = new Endpoint(
          request.method as HttpMethod,
          apiPath
        );
      } catch (error) {
        logger.warn({ method: request.method, path: request.url, error }, 'Invalid endpoint');
        return payload;
      }

      // リクエスト情報の作成
      const requestInfo = new RequestInfo({
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || 'Unknown',
        headers: sanitizeHeaders(request.headers as Record<string, string>),
        body: request.body,
        queryParams: request.query as Record<string, string>,
      });

      // レスポンス情報の作成
      const responseInfo = new ResponseInfo({
        statusCode: reply.statusCode,
        responseTime,
        size: responseSize || 0,
        headers: reply.getHeaders() as Record<string, string>,
      });

      // APIログエントリの作成
      const logEntryResult = APILogEntry.create(
        {
          userId: request.apiLoggingContext?.userId ? UserId.fromString(request.apiLoggingContext.userId) : undefined,
          endpoint,
          requestInfo,
          responseInfo,
          timestamp: new Date(),
          error: reply.statusCode >= 400 ? extractErrorMessage(payload) : undefined,
        },
        LogId.generate(),
      );

      if (logEntryResult.isSuccess) {
        // 非同期でログを保存
        void apiLogService.saveLog(logEntryResult.getValue()).catch((error) => {
          logger.error({ error }, 'Failed to save API log');
        });
      } else {
        logger.warn({ error: logEntryResult.getError() }, 'Failed to create API log entry');
      }
    } catch (error) {
      logger.error({ error }, 'Error in API logging middleware');
    }

    return payload;
  },
};

function calculatePayloadSize(payload: unknown): number {
  if (!payload) return 0;

  if (typeof payload === 'string') {
    return Buffer.byteLength(payload, 'utf8');
  }

  if (Buffer.isBuffer(payload)) {
    return payload.length;
  }

  if (payload instanceof Stream) {
    return -1; // ストリームのサイズは不明
  }

  try {
    return Buffer.byteLength(JSON.stringify(payload), 'utf8');
  } catch {
    return -1;
  }
}

function sanitizeEndpoint(url: string): string {
  // クエリパラメータとフラグメントを除去
  const [path] = url.split('?');

  // 動的パラメータを正規化
  return path
    .split('/')
    .map((segment) => {
      // UUID pattern
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
        return '{id}';
      }
      // 数値ID
      if (/^\d+$/.test(segment)) {
        return '{id}';
      }
      return segment;
    })
    .join('/');
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as { error?: string; message?: string; detail?: string };
      return parsed.error || parsed.message || parsed.detail;
    } catch {
      return payload.substring(0, 500); // 最初の500文字
    }
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    return (obj.error as string | undefined) || (obj.message as string | undefined) || (obj.detail as string | undefined);
  }

  return undefined;
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized = { ...headers };

  // 機密情報をマスク
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-api-key'];

  return sanitized;
}
