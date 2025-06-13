import { FastifyPluginAsync } from 'fastify';
import refreshRoute from './refresh.route';
import logoutRoute from './logout.route';

/**
 * 認証関連のルートを登録するプラグイン
 */
const authRoutes: FastifyPluginAsync = async (fastify) => {
  // トークンリフレッシュエンドポイント
  await fastify.register(refreshRoute);
  
  // ログアウトエンドポイント
  await fastify.register(logoutRoute);
  
  // TODO: 後続タスクで以下のルートを追加
  // - その他の認証関連エンドポイント
};

export default authRoutes;