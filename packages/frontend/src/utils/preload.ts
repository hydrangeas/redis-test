/**
 * プリロードユーティリティ
 * ユーザーが次に遷移する可能性の高いページを事前に読み込む
 */

// ページコンポーネントのプリロード関数
export const preloadComponent = (componentPath: string) => {
  switch (componentPath) {
    case "Dashboard":
      return import("@/pages/DashboardPage").then((m) => ({
        default: m.DashboardPage,
      }));
    case "Login":
      return import("@/pages/Login").then((m) => ({ default: m.LoginPage }));
    case "Landing":
      return import("@/pages/LandingPage").then((m) => ({
        default: m.LandingPage,
      }));
    case "ApiDocs":
      return import("@/components/ApiDocsRedirect").then((m) => ({
        default: m.ApiDocsRedirect,
      }));
    default:
      return Promise.resolve();
  }
};

// 特定ページのプリロード関数
export const preloadDashboard = () => preloadComponent("Dashboard");
export const preloadLogin = () => preloadComponent("Login");
export const preloadLanding = () => preloadComponent("Landing");
export const preloadApiDocs = () => preloadComponent("ApiDocs");

// 画像のプリロード
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// 複数の画像を並列でプリロード
export const preloadImages = (srcs: string[]): Promise<void[]> => {
  return Promise.all(srcs.map((src) => preloadImage(src)));
};

// CSSのプリロード
export const preloadCSS = (href: string): void => {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "style";
  link.href = href;
  document.head.appendChild(link);
};

// フォントのプリロード
export const preloadFont = (href: string): void => {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "font";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};

// リンクのホバー時に自動プリロード
export const setupLinkPreloading = () => {
  const preloadedUrls = new Set<string>();

  const handleLinkHover = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");

    if (!link || !link.href || preloadedUrls.has(link.href)) {
      return;
    }

    const url = new URL(link.href);
    const pathname = url.pathname;

    // 内部リンクのみプリロード
    if (url.origin !== window.location.origin) {
      return;
    }

    preloadedUrls.add(link.href);

    // パスに基づいてコンポーネントをプリロード
    if (pathname === "/dashboard") {
      preloadDashboard();
    } else if (pathname === "/login") {
      preloadLogin();
    } else if (pathname === "/api-docs") {
      preloadApiDocs();
    } else if (pathname === "/") {
      preloadLanding();
    }
  };

  // すべてのリンクにホバーイベントを設定
  document.addEventListener("mouseover", handleLinkHover);

  // クリーンアップ関数を返す
  return () => {
    document.removeEventListener("mouseover", handleLinkHover);
  };
};

// プリフェッチヒントを追加
export const addPrefetchHint = (url: string) => {
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  document.head.appendChild(link);
};

// DNSプリフェッチヒントを追加
export const addDnsPrefetch = (hostname: string) => {
  const link = document.createElement("link");
  link.rel = "dns-prefetch";
  link.href = `//${hostname}`;
  document.head.appendChild(link);
};

// リソースヒントの初期化
export const initializeResourceHints = () => {
  // Supabase関連のDNSプリフェッチ
  if (import.meta.env.VITE_SUPABASE_URL) {
    const supabaseUrl = new URL(import.meta.env.VITE_SUPABASE_URL);
    addDnsPrefetch(supabaseUrl.hostname);
  }

  // CDNや外部リソースのDNSプリフェッチ
  const externalHosts = ["fonts.googleapis.com", "fonts.gstatic.com"];

  externalHosts.forEach((host) => addDnsPrefetch(host));
};
