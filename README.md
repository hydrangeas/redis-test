# オープンデータ提供API

奈良県のオープンデータをJSON形式で提供するWeb APIプラットフォームです。

## 技術スタック

- **バックエンド**: TypeScript, Fastify, Supabase
- **フロントエンド**: TypeScript, React, Vite
- **認証**: Supabase Auth
- **データベース**: Supabase (PostgreSQL)
- **デプロイ**: Vercel

## セットアップ

### 必要条件

- Node.js 20.x LTS
- npm 10.x
- Supabase CLI

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp packages/backend/.env.example packages/backend/.env.local
cp packages/frontend/.env.example packages/frontend/.env.local
# .env.localファイルを編集して、必要な値を設定してください

# Supabaseローカル環境の起動
npm run supabase:start

# データベースのマイグレーション
npm run supabase:db:push

# 開発環境の起動
npm run dev
```

### 開発環境

このプロジェクトは以下の開発ツールを使用しています：

- **ESLint**: コード品質チェック
- **Prettier**: コードフォーマット
- **TypeScript**: 型安全性
- **Turbo**: モノレポビルドシステム

VS Codeを使用する場合は、推奨拡張機能が自動的に提案されます。

## プロジェクト構造

```
packages/
├── backend/         # Fastify APIサーバー
├── frontend/        # React SPAフロントエンド
└── shared/          # 共有型定義とユーティリティ
```

## 開発コマンド

```bash
# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# テスト
npm run test

# 型チェック
npm run typecheck

# リント
npm run lint

# フォーマット
npm run format
```

## ライセンス

詳細はプロジェクト管理者にお問い合わせください。