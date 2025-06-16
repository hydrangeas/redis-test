import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const AuthGuard: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">認証状態を確認中...</p>
      </div>
    );
  }

  if (!user) {
    // 未認証の場合はログインページへリダイレクト
    // 現在のパスを保存して、ログイン後に戻れるようにする
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 認証済みの場合は子要素を表示
  return <Outlet />;
};
