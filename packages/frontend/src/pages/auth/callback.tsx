import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URLからコードを取得して認証を完了
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("Auth callback error:", error);
          navigate("/login?error=auth_failed");
          return;
        }

        // 認証成功
        navigate("/dashboard");
      } catch (error) {
        console.error("Unexpected error:", error);
        navigate("/login?error=unexpected");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="auth-callback-container">
      <LoadingSpinner />
      <p>認証処理中...</p>
    </div>
  );
};