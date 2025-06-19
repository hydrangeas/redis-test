
import logoutRoute from './logout.route';
import refreshRoute from './refresh.route';

import type { FastifyPluginAsync } from 'fastify';

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
