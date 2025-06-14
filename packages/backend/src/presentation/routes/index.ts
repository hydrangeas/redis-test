import { FastifyPluginAsync } from 'fastify';
import authRoutes from './auth';
import healthRoutes from './health';

/**
 * APIルートを登録するプラグイン
 * すべてのルートは /api/v1 プレフィックスを持つ
 */
const apiRoutes: FastifyPluginAsync = async (fastify) => {
  // ヘルスチェックルート (/api/v1/health/*)
  await fastify.register(healthRoutes, { prefix: '/health' });
  
  // 認証関連のルート (/api/v1/auth/*)
  await fastify.register(authRoutes, { prefix: '/auth' });
  
  // TODO: 後続タスクで以下のルートを追加
  // - /api/v1/data/* (task-0024)
  // - その他のAPIエンドポイント
};

export default apiRoutes;