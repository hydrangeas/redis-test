import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { MobileMenu } from "./MobileMenu";
import { MenuIcon, XIcon } from "@/components/icons";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export const ResponsiveHeader: React.FC = () => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");

  // 画面サイズ変更時にメニューを閉じる
  useEffect(() => {
    if (!isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [isMobile, mobileMenuOpen]);

  // メニューが開いている時はスクロールを無効化
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header className="bg-white shadow-sm relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              <span className="hidden sm:inline">奈良県オープンデータAPI</span>
              <span className="sm:hidden">奈良県API</span>
            </h1>
          </Link>

          {/* デスクトップナビゲーション */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/api-docs"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              APIドキュメント
            </Link>

            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="outline" size="small">
                    ダッシュボード
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="secondary" size="small">
                    プロフィール
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="small">
                    ログイン
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="small">
                    サインアップ
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* モバイルメニューボタン */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label={mobileMenuOpen ? "メニューを閉じる" : "メニューを開く"}
          >
            {mobileMenuOpen ? (
              <XIcon className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* モバイルメニュー */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
      />
    </header>
  );
};
