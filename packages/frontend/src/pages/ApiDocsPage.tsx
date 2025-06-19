import React from "react";

export const ApiDocsPage: React.FC = () => {
  return (
    <div className="api-docs-page">
      <div className="container">
        <h1>APIドキュメント</h1>
        <p>
          APIドキュメントは
          <a href="/api-docs" target="_blank" rel="noopener noreferrer">
            こちら
          </a>
          からご覧いただけます。
        </p>

        <section className="api-overview">
          <h2>APIの概要</h2>
          <p>
            このAPIは奈良県のオープンデータを提供します。認証にはJWTトークンを使用します。
          </p>

          <h3>基本情報</h3>
          <ul>
            <li>
              ベースURL: <code>https://api.example.com/api/v1</code>
            </li>
            <li>認証方式: Bearer Token (JWT)</li>
            <li>レスポンス形式: JSON</li>
          </ul>

          <h3>主なエンドポイント</h3>
          <ul>
            <li>
              <code>GET /data/secure/:path</code> - データファイルの取得
            </li>
            <li>
              <code>GET /health</code> - ヘルスチェック
            </li>
            <li>
              <code>POST /auth/token</code> - アクセストークンの取得
            </li>
            <li>
              <code>POST /auth/refresh</code> - トークンのリフレッシュ
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
