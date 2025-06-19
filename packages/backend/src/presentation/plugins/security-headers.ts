import helmet from '@fastify/helmet';
import fp from 'fastify-plugin';
import { container } from 'tsyringe';

import { DI_TOKENS } from '../../infrastructure/di';

import type { EnvConfig } from '../../infrastructure/config';

/**
 * セキュリティヘッダー設定プラグイン
 */
export default fp(
  async function securityHeadersPlugin(fastify) {
    const config = container.resolve<EnvConfig>(DI_TOKENS.EnvConfig);

    await fastify.register(helmet, {
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...(config.SUPABASE_URL ? [config.SUPABASE_URL] : [])],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          // Scalar API documentation needs specific CSP settings
          ...(config.NODE_ENV === 'development' && {
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          }),
        },
      },

      // Strict-Transport-Security
      hsts: {
        maxAge: 31536000, // 1年
        includeSubDomains: true,
        preload: true,
      },

      // X-Content-Type-Options
      noSniff: true,

      // X-Frame-Options
      frameguard: {
        action: 'deny',
      },

      // X-XSS-Protection (レガシーブラウザ向け)
      xssFilter: true,

      // Referrer-Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },

      // Permissions-Policy (旧Feature-Policy)
      permittedCrossDomainPolicies: false,
    });

    // カスタムセキュリティヘッダーの追加
    void fastify.addHook('onSend', (request, reply) => {
      // API固有のセキュリティヘッダー
      void reply.header('X-API-Version', '1.0.0');

      // キャッシュ制御（認証が必要なエンドポイント）
      if (request.url.startsWith('/api/') && request.url !== '/api/health') {
        void reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        void reply.header('Pragma', 'no-cache');
        void reply.header('Expires', '0');
      }

      // CORS補完ヘッダー
      if (request.method === 'OPTIONS') {
        void reply.header('Access-Control-Max-Age', '86400');
      }
    });

    fastify.log.info('Security headers plugin registered');
  },
  {
    name: 'security-headers',
    fastify: '4.x',
  },
);
