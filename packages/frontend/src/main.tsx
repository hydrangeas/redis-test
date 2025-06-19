import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/responsive.css";
import { measureWebVitals } from "./utils/performance";
import { initializeResourceHints, setupLinkPreloading } from "./utils/preload";

// 開発環境での React DevTools 設定
if (import.meta.env.DEV) {
  // @ts-expect-error React DevTools global hook
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    inject: () => {},
    onCommitFiberRoot: () => {},
    onCommitFiberUnmount: () => {},
  };
}

// 本番環境でのパフォーマンス監視
if (import.meta.env.PROD) {
  measureWebVitals();
}

// リソースヒントの初期化
initializeResourceHints();

// DOM読み込み完了後にリンクプリロードを設定
document.addEventListener("DOMContentLoaded", () => {
  setupLinkPreloading();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
