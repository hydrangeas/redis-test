import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { ResponsiveHeader } from '@/components/Header';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export const LandingPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ResponsiveHeader />

      <main className="main">
        <section className="hero py-12 md:py-20 px-responsive">
          <div className="container mx-auto max-w-6xl">
            <h2 className="heading-responsive font-bold text-gray-900 text-center mb-6">
              奈良県の公開データを<br className="md:hidden" />
              APIで簡単に取得
            </h2>
            <p className="text-responsive text-gray-600 text-center max-w-3xl mx-auto mb-8 px-4">
              奈良県が公開している様々な統計データを、RESTful APIを通じて
              JSON形式で提供します。認証されたユーザーは、人口統計、予算、
              各種統計データにアクセスできます。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-center"
                  >
                    ダッシュボードへ
                  </Link>
                  <a 
                    href="/api-docs" 
                    className="w-full sm:w-auto px-6 py-3 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition text-center"
                  >
                    APIドキュメントを見る
                  </a>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-center"
                  >
                    今すぐ始める
                  </Link>
                  <a 
                    href="/api-docs" 
                    className="w-full sm:w-auto px-6 py-3 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition text-center"
                  >
                    APIドキュメントを見る
                  </a>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="features py-12 md:py-20 px-responsive bg-white">
          <div className="container mx-auto max-w-6xl">
            <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
              特徴
            </h3>
            <ResponsiveGrid cols={{ default: 1, md: 2, lg: 4 }} gap={6}>
              <div className="feature-card p-6 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">📊</div>
                <h4 className="text-lg font-semibold mb-2">豊富なデータセット</h4>
                <p className="text-sm text-gray-600">
                  人口統計、予算データ、教育・健康統計など、
                  奈良県の様々な公開データにアクセス可能
                </p>
              </div>
              <div className="feature-card p-6 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">🔒</div>
                <h4 className="text-lg font-semibold mb-2">セキュアな認証</h4>
                <p className="text-sm text-gray-600">
                  GoogleやGitHubアカウントで簡単にログイン。
                  JWTによる安全なAPI認証を実装
                </p>
              </div>
              <div className="feature-card p-6 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">⚡</div>
                <h4 className="text-lg font-semibold mb-2">高速なレスポンス</h4>
                <p className="text-sm text-gray-600">
                  最適化されたAPIエンドポイントと
                  効率的なキャッシング機能
                </p>
              </div>
              <div className="feature-card p-6 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-4">📈</div>
                <h4 className="text-lg font-semibold mb-2">柔軟な利用プラン</h4>
                <p className="text-sm text-gray-600">
                  Tier1からTier3まで、利用頻度に応じた
                  レート制限プランを提供
                </p>
              </div>
            </ResponsiveGrid>
          </div>
        </section>

        <section className="getting-started py-12 md:py-20 px-responsive">
          <div className="container mx-auto max-w-4xl">
            <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
              利用開始までの流れ
            </h3>
            <ol className="space-y-6 md:space-y-8">
              <li className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </span>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">アカウント登録</h4>
                  <p className="text-gray-600">GoogleまたはGitHubアカウントでログイン</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </span>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">APIキーの取得</h4>
                  <p className="text-gray-600">ダッシュボードからAPIアクセストークンを確認</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </span>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-1">APIの利用開始</h4>
                  <p className="text-gray-600">ドキュメントを参考にAPIリクエストを送信</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="documentation py-12 md:py-20 px-responsive bg-white">
          <div className="container mx-auto max-w-4xl text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              ドキュメンテーション
            </h3>
            <p className="text-gray-600 mb-8">
              詳細なAPIリファレンスとサンプルコードをご用意しています
            </p>
            <a 
              href="/api-docs" 
              className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
            >
              APIドキュメントを見る →
            </a>
          </div>
        </section>
      </main>

      <footer className="footer bg-gray-900 text-white py-8 px-responsive">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © 2025 奈良県オープンデータ提供API. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="/api-docs" className="text-gray-400 hover:text-white transition">
                APIドキュメント
              </a>
              <a 
                href="https://github.com/hydrangeas/redis-test" 
                className="text-gray-400 hover:text-white transition" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* モバイル用の固定CTAボタン */}
      {isMobile && !user && (
        <div className="mobile-sticky-footer">
          <Link 
            to="/login" 
            className="block w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-center"
          >
            今すぐ始める
          </Link>
        </div>
      )}
    </div>
  );
};