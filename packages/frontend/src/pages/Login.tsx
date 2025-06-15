import { AuthForm } from "@/components/auth/AuthForm";
import { useAuthError } from "@/hooks/useAuthError";
import { Alert } from "@/components/common/Alert";

export const LoginPage: React.FC = () => {
  const { error, clearError } = useAuthError();

  return (
    <div className="login-page">
      <h1>オープンデータ提供APIへログイン</h1>
      
      {error && (
        <Alert type="error" onClose={clearError}>
          {error}
        </Alert>
      )}
      
      <AuthForm />
      
      <div className="login-info">
        <p>ログインすることで、APIを利用できます。</p>
        <p>初回ログイン時は自動的にTier1プランでスタートします。</p>
      </div>
    </div>
  );
};