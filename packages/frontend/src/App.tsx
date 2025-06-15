import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { AuthGuard } from '@/router/guards/AuthGuard';
import { GuestGuard } from '@/router/guards/GuestGuard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import './styles/auth.css';
import './styles/landing.css';

// 遅延ロードによるコード分割
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('@/pages/Login').then(m => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('@/pages/auth/callback').then(m => ({ default: m.AuthCallbackPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const ApiDocsRedirect = lazy(() => import('@/components/ApiDocsRedirect').then(m => ({ default: m.ApiDocsRedirect })));

// ローディングコンポーネント
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center">
    <LoadingSpinner />
    <p className="mt-4 text-gray-600">ページを読み込み中...</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* パブリックルート */}
            <Route 
              index 
              element={
                <Suspense fallback={<PageLoader />}>
                  <LandingPage />
                </Suspense>
              } 
            />
            
            {/* APIドキュメント */}
            <Route 
              path="api-docs" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ApiDocsRedirect />
                </Suspense>
              } 
            />

            {/* ゲスト限定ルート（ログイン済みならダッシュボードへ） */}
            <Route element={<GuestGuard />}>
              <Route 
                path="login" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <LoginPage />
                  </Suspense>
                } 
              />
            </Route>

            {/* 認証コールバック */}
            <Route 
              path="auth/callback" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <AuthCallbackPage />
                </Suspense>
              } 
            />

            {/* 認証必須ルート */}
            <Route element={<AuthGuard />}>
              <Route 
                path="dashboard" 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <DashboardPage />
                  </Suspense>
                } 
              />
              {/* 将来的にここに他の認証必須ページを追加 */}
            </Route>

            {/* 404ページ */}
            <Route 
              path="*" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <NotFoundPage />
                </Suspense>
              } 
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;