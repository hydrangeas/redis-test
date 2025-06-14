import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import './Layout.css';

export const Layout: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-container">
          <Link to="/" className="app-logo">
            <h1>オープンデータ提供API</h1>
          </Link>
          
          <nav className="app-nav">
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              ホーム
            </Link>
            <Link 
              to="/api-docs" 
              className={`nav-link ${isActive('/api-docs') ? 'active' : ''}`}
            >
              APIドキュメント
            </Link>
            
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link 
                      to="/dashboard" 
                      className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                    >
                      ダッシュボード
                    </Link>
                    <button 
                      className="nav-button logout"
                      onClick={() => window.location.href = '/api/v1/auth/logout'}
                    >
                      ログアウト
                    </button>
                  </>
                ) : (
                  <Link 
                    to="/login" 
                    className="nav-button primary"
                  >
                    ログイン
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
      </header>
      
      <main className="app-main">
        <Outlet />
      </main>
      
      <footer className="app-footer">
        <div className="footer-container">
          <p>&copy; 2025 オープンデータ提供API. All rights reserved.</p>
          <div className="footer-links">
            <a href="/api-docs" target="_blank" rel="noopener noreferrer">
              APIドキュメント
            </a>
            <a href="https://github.com/your-org/opendata-api" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};