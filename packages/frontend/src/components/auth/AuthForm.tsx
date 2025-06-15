import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export const AuthForm: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 認証状態の変更を監視
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          // 認証成功後はダッシュボードへリダイレクト
          navigate("/dashboard");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="auth-container">
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: "#4F46E5",
                brandAccent: "#4338CA",
              },
            },
          },
        }}
        providers={["google", "github"]}
        redirectTo={`${window.location.origin}/auth/callback`}
        onlyThirdPartyProviders
        localization={{
          variables: {
            sign_in: {
              social_provider_text: "{{provider}}でログイン",
              button_label: "ログイン",
            },
          },
        }}
      />
    </div>
  );
};