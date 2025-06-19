import path from 'path';
import { fileURLToPath } from 'url';

import { pino, stdTimeFunctions, stdSerializers, type LoggerOptions } from 'pino';
// @ts-expect-error - pino-multi-stream doesn't have type declarations
import pinoMultiStream from 'pino-multi-stream';
import { createStream } from 'rotating-file-stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RotatingLoggerOptions {
  level?: string;
  logDir?: string;
  maxFiles?: number;
  maxSize?: string;
  compress?: boolean;
}

/**
 * Creates a logger with rotating file streams
 */
export function createRotatingLogger(options: RotatingLoggerOptions = {}): pino.Logger {
  const {
    level = 'info',
    logDir = path.join(__dirname, '../../../../logs'),
    maxFiles = 30,
    maxSize = '100M',
    compress = true,
  } = options;

  // Ensure log directory exists
  void import('fs').then((fs) => {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  });

  const streams: Array<{ stream: NodeJS.WritableStream; level?: string }> = [
    // Console output (development)
    {
      level: level as pino.Level,
      stream: process.stdout,
    },
  ];

  // Only add file streams in production
  if (process.env.NODE_ENV === 'production') {
    // Main application log with daily rotation
    streams.push({
      level: level as pino.Level,
      stream: createStream('app-%DATE%.log', {
        path: logDir,
        interval: '1d', // Daily rotation
        maxFiles,
        size: maxSize,
        compress: compress ? 'gzip' : false,
      }) as unknown as NodeJS.WritableStream,
    });

    // Error log with longer retention
    streams.push({
      level: 'error',
      stream: createStream('error-%DATE%.log', {
        path: logDir,
        interval: '1d',
        maxFiles: 90, // Keep error logs for 90 days
        size: maxSize,
        compress: compress ? 'gzip' : false,
      }) as unknown as NodeJS.WritableStream,
    });

    // Audit log for security events
    streams.push({
      level: 'info',
      stream: createStream('audit-%DATE%.log', {
        path: logDir,
        interval: '1d',
        maxFiles: 365, // Keep audit logs for 1 year
        size: maxSize,
        compress: compress ? 'gzip' : false,
      }) as unknown as NodeJS.WritableStream,
    });
  }

  return pino(
    {
      level,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: stdTimeFunctions.isoTime,
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'unknown',
      },
    },
    (pinoMultiStream as { multistream: (streams: Array<{ stream: NodeJS.WritableStream; level?: string }>) => NodeJS.WritableStream }).multistream(streams),
  );
}

/**
 * Log rotation configuration for different environments
 */
export const logRotationConfig = {
  development: {
    level: 'debug',
    maxFiles: 7,
    maxSize: '10M',
    compress: false,
  },
  production: {
    level: 'info',
    maxFiles: 30,
    maxSize: '100M',
    compress: true,
  },
  test: {
    level: 'error',
    maxFiles: 1,
    maxSize: '1M',
    compress: false,
  },
};

/**
 * Get log rotation config for current environment
 */
export function getLogRotationConfig(): RotatingLoggerOptions {
  const env = process.env.NODE_ENV || 'development';
  return logRotationConfig[env as keyof typeof logRotationConfig] || logRotationConfig.development;
}

/**
 * Custom serializers for sensitive data
 */
export const logSerializers: NonNullable<LoggerOptions['serializers']> = {
  req: (req: Record<string, unknown>) => ({
    id: req.id,
    method: req.method,
    url: req.url,
    query: req.query,
    params: req.params,
    headers: {
      'user-agent': (req.headers as Record<string, string>)['user-agent'],
      'x-forwarded-for': (req.headers as Record<string, string>)['x-forwarded-for'],
      'x-real-ip': (req.headers as Record<string, string>)['x-real-ip'],
    },
    remoteAddress: req.ip,
    userId: (req.user as { userId?: { value?: string } } | undefined)?.userId?.value,
  }),

  res: (res: Record<string, unknown>) => ({
    statusCode: res.statusCode,
    headers: {
      'content-type': (res.getHeader as (name: string) => string | undefined)('content-type'),
      'content-length': (res.getHeader as (name: string) => string | undefined)('content-length'),
    },
  }),

  err: stdSerializers.err,

  user: (user: Record<string, unknown>) => ({
    id: (user.userId as { value?: string } | undefined)?.value,
    tier: (user.tier as { level?: string } | undefined)?.level,
  }),

  // Sanitize sensitive data
  auth: (auth: Record<string, unknown>) => ({
    provider: auth.provider,
    status: auth.status,
    // Don't log tokens or secrets
  }),
};

/**
 * Create a child logger with specific context
 */
export function createContextLogger(
  logger: pino.Logger,
  context: string,
  additionalContext?: Record<string, unknown>,
): pino.Logger {
  return logger.child({
    context,
    ...additionalContext,
  });
}
