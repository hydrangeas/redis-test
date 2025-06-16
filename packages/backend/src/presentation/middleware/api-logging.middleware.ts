import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { IApiLogService } from '@/domain/log/interfaces/api-log-service.interface';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { LogId } from '@/domain/log/value-objects/log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { APIPath } from '@/domain/api/value-objects/api-path';
import { RequestInfo } from '@/domain/log/value-objects/request-info';
import { ResponseInfo } from '@/domain/log/value-objects/response-info';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Logger } from 'pino';
import { Stream } from 'stream';
import { HttpMethodType } from '@/domain/log/value-objects/http-method';

interface RequestContext {
  startTime: number;
  userId?: string;
  userTier?: string;
  requestId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    context: RequestContext;
  }
}

export const apiLoggingMiddleware = {
  // リクエスト開始時
  onRequest: async (request: FastifyRequest, reply: FastifyReply) => {
    request.context = {
      startTime: Date.now(),
      requestId: request.id,
    };

    // ユーザー情報の取得（認証済みの場合）
    if (request.user) {
      request.context.userId = request.user.userId.value;
      request.context.userTier = request.user.tier.level;
    }
  },

  // レスポンス送信時
  onSend: async (request: FastifyRequest, reply: FastifyReply, payload: any) => {
    const apiLogService = container.resolve<IApiLogService>(DI_TOKENS.ApiLogService);
    const logger = container.resolve<Logger>(DI_TOKENS.Logger);

    try {
      // レスポンスタイムの計算
      const responseTime = Date.now() - request.context.startTime;

      // レスポンスサイズの計算
      const responseSize = calculatePayloadSize(payload);

      // エンドポイントの作成
      const pathResult = APIPath.create(sanitizeEndpoint(request.url));
      if (pathResult.isFailure) {
        logger.warn({ path: request.url }, 'Invalid API path');
        return payload;
      }

      const endpointResult = Endpoint.create({
        method: request.method as HttpMethodType,
        path: pathResult.getValue(),
      });
      if (endpointResult.isFailure) {
        logger.warn({ method: request.method, path: request.url }, 'Invalid endpoint');
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
          userId: request.context.userId ? UserId.fromString(request.context.userId) : undefined,
          endpoint: endpointResult.getValue(),
          requestInfo,
          responseInfo,
          timestamp: new Date(),
          error: reply.statusCode >= 400 ? extractErrorMessage(payload) : undefined,
        },
        LogId.generate(),
      );

      if (logEntryResult.isSuccess) {
        // 非同期でログを保存
        apiLogService.saveLog(logEntryResult.getValue()).catch((error) => {
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

function calculatePayloadSize(payload: any): number {
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

function extractErrorMessage(payload: any): string | undefined {
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return parsed.error || parsed.message || parsed.detail;
    } catch {
      return payload.substring(0, 500); // 最初の500文字
    }
  }

  if (payload && typeof payload === 'object') {
    return payload.error || payload.message || payload.detail;
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
