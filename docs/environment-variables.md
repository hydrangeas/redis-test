# 環境変数設定ガイド

## 概要

このドキュメントでは、オープンデータ提供APIで使用される環境変数について説明します。

## 環境変数一覧

### Supabase設定

| 変数名 | 説明 | 必須 | デフォルト値 |
|--------|------|------|-------------|
| `PUBLIC_SUPABASE_URL` | SupabaseプロジェクトのURL | ✅ | - |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabaseのanonymousキー（公開可能） | ✅ | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseのservice roleキー（秘密） | ✅ | - |

### アプリケーション設定

| 変数名 | 説明 | 必須 | デフォルト値 |
|--------|------|------|-------------|
| `NODE_ENV` | 実行環境（development/staging/production） | ❌ | development |
| `PORT` | サーバーのポート番号 | ❌ | 3000 |
| `HOST` | サーバーのホスト | ❌ | 0.0.0.0 |
| `LOG_LEVEL` | ログレベル（fatal/error/warn/info/debug/trace） | ❌ | info |

### レート制限設定

| 変数名 | 説明 | 必須 | デフォルト値 |
|--------|------|------|-------------|
| `RATE_LIMIT_TIER1` | Tier1の1分あたりのリクエスト数上限 | ❌ | 60 |
| `RATE_LIMIT_TIER2` | Tier2の1分あたりのリクエスト数上限 | ❌ | 120 |
| `RATE_LIMIT_TIER3` | Tier3の1分あたりのリクエスト数上限 | ❌ | 300 |
| `RATE_LIMIT_WINDOW` | レート制限のウィンドウ（秒） | ❌ | 60 |

### JWT設定

| 変数名 | 説明 | 必須 | デフォルト値 |
|--------|------|------|-------------|
| `JWT_SECRET` | JWT署名用の秘密鍵（32文字以上） | ✅ | - |

### データディレクトリ設定

| 変数名 | 説明 | 必須 | デフォルト値 |
|--------|------|------|-------------|
| `DATA_DIRECTORY` | JSONデータファイルのディレクトリパス | ❌ | ./data |

### CORS設定

| 変数名 | 説明 | 必須 | デフォルト値 |
|--------|------|------|-------------|
| `CORS_ORIGIN` | 許可するオリジン（カンマ区切り） | ❌ | http://localhost:5173 |

### API設定

| 変数名 | 説明 | 必須 | デフォルト値 |
|--------|------|------|-------------|
| `API_PREFIX` | APIのプレフィックス | ❌ | /api |
| `API_VERSION` | APIのバージョン | ❌ | v1 |
| `FRONTEND_URL` | フロントエンドのURL | ❌ | http://localhost:5173 |

### セッション設定

| 変数名 | 説明 | 必須 | デフォルト値 |
|--------|------|------|-------------|
| `SESSION_EXPIRY_HOURS` | セッションの有効期限（時間） | ❌ | 24 |
| `REFRESH_TOKEN_EXPIRY_DAYS` | リフレッシュトークンの有効期限（日） | ❌ | 30 |

## 環境別設定

### 開発環境（development）

```bash
cp .env.example .env.local
# .env.localを編集して必要な値を設定
```

### ステージング環境（staging）

Vercelのプロジェクト設定で環境変数を設定します。

### 本番環境（production）

Vercelのプロジェクト設定で環境変数を設定します。セキュリティのため、本番環境では以下の点に注意してください：

- `SUPABASE_SERVICE_ROLE_KEY`は絶対に公開しない
- `JWT_SECRET`は強力なランダム文字列を使用
- `NODE_ENV`は必ず`production`に設定

## Vercel環境変数の設定

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. Settings → Environment Variables
4. 以下の変数を設定：

### 必須変数
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Encrypted)
- `JWT_SECRET` (Encrypted)

### オプション変数（必要に応じて）
- `RATE_LIMIT_TIER1`
- `RATE_LIMIT_TIER2`
- `RATE_LIMIT_TIER3`
- `CORS_ORIGIN`

## セキュリティベストプラクティス

1. **秘密情報の管理**
   - `SUPABASE_SERVICE_ROLE_KEY`と`JWT_SECRET`は絶対に公開しない
   - これらの値はVercelで「Encrypted」として保存

2. **環境の分離**
   - 開発、ステージング、本番で異なるSupabaseプロジェクトを使用
   - 各環境で異なるJWT秘密鍵を使用

3. **アクセス制御**
   - 環境変数へのアクセスは必要最小限のメンバーに限定
   - 定期的に秘密鍵をローテーション

## トラブルシューティング

### 環境変数が読み込まれない

1. `.env.local`ファイルが正しい場所にあるか確認
2. 変数名のスペルミスがないか確認
3. サーバーを再起動

### Vercelで環境変数が反映されない

1. デプロイを再実行
2. 環境変数のスコープ（Development/Preview/Production）を確認
3. ビルドログでエラーを確認

### 型エラーが発生する

1. `packages/shared/src/config/env.ts`の型定義を確認
2. 必須変数がすべて設定されているか確認