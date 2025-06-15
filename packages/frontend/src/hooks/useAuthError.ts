import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export const useAuthError = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    
    if (errorParam) {
      switch (errorParam) {
        case "auth_failed":
          setError("認証に失敗しました。もう一度お試しください。");
          break;
        case "provider_error":
          setError("プロバイダーとの連携でエラーが発生しました。");
          break;
        case "unexpected":
          setError("予期せぬエラーが発生しました。");
          break;
        default:
          setError("エラーが発生しました。");
      }
    }
  }, [searchParams]);

  return { error, clearError: () => setError(null) };
};