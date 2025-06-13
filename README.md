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

### インストール

```bash
# 依存関係のインストール
npm install

# 開発環境の起動
npm run dev
```

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