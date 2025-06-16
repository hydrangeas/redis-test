import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabaseが自動的に認証を処理するため、
    // 少し待ってからダッシュボードにリダイレクト
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="auth-callback-page">
      <div className="loading-container">
        <div className="spinner"></div>
        <p>認証処理中...</p>
      </div>
    </div>
  );
};
