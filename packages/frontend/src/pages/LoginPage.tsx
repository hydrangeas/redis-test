import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import "./LoginPage.css";

export const LoginPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "ログイン - オープンデータ提供API";
  }, []);

  useEffect(() => {
    // 既にログインしている場合はリダイレクト
    if (user && !loading) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  useEffect(() => {
    // Supabase Auth のエラーイベントをリッスン
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          setAuthError(null);
          const from = location.state?.from?.pathname || "/dashboard";
          navigate(from, { replace: true });
        } else if (event === "SIGNED_OUT") {
          setAuthError(null);
        } else if (event === "USER_UPDATED") {
          setAuthError(null);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate, location]);

  // ローディング中の表示
  if (loading) {
    return (
      <div className="login-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  // 既にログイン済みの場合は何も表示しない（リダイレクト処理中）
  if (user) {
    return null;
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>ログイン</h1>
            <p>奈良県オープンデータ提供APIへようこそ</p>
          </div>

          {authError && (
            <div className="error-message" role="alert">
              {authError}
            </div>
          )}

          <div className="auth-container">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "#4f46e5",
                      brandAccent: "#4338ca",
                    },
                  },
                },
                className: {
                  container: "auth-ui-container",
                  button: "auth-ui-button",
                  input: "auth-ui-input",
                  label: "auth-ui-label",
                  anchor: "auth-ui-anchor",
                  message: "auth-ui-message",
                },
              }}
              providers={["google", "github"]}
              redirectTo={`${window.location.origin}/auth/callback`}
              onlyThirdPartyProviders={false}
              localization={{
                variables: {
                  sign_in: {
                    email_label: "メールアドレス",
                    password_label: "パスワード",
                    email_input_placeholder: "your@email.com",
                    password_input_placeholder: "パスワード",
                    button_label: "ログイン",
                    loading_button_label: "ログイン中...",
                    social_provider_text: "{{provider}}でログイン",
                    link_text: "すでにアカウントをお持ちですか？ログイン",
                  },
                  sign_up: {
                    email_label: "メールアドレス",
                    password_label: "パスワード",
                    email_input_placeholder: "your@email.com",
                    password_input_placeholder: "パスワード",
                    button_label: "サインアップ",
                    loading_button_label: "サインアップ中...",
                    social_provider_text: "{{provider}}でサインアップ",
                    link_text:
                      "アカウントをお持ちではありませんか？サインアップ",
                    confirmation_text: "確認メールを送信しました",
                  },
                  forgotten_password: {
                    link_text: "パスワードをお忘れですか？",
                    email_label: "メールアドレス",
                    email_input_placeholder: "your@email.com",
                    button_label: "パスワードリセットメールを送信",
                    loading_button_label: "送信中...",
                    confirmation_text: "パスワードリセットメールを送信しました",
                  },
                },
              }}
              theme="default"
              view="sign_in"
            />
          </div>

          <div className="login-footer">
            <p className="terms-text">
              ログインすることで、
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                利用規約
              </a>
              および
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                プライバシーポリシー
              </a>
              に同意したものとみなされます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
