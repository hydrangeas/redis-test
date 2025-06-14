import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

interface LoggingPluginOptions {
  skipPaths?: string[];
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

const loggingPlugin: FastifyPluginAsync<LoggingPluginOptions> = async (fastify, options) => {
  const skipPaths = options.skipPaths || ['/health', '/metrics'];
  const logLevel = options.logLevel || 'info';
  
  // リクエスト開始時のロギング
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // スキップするパスの場合はログを出力しない
    if (skipPaths.some(path => request.url === path || request.url.startsWith(path))) {
      return;
    }
    
    // リクエスト開始時刻を記録
    request.startTime = Date.now();
    
    request.log[logLevel]({
      method: request.method,
      url: request.url,
      headers: {
        'user-agent': request.headers['user-agent'],
        'content-type': request.headers['content-type'],
        'content-length': request.headers['content-length'],
      },
      ip: request.ip,
      hostname: request.hostname,
    }, 'Request received');
  });
  
  // レスポンス送信時のロギング
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // スキップするパスの場合はログを出力しない
    if (skipPaths.some(path => request.url === path || request.url.startsWith(path))) {
      return;
    }
    
    const responseTime = Date.now() - (request.startTime || Date.now());
    
    const logData = {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime,
      contentLength: reply.getHeader('content-length'),
    };
    
    // ユーザー情報があれば追加
    if (request.user) {
      logData['userId'] = request.user.userId.value;
      logData['userTier'] = request.user.tier.level;
    }
    
    // ステータスコードに応じてログレベルを変更
    if (reply.statusCode >= 500) {
      request.log.error(logData, 'Request completed with error');
    } else if (reply.statusCode >= 400) {
      request.log.warn(logData, 'Request completed with client error');
    } else {
      request.log[logLevel](logData, 'Request completed');
    }
  });
  
  // エラー時のロギング
  fastify.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    request.log.error({
      method: request.method,
      url: request.url,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      userId: request.user?.userId.value,
    }, 'Request error');
  });
};

// TypeScript宣言の拡張
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

export default fp(loggingPlugin, {
  name: 'logging-plugin',
});