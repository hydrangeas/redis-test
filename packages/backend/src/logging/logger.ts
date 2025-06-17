import pino from 'pino';

import { config, isProduction } from '@/config/index.js';

// カスタムシリアライザー
const serializers = {
  req: (req: { id: string; method: string; url: string; query: unknown; params: unknown; headers: Record<string, string>; ip: string; user?: { id: string } }) => ({
    id: req.id,
    method: req.method,
    url: req.url,
    query: req.query,
    params: req.params,
    headers: {
      'user-agent': req.headers['user-agent'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
    },
    remoteAddress: req.ip,
    userId: req.user?.id,
  }),

  res: (res: { statusCode: number; getHeaders: () => Record<string, unknown> }) => ({
    statusCode: res.statusCode,
    headers: res.getHeaders(),
  }),

  err: pino.stdSerializers.err,

  user: (user: { id: string; email: string; tier: string }) => ({
    id: user.id,
    email: user.email,
    tier: user.tier,
  }),
};

// ログレベル設定
const logLevel = config.logging.level;

// 本番環境用の設定
const productionOptions: pino.LoggerOptions = {
  level: logLevel,
  serializers,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    app: config.app.name,
    version: config.app.version,
    env: config.app.env,
    pid: process.pid,
    hostname: process.env.HOSTNAME,
  },
};

// 開発環境用の設定
const developmentOptions: pino.LoggerOptions = {
  ...productionOptions,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
};

// ロガーの作成
export const logger = pino(isProduction() ? productionOptions : developmentOptions);

// 子ロガーの作成
export function createLogger(context: string) {
  return logger.child({ context });
}
