import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ResponsiveHeader } from '@/components/Header';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import { useMediaQuery } from '@/hooks/useMediaQuery';
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
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    document.title = 'ダッシュボード - オープンデータ提供API';
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      await fetchUserData(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      navigate('/login');
    }
  };

  const fetchUserData = async (currentUser: User) => {
    try {
      setLoading(true);
      // TODO: Replace with actual API calls
      // Simulate fetching user info and usage stats
      const mockUserInfo: UserInfo = {
        id: currentUser.id,
        email: currentUser.email || 'unknown',
        tier: currentUser.app_metadata?.tier || 'tier1',
        apiKey: 'sk_test_' + btoa(currentUser.id).replace(/=/g, '').substring(0, 32),
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
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        alert('ログアウトに失敗しました。もう一度お試しください。');
        setLoggingOut(false);
        return;
      }
      // ログアウト成功後、トップページにリダイレクト
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('予期せぬエラーが発生しました。');
      setLoggingOut(false);
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
      <div className="min-h-screen bg-gray-50">
        <ResponsiveHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  const usageColumns = [
    {
      key: 'endpoint' as keyof UsageStats,
      header: 'エンドポイント',
    },
    {
      key: 'count' as keyof UsageStats,
      header: '使用回数',
      render: (value: any, item: UsageStats) => `${item.count} / ${item.limit}`,
    },
    {
      key: 'resetAt' as keyof UsageStats,
      header: 'リセット時刻',
      render: (value: any) => new Date(value).toLocaleTimeString('ja-JP'),
      hideOnMobile: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <ResponsiveHeader />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
          ダッシュボード
        </h1>
        
        {/* User Information Section */}
        <section className="bg-white rounded-lg shadow p-4 md:p-6 mb-6" aria-label="ユーザー情報">
          <h2 className="text-xl font-semibold mb-4">ユーザー情報</h2>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-gray-600">メールアドレス:</span>
              <span className="font-medium break-all">{userInfo?.email}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-gray-600">ユーザーID:</span>
              <span className="font-medium text-sm break-all">{userInfo?.id}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-gray-600">プラン:</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {getTierDisplayName(userInfo?.tier || '')}
              </span>
            </div>
          </div>
        </section>

        {/* API Key Section */}
        <section className="bg-white rounded-lg shadow p-4 md:p-6 mb-6" aria-label="APIキー管理">
          <h2 className="text-xl font-semibold mb-4">APIキー</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
              <code className="flex-1 text-sm font-mono break-all">
                {apiKeyVisible 
                  ? userInfo?.apiKey 
                  : maskApiKey(userInfo?.apiKey || '')}
              </code>
              <button
                className="p-2 hover:bg-gray-200 rounded transition"
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                aria-label={apiKeyVisible ? 'APIキーを隠す' : 'APIキーを表示'}
              >
                {apiKeyVisible ? '🙈' : '👁️'}
              </button>
              <button
                className="p-2 hover:bg-gray-200 rounded transition"
                onClick={copyApiKey}
                aria-label="APIキーをコピー"
              >
                📋
              </button>
            </div>
            {copySuccess && (
              <p className="text-green-600 text-sm">APIキーをコピーしました</p>
            )}
            <p className="text-amber-600 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>APIキーは秘密情報です。第三者と共有しないでください。</span>
            </p>
          </div>
        </section>

        {/* Usage Statistics Section */}
        <section className="bg-white rounded-lg shadow p-4 md:p-6 mb-6" aria-label="使用状況">
          <h2 className="text-xl font-semibold mb-4">API使用状況</h2>
          {isMobile ? (
            <div className="space-y-4">
              {usageStats.map((stat, index) => {
                const percentage = getUsagePercentage(stat.count, stat.limit);
                const isNearLimit = percentage >= 80;
                
                return (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">{stat.endpoint}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{stat.count} / {stat.limit} リクエスト</span>
                        <span className={isNearLimit ? 'text-red-600' : 'text-gray-600'}>
                          {percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            isNearLimit ? 'bg-red-500' : 'bg-purple-600'
                          }`}
                          style={{ width: `${percentage}%` }}
                          role="progressbar"
                          aria-valuenow={stat.count}
                          aria-valuemin={0}
                          aria-valuemax={stat.limit}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        リセット: {stat.resetAt.toLocaleTimeString('ja-JP')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ResponsiveTable
              data={usageStats}
              columns={usageColumns}
              keyExtractor={(item) => item.endpoint}
            />
          )}
        </section>

        {/* Actions Section */}
        <section className="space-y-4 md:space-y-0 md:flex md:gap-4" aria-label="アクション">
          <button 
            className="w-full md:w-auto px-6 py-3 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition"
            onClick={() => navigate('/api-docs')}
          >
            APIドキュメントを見る
          </button>
          <button 
            className="w-full md:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            onClick={handleSignOut}
            disabled={loggingOut}
          >
            {loggingOut ? 'ログアウト中...' : 'ログアウト'}
          </button>
        </section>
      </div>
    </div>
  );
};