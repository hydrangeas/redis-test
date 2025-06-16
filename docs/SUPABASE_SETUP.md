# Supabase Setup Guide

このドキュメントでは、OpenData APIプロジェクトのSupabase設定手順を説明します。

## 前提条件

- Supabaseアカウントを作成済みであること
- Supabase CLIがインストールされていること（`npm install -g supabase`）

## 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com/)にログイン
2. 「New project」をクリック
3. 以下の情報を入力：
   - Project name: `opendata-api`
   - Database password: 安全なパスワードを生成
   - Region: 最寄りのリージョンを選択（例：Northeast Asia (Tokyo)）
4. 「Create new project」をクリック

## 2. プロジェクト設定の取得

プロジェクトが作成されたら、Settings > APIから以下の情報を取得：

- Project URL: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
- anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- service_role key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 3. Social Provider（OAuth）の設定

### Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. APIs & Services > Credentials に移動
4. 「CREATE CREDENTIALS」> 「OAuth client ID」を選択
5. Application typeで「Web application」を選択
6. 以下の設定を追加：
   - Name: `OpenData API`
   - Authorized redirect URIs:
     - `https://xxxxxxxxxxxxxxxxxxxx.supabase.co/auth/v1/callback`
     - `http://localhost:54321/auth/v1/callback` (ローカル開発用)
7. Client IDとClient Secretを保存

### GitHub OAuth設定

1. [GitHub Settings](https://github.com/settings/applications/new)にアクセス
2. 新しいOAuth Appを作成：
   - Application name: `OpenData API`
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co/auth/v1/callback`
3. 「Register application」をクリック
4. Client IDを確認し、「Generate a new client secret」でClient Secretを生成

### Supabase Dashboardでの設定

1. Authentication > Providers に移動
2. Google:
   - Enableをオン
   - Client IDとClient Secretを入力
   - Site URLに `http://localhost:5173` を追加
3. GitHub:
   - Enableをオン
   - Client IDとClient Secretを入力

## 4. Auth設定の調整

Authentication > Settings で以下を設定：

### JWT Settings

- JWT Expiry: `3600` (1時間)
- Enable refresh token rotation: ON
- Refresh token reuse interval: `10`

### Email Auth

- Enable Email Confirmations: OFF（開発環境）
- Enable Email Change Confirmations: ON

### Allowed URLs

Site URLとAdditional Redirect URLsに以下を追加：

- `http://localhost:5173`
- `http://localhost:3000`
- `https://your-production-domain.com` (本番環境用)

## 5. 環境変数の設定

1. プロジェクトルートに`.env`ファイルを作成（`.env.example`をコピー）
2. 取得した値を設定：

```bash
# プロジェクトルートで実行
cp .env.example .env
```

3. `.env`ファイルを編集して実際の値を設定

## 6. ローカル開発環境の設定

```bash
# Supabase CLIでローカル環境を初期化
supabase init

# プロジェクトをリンク
supabase link --project-ref xxxxxxxxxxxxxxxxxxxx

# ローカルのSupabaseを起動
supabase start
```

## 7. 確認

1. `supabase status`でローカル環境の状態を確認
2. Studio URL（通常 http://localhost:54323）でローカルのSupabase Studioにアクセス

## トラブルシューティング

### Google OAuthが動作しない場合

- Authorized redirect URIsが正しく設定されているか確認
- Google Cloud Consoleでアプリケーションが「Testing」ステータスの場合、テストユーザーを追加

### GitHub OAuthが動作しない場合

- Authorization callback URLが正確に一致しているか確認（末尾のスラッシュに注意）

### JWTトークンが無効な場合

- Supabase DashboardのProject Settings > APIでJWT Secretを確認
- 環境変数が正しく設定されているか確認

## 8. Custom Access Token Hookの有効化

マイグレーション実行後、以下の手順でHookを有効化します：

1. Supabase Dashboard > Authentication > Hooks に移動
2. 「Custom Access Token」セクションを見つける
3. 「Enable Hook」をオンにする
4. Function to run: `public.custom_access_token_hook` を選択
5. 「Save」をクリック

### Hook動作確認

1. 新規ユーザーでサインアップ
2. JWTトークンをデコードして`tier`クレームが含まれていることを確認
3. デフォルトで`tier1`が設定されることを確認

### ユーザーティアの変更

```sql
-- ユーザーのティアを変更
SELECT public.update_user_tier('user-uuid-here', 'tier2');

-- ユーザーの現在のティアを確認
SELECT public.get_user_tier('user-uuid-here');

-- 全ユーザーのティアを確認
SELECT * FROM public.user_tiers;
```

## マイグレーションの実行

```bash
# ローカル環境でマイグレーションを実行
supabase db push

# または本番環境に直接適用
supabase db push --db-url "postgresql://postgres:password@db.xxxxxxxxxxxxxxxxxxxx.supabase.co:5432/postgres"
```

## 次のステップ

Supabaseの設定が完了したら、以下のタスクに進みます：

1. 環境変数の設定（Task 0005）
2. 認証エンドポイントの実装（Task 0036）
3. データAPIエンドポイントの実装（Task 0037）
