import { useEffect } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const ApiDocsRedirect: React.FC = () => {
  useEffect(() => {
    // 開発環境と本番環境で異なるURL
    const apiDocsUrl = import.meta.env.DEV
      ? `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api-docs`
      : "/api-docs";

    // 同じウィンドウでリダイレクト
    window.location.href = apiDocsUrl;
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <LoadingSpinner />
      <p className="mt-4 text-gray-600">APIドキュメントへリダイレクト中...</p>
    </div>
  );
};
