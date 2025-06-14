import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import './HomePage.css';

const HomePageComponent: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    document.title = import.meta.env.VITE_APP_NAME || '奈良県オープンデータ提供API';
  }, []);

  return (
    <div className="home-page">
      <section className="hero-section" aria-label="メインコンテンツ">
        <div className="hero-content">
          <h1 className="hero-title">
            奈良県オープンデータ提供API
          </h1>
          <p className="hero-description">
            奈良県の公式オープンデータを簡単に利用できるAPIサービスです。
            人口統計、予算データ、各種統計情報などを提供しています。
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="cta-button primary" aria-label="ダッシュボードへ移動">
                ダッシュボードへ
              </Link>
            ) : (
              <>
                <Link to="/login" className="cta-button primary" aria-label="ログインまたはサインアップ">
                  今すぐ始める
                </Link>
                <Link to="/api-docs" className="cta-button secondary" aria-label="APIドキュメントを表示">
                  APIドキュメント
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="features-section" aria-label="サービスの特徴">
        <div className="container">
          <h2 className="section-title">特徴</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>豊富なデータ</h3>
              <p>人口統計、予算、教育、健康など様々な分野のデータを提供</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔐</div>
              <h3>セキュアなアクセス</h3>
              <p>JWT認証による安全なAPIアクセス</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>高速レスポンス</h3>
              <p>キャッシュ機能による高速なデータ配信</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>柔軟な料金プラン</h3>
              <p>利用量に応じた3つのティアプラン</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing-section" aria-label="料金プラン">
        <div className="container">
          <h2 className="section-title">料金プラン</h2>
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Tier 1</h3>
              <p className="price">無料</p>
              <ul className="pricing-features">
                <li>60リクエスト/分</li>
                <li>基本的なデータアクセス</li>
                <li>標準サポート</li>
              </ul>
            </div>
            <div className="pricing-card featured">
              <h3>Tier 2</h3>
              <p className="price">お問い合わせ</p>
              <ul className="pricing-features">
                <li>120リクエスト/分</li>
                <li>すべてのデータアクセス</li>
                <li>優先サポート</li>
              </ul>
            </div>
            <div className="pricing-card">
              <h3>Tier 3</h3>
              <p className="price">お問い合わせ</p>
              <ul className="pricing-features">
                <li>300リクエスト/分</li>
                <li>すべてのデータアクセス</li>
                <li>専用サポート</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section" aria-label="コール・トゥ・アクション">
        <div className="container">
          <h2>今すぐオープンデータAPIを使い始めましょう</h2>
          <p>無料のTier 1プランから始められます</p>
          {!user && (
            <Link to="/login" className="cta-button primary large" aria-label="無料プランでサインアップ">
              無料で始める
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export const HomePage = React.memo(HomePageComponent);