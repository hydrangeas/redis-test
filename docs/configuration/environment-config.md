# 環境別設定ガイド

このガイドでは、Open Data APIプロジェクトの環境別設定について説明します。

## 概要

本プロジェクトでは、開発環境（development）、ステージング環境（staging）、本番環境（production）の3つの環境をサポートしています。

## 設定ファイル構成

```
.
├── .env                    # デフォルト設定（全環境共通）
├── .env.example           # 設定テンプレート
├── .env.local             # ローカル設定（gitignore対象）
├── .env.development       # 開発環境設定
├── .env.development.local # 開発環境のローカル設定（gitignore対象）
├── .env.staging           # ステージング環境設定
├── .env.staging.local     # ステージング環境のローカル設定（gitignore対象）
├── .env.production        # 本番環境設定
└── .env.production.local  # 本番環境のローカル設定（gitignore対象）
```

## 設定の優先順位

環境変数は以下の優先順位で読み込まれます（上位が優先）：

1. `.env.{環境}.local`
2. `.env.{環境}`
3. `.env.local`
4. `.env`

## セットアップ手順

### 1. 初期設定

```bash
# .env.exampleをコピーして.env.localを作成
cp .env.example .env.local

# 必要な値を設定
nano .env.local
```

### 2. 環境別の設定

#### 開発環境

```bash
# 開発環境用の設定
cp .env.development .env.development.local
nano .env.development.local
```

開発環境の特徴：
- デバッグモード有効
- 詳細なログ出力
- ホットリロード有効
- モックデータの使用可能

#### ステージング環境

```bash
# ステージング環境用の設定
cp .env.staging .env.staging.local
nano .env.staging.local
```

ステージング環境の特徴：
- テストユーザーの設定
- デバッグエンドポイント有効
- 本番環境に近い設定

#### 本番環境

```bash
# 本番環境用の設定
cp .env.production .env.production.local
nano .env.production.local
```

本番環境の特徴：
- 最小限のログ出力
- セキュリティ設定の強化
- モニタリング有効
- バックアップ設定

## 主要な設定項目

### 基本設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|------------|
| NODE_ENV | 環境タイプ | development |
| APP_NAME | アプリケーション名 | Open Data API |
| APP_VERSION | バージョン | 1.0.0 |
| LOG_LEVEL | ログレベル | debug (dev) / info (staging) / warn (prod) |

### Supabase設定

| 設定項目 | 説明 | 必須 |
|---------|------|-----|
| SUPABASE_URL | SupabaseプロジェクトURL | ✓ |
| SUPABASE_ANON_KEY | Supabase匿名キー | ✓ |
| SUPABASE_SERVICE_ROLE_KEY | Supabaseサービスロールキー | ✓ |

### API設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|------------|
| API_PORT | APIサーバーのポート | 3000 |
| API_HOST | APIサーバーのホスト | localhost |
| API_BASE_URL | APIのベースURL | http://localhost:3000 |

### レート制限設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|------------|
| RATE_LIMIT_ENABLED | レート制限の有効/無効 | true |
| RATE_LIMIT_TIER1_MAX | Tier1の最大リクエスト数 | 60 |
| RATE_LIMIT_TIER1_WINDOW | Tier1のウィンドウ時間（秒） | 60 |
| RATE_LIMIT_TIER2_MAX | Tier2の最大リクエスト数 | 120 |
| RATE_LIMIT_TIER2_WINDOW | Tier2のウィンドウ時間（秒） | 60 |
| RATE_LIMIT_TIER3_MAX | Tier3の最大リクエスト数 | 300 |
| RATE_LIMIT_TIER3_WINDOW | Tier3のウィンドウ時間（秒） | 60 |

### セキュリティ設定

| 設定項目 | 説明 | 注意事項 |
|---------|------|---------|
| CORS_ORIGINS | 許可するオリジン（カンマ区切り） | 本番環境では厳密に設定 |
| JWT_SECRET | JWT署名用のシークレット | 最低32文字以上 |
| ENCRYPTION_KEY | 暗号化キー | 最低32文字以上 |

### 機能フラグ

| 設定項目 | 説明 | デフォルト値 |
|---------|------|------------|
| FEATURE_API_DOCS_ENABLED | APIドキュメントの有効/無効 | true (dev/staging) / false (prod) |
| FEATURE_HEALTH_CHECK_ENABLED | ヘルスチェックの有効/無効 | true |
| FEATURE_METRICS_ENABLED | メトリクス収集の有効/無効 | false (dev) / true (staging/prod) |

## 設定の検証

アプリケーション起動時に設定の検証が自動的に実行されます。無効な設定がある場合は、エラーメッセージとともに起動が中断されます。

### 検証内容

- 必須項目の存在確認
- データ型の確認
- 値の範囲確認
- URL形式の確認

## コードでの使用方法

### 設定の読み込み

```typescript
import { config, isDevelopment, isProduction } from '@/config';

// 設定値の取得
const port = config.server.port;
const logLevel = config.logging.level;

// 環境判定
if (isDevelopment()) {
  // 開発環境のみの処理
}

if (isProduction()) {
  // 本番環境のみの処理
}
```

### 環境別の処理

```typescript
import { getFeatureFlag } from '@/config/helpers';

// 機能フラグの確認
if (getFeatureFlag('apiDocs')) {
  // APIドキュメントを有効化
}

// レート制限設定の取得
import { getRateLimitConfig } from '@/config/helpers';

const tier1Config = getRateLimitConfig('tier1');
console.log(tier1Config.max); // 60
console.log(tier1Config.window); // 60
```

## トラブルシューティング

### 環境変数が読み込まれない

1. ファイル名が正しいか確認
2. NODE_ENVが正しく設定されているか確認
3. ファイルのパーミッションを確認

### 設定の検証エラー

エラーメッセージを確認し、該当する設定項目を修正してください。

例：
```
Environment validation errors:
  SUPABASE_URL: Invalid url
  JWT_SECRET: String must contain at least 32 character(s)
```

### 環境別の動作確認

```bash
# 開発環境で起動
NODE_ENV=development npm run dev

# ステージング環境で起動
NODE_ENV=staging npm run start

# 本番環境で起動
NODE_ENV=production npm run start
```

## セキュリティの考慮事項

1. **機密情報の管理**
   - `.env.local`ファイルはGitにコミットしない
   - 本番環境の機密情報は環境変数で管理

2. **最小権限の原則**
   - 各環境で必要最小限の権限のみ付与
   - サービスロールキーは本番環境のみで使用

3. **定期的な更新**
   - JWT_SECRETとENCRYPTION_KEYは定期的に更新
   - 使用しない環境変数は削除

## ベストプラクティス

1. **環境の分離**
   - 各環境で異なるSupabaseプロジェクトを使用
   - 環境間でデータを共有しない

2. **設定の文書化**
   - 新しい設定項目は必ず文書化
   - デフォルト値と必須/オプションを明記

3. **バックアップ**
   - 本番環境の設定は安全な場所にバックアップ
   - 災害時の復旧手順を準備

4. **監査**
   - 設定変更の履歴を記録
   - 定期的な設定の見直し