# Vercelデプロイメントガイド

このガイドでは、Open Data APIプロジェクトをVercelにデプロイする手順を説明します。

## 前提条件

- Vercelアカウント
- GitHubリポジトリとの連携
- 環境変数の準備

## セットアップ手順

### 1. Vercelプロジェクトの作成

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. 「New Project」をクリック
3. GitHubリポジトリを選択
4. プロジェクト名を設定

### 2. 環境変数の設定

Vercel Dashboardで以下の環境変数を設定：

#### 必須の環境変数

```
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# アプリケーション設定
NODE_ENV=production
LOG_LEVEL=info
ENABLE_RATE_LIMIT=true

# フロントエンド用
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=https://your-domain.vercel.app
```

#### オプションの環境変数

```
# Analytics
VERCEL_ANALYTICS_ID=your-analytics-id

# 通知
SLACK_WEBHOOK_URL=your-slack-webhook-url

# パフォーマンステスト
RUN_LIGHTHOUSE=true
```

### 3. ビルド設定

Vercel Dashboardで以下を確認：

- **Framework Preset**: Other
- **Build Command**: `pnpm run build`
- **Output Directory**: `packages/frontend/dist`
- **Install Command**: `pnpm install`
- **Development Command**: `pnpm run dev`

### 4. デプロイ

#### 自動デプロイ

- mainブランチへのプッシュで自動デプロイ
- プルリクエストでプレビューデプロイ

#### 手動デプロイ

```bash
# Vercel CLIのインストール
npm i -g vercel

# ログイン
vercel login

# デプロイ
vercel

# 本番デプロイ
vercel --prod
```

## プロジェクト構成

```
.
├── api/                    # Vercel Functions
│   └── index.js           # バックエンドAPIハンドラー
├── packages/
│   ├── backend/           # Fastifyバックエンド
│   └── frontend/          # Viteフロントエンド
├── vercel.json            # Vercel設定
└── .vercelignore          # デプロイ除外ファイル
```

## パフォーマンス最適化

### Edge Functions

- 東京リージョン（hnd1）を使用
- 最大実行時間: 10秒
- メモリ: 1024MB

### キャッシュ戦略

1. **静的データ（/secure/\*.json）**

   - Cache-Control: `public, max-age=300, s-maxage=3600`
   - CDN-Cache-Control: `max-age=3600`

2. **認証エンドポイント（/auth/\*）**

   - Cache-Control: `private, no-cache, no-store`

3. **その他のAPI**
   - Cache-Control: `public, max-age=60, s-maxage=300`

## モニタリング

### Vercel Analytics

自動的に以下のメトリクスを収集：

- レスポンスタイム
- エラー率
- トラフィック統計

### カスタムメトリクス

`Server-Timing`ヘッダーを使用してカスタムメトリクスを記録

## トラブルシューティング

### よくある問題

1. **ビルドエラー**

   - Node.jsバージョンを確認（18以上）
   - pnpmバージョンを確認（8以上）

2. **関数タイムアウト**

   - Edge Functionsの最大実行時間は10秒
   - 長時間処理は非同期で実行

3. **環境変数エラー**
   - すべての必須変数が設定されているか確認
   - フロントエンド変数には`VITE_`プレフィックスが必要

### デバッグ

```bash
# ローカルでVercel環境をシミュレート
vercel dev

# ログの確認
vercel logs

# 環境変数の確認
vercel env pull
```

## セキュリティ

1. **環境変数**

   - サービスロールキーは本番環境のみ
   - シークレットはVercel環境変数で管理

2. **CORS設定**

   - 許可するオリジンを明示的に設定
   - 開発環境と本番環境で異なる設定

3. **レート制限**
   - ティアベースのレート制限を実装
   - DDoS保護のためのVercel Edge機能

## デプロイメントフック

`scripts/vercel-deploy-hook.ts`を使用して：

- デプロイ成功/失敗の通知
- Lighthouseテストの自動実行
- Slackへの通知

## ベストプラクティス

1. **ゼロダウンタイムデプロイ**

   - 段階的ロールアウト
   - ヘルスチェックの活用

2. **プレビューデプロイ**

   - すべてのPRで自動プレビュー
   - 本番前の検証

3. **パフォーマンス**
   - 静的アセットのCDN配信
   - API応答のキャッシュ最適化

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Edge Functions](https://vercel.com/docs/functions/edge-functions)
