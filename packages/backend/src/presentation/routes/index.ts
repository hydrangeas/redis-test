import { FastifyPluginAsync } from 'fastify';
import authRoutes from './auth';
import healthRoutes from './health';
import dataRoutes from './data';

/**
 * APIルートを登録するプラグイン
 * すべてのルートは /api/v1 プレフィックスを持つ
 */
const apiRoutes: FastifyPluginAsync = async (fastify) => {
  // ヘルスチェックルート (/api/v1/health/*)
  await fastify.register(healthRoutes, { prefix: '/health' });
  
  // 認証関連のルート (/api/v1/auth/*)
  await fastify.register(authRoutes, { prefix: '/auth' });
  
  // データアクセスルート (/api/v1/data/*)
  await fastify.register(dataRoutes, { prefix: '/data' });
  
  // TODO: 後続タスクで以下のルートを追加
  // - その他のAPIエンドポイント
};

export default apiRoutes;