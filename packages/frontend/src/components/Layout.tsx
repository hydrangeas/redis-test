import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { usePageTracking } from '@/hooks/usePageTracking';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  
  // ページトラッキング
  usePageTracking();

  // ページ遷移時の処理
  useEffect(() => {
    // スクロール位置のリセット（戻る/進む以外）
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [location, navigationType]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};