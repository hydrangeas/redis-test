import { FastifyPluginAsync } from 'fastify';
import refreshRoute from './refresh.route';

/**
 * 認証関連のルートを登録するプラグイン
 */
const authRoutes: FastifyPluginAsync = async (fastify) => {
  // トークンリフレッシュエンドポイント
  await fastify.register(refreshRoute);
  
  // TODO: 後続タスクで以下のルートを追加
  // - /auth/logout (task-0018)
  // - その他の認証関連エンドポイント
};

export default authRoutes;