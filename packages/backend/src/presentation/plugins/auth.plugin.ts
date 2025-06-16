import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { IJWTService } from '@/application/interfaces/jwt.service.interface';
import { IUserRepository } from '@/domain/auth/interfaces/user-repository.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import fp from 'fastify-plugin';
import { metrics } from '@/plugins/monitoring';


interface AuthPluginOptions {
  excludePaths?: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    authenticatedUser?: AuthenticatedUser;
  }
  
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, options) => {
  const excludePaths = options.excludePaths || [];
  
  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    // デバッグログ
    if (process.env.NODE_ENV === 'test') {
      console.log('Auth plugin authenticate called for URL:', request.url);
    }
    request.log.debug({ url: request.url, headers: request.headers }, 'Auth plugin authenticate called');
    
    try {
      // サービスを毎回解決（テストでのモック差し替えを可能にするため）
      const jwtService = container.resolve<IJWTService>(DI_TOKENS.JwtService);
      const userRepository = container.resolve<IUserRepository>(DI_TOKENS.UserRepository);
      if (process.env.NODE_ENV === 'test') {
        console.log('Services resolved successfully');
      }
      
      // 除外パスのチェック
    if (process.env.NODE_ENV === 'test') {
      console.log('Checking exclude paths for URL:', request.url);
      console.log('Exclude paths:', excludePaths);
    }
    if (excludePaths.some(path => {
      // ワイルドカードの処理
      if (path.endsWith('/*')) {
        const basePath = path.slice(0, -2); // /* を除去
        return request.url === basePath || request.url.startsWith(basePath + '/');
      }
      return request.url === path;
    })) {
      request.log.debug({ url: request.url }, 'URL is in exclude paths');
      if (process.env.NODE_ENV === 'test') {
        console.log('URL is excluded from auth');
      }
      return;
    }
    
    // Authorizationヘッダーのチェック
    const authHeader = request.headers.authorization;
    if (process.env.NODE_ENV === 'test') {
      console.log('Auth header value:', authHeader);
      console.log('All headers:', JSON.stringify(request.headers));
    }
    if (!authHeader) {
      request.log.debug('No authorization header found');
      if (process.env.NODE_ENV === 'test') {
        console.log('Auth plugin: No authorization header');
      }
      await reply.code(401).send({
        type: `${process.env.API_URL || 'https://api.example.com'}/errors/unauthorized`,
        title: 'Authentication required',
        status: 401,
        detail: 'Missing authorization header',
        instance: request.url,
      });
      return;
    }
    
    // Bearer トークンの抽出
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      await reply.code(401).send({
        type: `${process.env.API_URL || 'https://api.example.com'}/errors/unauthorized`,
        title: 'Invalid authorization format',
        status: 401,
        detail: 'Authorization header must use Bearer scheme',
        instance: request.url,
      });
      return;
    }
    
    const token = match[1];
    
    try {
      // トークンの検証
      const verifyResult = await jwtService.verifyAccessToken(token);
      
      if (verifyResult.isFailure) {
        const error = verifyResult.getError();
        request.log.warn({ error: error.message }, 'Token verification failed');
        
        // Track failed authentication attempt
        metrics.authenticationAttempts.inc({
          provider: 'jwt',
          status: 'failed',
        });
        
        await reply.code(401).send({
          type: `${process.env.API_URL || 'https://api.example.com'}/errors/unauthorized`,
          title: 'Invalid token',
          status: 401,
          detail: error.message,
          instance: request.url,
        });
        return;
      }
      
      const tokenPayload = verifyResult.getValue();
      
      // ユーザー情報の取得
      const userIdResult = UserId.create(tokenPayload.sub);
      if (userIdResult.isFailure) {
        await reply.code(401).send({
          type: `${process.env.API_URL || 'https://api.example.com'}/errors/unauthorized`,
          title: 'Invalid user ID',
          status: 401,
          detail: 'Token contains invalid user ID',
          instance: request.url,
        });
        return;
      }
      
      const userId = userIdResult.getValue();
      
      // トークンからティア情報を取得
      let userTier: UserTier;
      
      if (tokenPayload.tier) {
        // トークンにティア情報が含まれている場合
        // tier文字列を大文字に変換してTierLevelとして使用
        const tierString = tokenPayload.tier.toUpperCase();
        const tierLevel = tierString as TierLevel;
        const tierResult = UserTier.create(tierLevel);
        
        if (tierResult.isFailure) {
          // デフォルトのTIER1を使用
          userTier = UserTier.createDefaultTier();
        } else {
          userTier = tierResult.getValue();
        }
      } else {
        // トークンにティア情報がない場合はユーザー情報から取得
        const userResult = await userRepository.findById(userId);
        
        if (userResult.isFailure || !userResult.getValue()) {
          // ユーザーが見つからない場合はデフォルトのTIER1を使用
          request.log.debug({ userId: userId.value }, 'User not found, using default tier');
          userTier = UserTier.createDefaultTier();
        } else {
          const user = userResult.getValue()!;
          userTier = user.tier;
          request.log.debug({
            userId: userId.value,
            tier: userTier.level,
          }, 'User tier fetched from repository');
        }
      }
      
      // AuthenticatedUserオブジェクトの作成
      request.user = new AuthenticatedUser(userId, userTier);
      
      // Track successful authentication
      metrics.authenticationAttempts.inc({
        provider: 'jwt',
        status: 'success',
      });
      
      // Update active users gauge
      metrics.activeUsers.inc({
        tier: userTier.level.toLowerCase(),
      });
      
      request.log.debug({
        userId: userId.value,
        tier: userTier.level,
      }, 'User authenticated');
      
    } catch (error) {
      request.log.error({ error }, 'Authentication error');
      if (process.env.NODE_ENV === 'test') {
        console.error('Auth plugin inner error:', error);
      }
      
      await reply.code(500).send({
        type: `${process.env.API_URL || 'https://api.example.com'}/errors/internal`,
        title: 'Authentication error',
        status: 500,
        detail: 'An error occurred during authentication',
        instance: request.url,
      });
      return;
    }
    
    } catch (error) {
      request.log.error({ error }, 'Authentication plugin error');
      if (process.env.NODE_ENV === 'test') {
        console.error('Auth plugin outer error:', error);
      }
      
      await reply.code(500).send({
        type: `${process.env.API_URL || 'https://api.example.com'}/errors/internal`,
        title: 'Authentication error',
        status: 500,
        detail: 'An error occurred during authentication setup',
        instance: request.url,
      });
      return;
    }
  };
  
  // デコレータとして登録
  fastify.decorate('authenticate', authenticate);
  
  // グローバルフックとして登録（オプション）
  // fastify.addHook('onRequest', authenticate);
};

export default fp(authPlugin, {
  name: 'auth-plugin',
});