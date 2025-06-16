import pino from 'pino';
import pinoMultiStream from 'pino-multi-stream';
import { createStream } from 'rotating-file-stream';
import path from 'path';
import { fileURLToPath } from 'url';

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
export function createRotatingLogger(options: RotatingLoggerOptions = {}) {
  const {
    level = 'info',
    logDir = path.join(__dirname, '../../../../logs'),
    maxFiles = 30,
    maxSize = '100M',
    compress = true,
  } = options;

  // Ensure log directory exists
  import('fs').then(fs => {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  });

  const streams: pinoMultiStream.Streams = [
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
      }) as any,
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
      }) as any,
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
      }) as any,
    });
  }

  return pino(
    {
      level,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'unknown',
      },
    },
    pinoMultiStream.multistream(streams)
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
export const logSerializers = {
  req: (req: any) => ({
    id: req.id,
    method: req.method,
    url: req.url,
    query: req.query,
    params: req.params,
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
    },
    remoteAddress: req.ip,
    userId: req.user?.userId?.value,
  }),

  res: (res: any) => ({
    statusCode: res.statusCode,
    headers: {
      'content-type': res.getHeader('content-type'),
      'content-length': res.getHeader('content-length'),
    },
  }),

  err: pino.stdSerializers.err,

  user: (user: any) => ({
    id: user.userId?.value,
    tier: user.tier?.level,
  }),

  // Sanitize sensitive data
  auth: (auth: any) => ({
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
  additionalContext?: Record<string, any>
): pino.Logger {
  return logger.child({
    context,
    ...additionalContext,
  });
}