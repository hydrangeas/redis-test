import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

interface UserInfo {
  id: string;
  email: string;
  tier: string;
  apiKey?: string;
}

interface UsageStats {
  endpoint: string;
  count: number;
  limit: number;
  resetAt: Date;
}

export const DashboardPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    document.title = 'ダッシュボード - オープンデータ提供API';
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // TODO: Replace with actual API calls
      // Simulate fetching user info and usage stats
      const mockUserInfo: UserInfo = {
        id: user.id || 'unknown',
        email: user.email || 'unknown',
        tier: 'tier1',
        apiKey: 'sk_test_' + btoa(user.id || 'unknown').replace(/=/g, '').substring(0, 32),
      };
      
      const mockUsageStats: UsageStats[] = [
        {
          endpoint: '/api/data/**',
          count: 45,
          limit: 60,
          resetAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        },
      ];
      
      setUserInfo(mockUserInfo);
      setUsageStats(mockUsageStats);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const copyApiKey = async () => {
    if (!userInfo?.apiKey) return;
    
    try {
      await navigator.clipboard.writeText(userInfo.apiKey);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy API key:', error);
    }
  };

  const maskApiKey = (key: string) => {
    if (!key) return '';
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  };

  const getTierDisplayName = (tier: string) => {
    const tierNames: Record<string, string> = {
      tier1: 'Tier 1 (無料)',
      tier2: 'Tier 2',
      tier3: 'Tier 3',
    };
    return tierNames[tier] || tier;
  };

  const getUsagePercentage = (count: number, limit: number) => {
    return Math.round((count / limit) * 100);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <h1 className="dashboard-title">ダッシュボード</h1>
        
        {/* User Information Section */}
        <section className="dashboard-section" aria-label="ユーザー情報">
          <h2>ユーザー情報</h2>
          <div className="info-card">
            <div className="info-item">
              <span className="info-label">メールアドレス:</span>
              <span className="info-value">{userInfo?.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">ユーザーID:</span>
              <span className="info-value">{userInfo?.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">プラン:</span>
              <span className="info-value tier-badge">
                {getTierDisplayName(userInfo?.tier || '')}
              </span>
            </div>
          </div>
        </section>

        {/* API Key Section */}
        <section className="dashboard-section" aria-label="APIキー管理">
          <h2>APIキー</h2>
          <div className="api-key-card">
            <div className="api-key-display">
              <code className="api-key-text">
                {apiKeyVisible 
                  ? userInfo?.apiKey 
                  : maskApiKey(userInfo?.apiKey || '')}
              </code>
              <button
                className="icon-button"
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                aria-label={apiKeyVisible ? 'APIキーを隠す' : 'APIキーを表示'}
              >
                {apiKeyVisible ? '🙈' : '👁️'}
              </button>
              <button
                className="icon-button"
                onClick={copyApiKey}
                aria-label="APIキーをコピー"
              >
                📋
              </button>
            </div>
            {copySuccess && (
              <p className="success-message">APIキーをコピーしました</p>
            )}
            <p className="api-key-warning">
              ⚠️ APIキーは秘密情報です。第三者と共有しないでください。
            </p>
          </div>
        </section>

        {/* Usage Statistics Section */}
        <section className="dashboard-section" aria-label="使用状況">
          <h2>API使用状況</h2>
          <div className="usage-stats">
            {usageStats.map((stat, index) => {
              const percentage = getUsagePercentage(stat.count, stat.limit);
              const isNearLimit = percentage >= 80;
              
              return (
                <div key={index} className="usage-card">
                  <h3>{stat.endpoint}</h3>
                  <div className="usage-info">
                    <span>{stat.count} / {stat.limit} リクエスト</span>
                    <span className="usage-percentage">{percentage}%</span>
                  </div>
                  <div className="usage-bar-container">
                    <div 
                      className={`usage-bar ${isNearLimit ? 'near-limit' : ''}`}
                      style={{ width: `${percentage}%` }}
                      role="progressbar"
                      aria-valuenow={stat.count}
                      aria-valuemin={0}
                      aria-valuemax={stat.limit}
                    />
                  </div>
                  <p className="reset-time">
                    リセット時刻: {stat.resetAt.toLocaleTimeString('ja-JP')}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Actions Section */}
        <section className="dashboard-section" aria-label="アクション">
          <div className="dashboard-actions">
            <button 
              className="action-button secondary"
              onClick={() => navigate('/api-docs')}
            >
              APIドキュメントを見る
            </button>
            <button 
              className="action-button danger"
              onClick={handleSignOut}
            >
              ログアウト
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};