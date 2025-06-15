import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const GuestGuard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (user) {
    // すでに認証済みの場合はダッシュボードへリダイレクト
    return <Navigate to="/dashboard" replace />;
  }

  // 未認証の場合は子要素を表示
  return <Outlet />;
};