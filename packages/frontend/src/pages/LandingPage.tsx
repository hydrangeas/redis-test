import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export const LandingPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="landing-page loading">
        <div className="container">
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page">
      <header className="header">
        <div className="container">
          <h1 className="logo">奈良県オープンデータ提供API</h1>
          <nav className="nav">
            {user ? (
              <>
                <Link to="/dashboard" className="nav-link dashboard-link">
                  ダッシュボード
                </Link>
                <button onClick={handleLogout} className="nav-link logout-button">
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link login-button">
                  ログイン
                </Link>
                <Link to="/login" className="nav-link signup-button">
                  サインアップ
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <div className="container">
            <h2 className="hero-title">
              奈良県の公開データを<br />
              APIで簡単に取得
            </h2>
            <p className="hero-description">
              奈良県が公開している様々な統計データを、RESTful APIを通じて
              JSON形式で提供します。認証されたユーザーは、人口統計、予算、
              各種統計データにアクセスできます。
            </p>
            {!user && (
              <div className="hero-actions">
                <Link to="/login" className="cta-button primary">
                  今すぐ始める
                </Link>
                <a href="/api-docs" className="cta-button secondary">
                  APIドキュメントを見る
                </a>
              </div>
            )}
            {user && (
              <div className="hero-actions">
                <Link to="/dashboard" className="cta-button primary">
                  ダッシュボードへ
                </Link>
                <a href="/api-docs" className="cta-button secondary">
                  APIドキュメントを見る
                </a>
              </div>
            )}
          </div>
        </section>

        <section className="features">
          <div className="container">
            <h3 className="section-title">特徴</h3>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h4 className="feature-title">豊富なデータセット</h4>
                <p className="feature-description">
                  人口統計、予算データ、教育・健康統計など、
                  奈良県の様々な公開データにアクセス可能
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h4 className="feature-title">セキュアな認証</h4>
                <p className="feature-description">
                  GoogleやGitHubアカウントで簡単にログイン。
                  JWTによる安全なAPI認証を実装
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h4 className="feature-title">高速なレスポンス</h4>
                <p className="feature-description">
                  最適化されたAPIエンドポイントと
                  効率的なキャッシング機能
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📈</div>
                <h4 className="feature-title">柔軟な利用プラン</h4>
                <p className="feature-description">
                  Tier1からTier3まで、利用頻度に応じた
                  レート制限プランを提供
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="getting-started">
          <div className="container">
            <h3 className="section-title">利用開始までの流れ</h3>
            <ol className="steps">
              <li className="step">
                <span className="step-number">1</span>
                <div className="step-content">
                  <h4>アカウント登録</h4>
                  <p>GoogleまたはGitHubアカウントでログイン</p>
                </div>
              </li>
              <li className="step">
                <span className="step-number">2</span>
                <div className="step-content">
                  <h4>APIキーの取得</h4>
                  <p>ダッシュボードからAPIアクセストークンを確認</p>
                </div>
              </li>
              <li className="step">
                <span className="step-number">3</span>
                <div className="step-content">
                  <h4>APIの利用開始</h4>
                  <p>ドキュメントを参考にAPIリクエストを送信</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="documentation">
          <div className="container">
            <h3 className="section-title">ドキュメンテーション</h3>
            <p className="section-description">
              詳細なAPIリファレンスとサンプルコードをご用意しています
            </p>
            <a href="/api-docs" className="doc-link">
              APIドキュメントを見る →
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p className="footer-text">
            © 2025 奈良県オープンデータ提供API. All rights reserved.
          </p>
          <p className="footer-links">
            <a href="/api-docs" className="footer-link">APIドキュメント</a>
            <span className="separator">|</span>
            <a href="https://github.com/hydrangeas/redis-test" className="footer-link" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};