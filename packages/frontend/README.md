# OpenData API Frontend

奈良県オープンデータ提供APIのフロントエンドアプリケーション

## 概要

このフロントエンドアプリケーションは、奈良県のオープンデータをAPI経由で提供するシステムのユーザーインターフェースです。React + TypeScript + Viteで構築されており、Supabase Authを利用した認証機能を提供します。

## 主な機能

- 🏠 **ランディングページ**: プロジェクトの概要と特徴を紹介
- 🔐 **認証機能**: Google/GitHubアカウントでのソーシャルログイン
- 📊 **ダッシュボード**: ログイン後のユーザー向け管理画面
- 📚 **APIドキュメント**: Scalar UIによるインタラクティブなAPIドキュメント
- 🌐 **レスポンシブデザイン**: モバイル・デスクトップ両対応

## 技術スタック

- **フレームワーク**: React 18 + TypeScript
- **ビルドツール**: Vite
- **ルーティング**: React Router v6
- **認証**: Supabase Auth
- **UI**: Supabase Auth UI React
- **スタイリング**: CSS Modules + Tailwind CSS
- **テスト**: Vitest + React Testing Library
- **リンター**: ESLint + Prettier

## セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn
- Supabaseプロジェクト

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/hydrangeas/redis-test.git
cd redis-test/packages/frontend

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集してSupabaseの認証情報を設定
```

### 環境変数

`.env.local`に以下の環境変数を設定してください：

```env
# Supabase設定
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API設定
VITE_API_URL=http://localhost:8000
VITE_API_BASE_PATH=/api/v1
VITE_API_DOCS_URL=http://localhost:8000/api-docs

# 機能フラグ
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

## 開発

### 開発サーバーの起動

```bash
npm run dev
```

開発サーバーは http://localhost:3000 で起動します。

### ビルド

```bash
npm run build
```

ビルド成果物は`dist`ディレクトリに出力されます。

### テスト

```bash
# すべてのテストを実行
npm test

# カバレッジ付きでテストを実行
npm run test:coverage

# 特定のテストファイルを実行
npm test -- src/components/__tests__/ApiDocsRedirect.test.tsx
```

### リント

```bash
# ESLintを実行
npm run lint

# ESLintで自動修正
npm run lint:fix
```

## プロジェクト構造

```
src/
├── assets/          # 静的アセット（画像、フォントなど）
├── components/      # 再利用可能なコンポーネント
│   ├── common/      # 共通コンポーネント
│   └── __tests__/   # コンポーネントテスト
├── contexts/        # Reactコンテキスト
├── hooks/           # カスタムフック
├── lib/             # 外部ライブラリの設定
├── pages/           # ページコンポーネント
├── services/        # APIクライアントなど
├── styles/          # グローバルスタイル
├── types/           # TypeScript型定義
├── utils/           # ユーティリティ関数
└── App.tsx          # アプリケーションのルートコンポーネント
```

## ルーティング

アプリケーションは以下のルートを提供します：

- `/` - ランディングページ
- `/login` - ログインページ
- `/auth/callback` - 認証コールバック
- `/dashboard` - ダッシュボード（要認証）
- `/api-docs` - APIドキュメント（外部リダイレクト）
- `/*` - 404ページ

## APIプロキシ設定

開発環境では、Viteのプロキシ機能を使用してAPIリクエストをバックエンドサーバーに転送します：

- `/api/*` → バックエンドサーバーの`/api/*`
- `/api-docs` → バックエンドサーバーの`/api-docs`
- `/openapi.json` → OpenAPI仕様ファイル

## デプロイ

### Vercel

プロジェクトにはVercel用の設定ファイル（`vercel.json`）が含まれています：

1. Vercelにプロジェクトをインポート
2. 環境変数を設定
3. デプロイを実行

### その他のプラットフォーム

静的サイトホスティングサービスにデプロイする場合：

```bash
npm run build
# distディレクトリの内容をホスティングサービスにアップロード
```

## トラブルシューティング

### 認証エラー

- Supabaseの認証情報が正しく設定されているか確認
- Supabaseダッシュボードで認証プロバイダーが有効になっているか確認

### APIプロキシが動作しない

- バックエンドサーバーが起動しているか確認
- `VITE_API_URL`環境変数が正しく設定されているか確認

### ビルドエラー

- Node.jsのバージョンが18以上であることを確認
- `node_modules`を削除して再インストール

## ライセンス

MIT License