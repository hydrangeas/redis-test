import pino from 'pino';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../di';

import type { EnvConfig } from '../config';
import type { Logger as PinoLogger, LoggerOptions } from 'pino';

/**
 * Pinoロガーのカスタム設定を作成
 */
export function createLoggerConfig(config: EnvConfig): LoggerOptions {
  const isDevelopment = config.NODE_ENV === 'development';

  return {
    level: config.LOG_LEVEL,
    formatters: {
      level: (label: string) => ({ level: label }),
      bindings: (bindings: Record<string, unknown>) => ({
        pid: bindings.pid,
        hostname: bindings.hostname,
        node_version: process.version,
        environment: config.NODE_ENV,
      }),
    },
    serializers: {
      req: (request: Record<string, unknown>) => ({
        method: request.method,
        url: request.url,
        path: request.routerPath,
        parameters: request.params,
        userId: (request.user as { id?: string } | undefined)?.id,
        requestId: request.id,
        ip: request.ip,
        userAgent: (request.headers as Record<string, string> | undefined)?.['user-agent'],
      }),
      res: (reply: Record<string, unknown>) => ({
        statusCode: reply.statusCode,
        responseTime: (reply.getResponseTime as (() => number) | undefined)?.(),
      }),
      err: pino.stdSerializers.err,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.token',
        '*.apiKey',
        '*.secret',
        '*.jwt',
        '*.accessToken',
        '*.refreshToken',
      ],
      remove: true,
    },
    ...(isDevelopment && {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          colorize: true,
        },
      },
    }),
  };
}

/**
 * アプリケーション用のロガーを作成
 */
export function createLogger(config?: EnvConfig): PinoLogger {
  const envConfig = config || container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);
  return pino(createLoggerConfig(envConfig));
}

/**
 * 子ロガーを作成するユーティリティ
 */
export function createChildLogger(logger: PinoLogger, bindings: Record<string, unknown>): PinoLogger {
  return logger.child(bindings);
}

/**
 * ロガーのタイプエイリアス
 */
export type Logger = PinoLogger;
