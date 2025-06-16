# ユーザー作業指示書

本ドキュメントには、ユーザーが手動で実施する必要がある作業の詳細な手順を記載します。

## 目次

1. [Supabaseプロジェクトの設定（タスク0002）](#supabaseプロジェクトの設定タスク0002)

---

## Supabaseプロジェクトの設定（タスク0002）

### 概要

Supabaseプロジェクトを作成し、認証プロバイダーの設定、環境変数の取得を行います。

### 手順

#### 1. Supabaseアカウントの作成

1. [Supabase](https://supabase.com/)にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインアップ（推奨）またはメールアドレスでアカウント作成

#### 2. 新規プロジェクトの作成

1. ダッシュボードで「New project」をクリック
2. 以下の情報を入力：

   - **Project name**: `opendata-api` （任意の名前）
   - **Database Password**: 強力なパスワードを生成して保存
   - **Region**: `Northeast Asia (Tokyo)` または最寄りのリージョン
   - **Pricing Plan**: Free tier（開発用）

3. 「Create new project」をクリック（プロジェクト作成に数分かかります）

#### 3. プロジェクト設定値の取得

プロジェクトが作成されたら、以下の値を取得します：

1. **Project Settings** > **API** に移動
2. 以下の値をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIs...`（公開可能なキー）
   - **service_role secret**: `eyJhbGciOiJIUzI1NiIs...`（秘密キー）

#### 4. Google OAuth プロバイダーの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新規プロジェクトを作成または既存プロジェクトを選択
3. **APIs & Services** > **Credentials** に移動
4. **Create Credentials** > **OAuth client ID** を選択
5. 以下を設定：

   - **Application type**: Web application
   - **Name**: `OpenData API`
   - **Authorized redirect URIs**:
     - `https://xxxxx.supabase.co/auth/v1/callback`（xxxxx は実際のプロジェクトID）
     - `http://localhost:3000/auth/callback`（開発用）

6. 作成後、**Client ID** と **Client Secret** をコピー

7. Supabaseダッシュボードに戻り、**Authentication** > **Providers** > **Google** を有効化
8. 取得した Client ID と Client Secret を入力して保存

#### 5. GitHub OAuth プロバイダーの設定

1. [GitHub Settings](https://github.com/settings/apps)にアクセス
2. **OAuth Apps** > **New OAuth App** をクリック
3. 以下を設定：

   - **Application name**: `OpenData API`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `https://xxxxx.supabase.co/auth/v1/callback`

4. アプリケーション作成後、**Client ID** を確認
5. **Generate a new client secret** をクリックして **Client Secret** を生成・コピー

6. Supabaseダッシュボードに戻り、**Authentication** > **Providers** > **GitHub** を有効化
7. 取得した Client ID と Client Secret を入力して保存

#### 6. 認証設定の調整

1. Supabaseダッシュボードで **Authentication** > **Settings** に移動
2. 以下を確認・設定：
   - **Site URL**: `http://localhost:3000`（開発用）
   - **Redirect URLs**:
     - `http://localhost:3000/**`
     - `https://your-app.vercel.app/**`（本番用、後で追加）
   - **JWT Expiry**: `3600`（1時間）
   - **Refresh Token Rotation**: 有効
   - **Refresh Token Reuse Interval**: `10`（秒）

#### 7. 環境変数の設定

1. プロジェクトのルートディレクトリで以下を実行：

```bash
# バックエンド用
cp packages/backend/.env.example packages/backend/.env.local

# フロントエンド用
cp packages/frontend/.env.example packages/frontend/.env.local
```

2. `packages/backend/.env.local` を編集：

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=取得したanon publicキー
SUPABASE_SERVICE_ROLE_KEY=取得したservice_role secretキー

# JWT Configuration（32文字以上のランダムな文字列を生成）
JWT_SECRET=your-very-secure-jwt-secret-at-least-32-chars

# その他の設定はデフォルト値のまま
```

3. `packages/frontend/.env.local` を編集：

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=取得したanon publicキー
```

#### 8. Supabase CLIのインストール（オプション）

ローカル開発やマイグレーション管理のため、Supabase CLIをインストールします：

```bash
# npmでインストール
npm install -g supabase

# または Homebrew（macOS/Linux）
brew install supabase/tap/supabase

# インストール確認
supabase --version
```

### 確認事項

以下が完了していることを確認してください：

- [ ] Supabaseプロジェクトが作成されている
- [ ] Google OAuthプロバイダーが設定されている
- [ ] GitHub OAuthプロバイダーが設定されている
- [ ] 環境変数ファイル（.env.local）が両パッケージに作成されている
- [ ] すべての必要な環境変数が設定されている

### トラブルシューティング

#### OAuth認証が機能しない場合

1. リダイレクトURLが正確に設定されているか確認
2. Client IDとClient Secretが正しくコピーされているか確認
3. Supabaseダッシュボードでプロバイダーが「有効」になっているか確認

#### 環境変数エラーが発生する場合

1. すべての必須環境変数が設定されているか確認
2. URLの末尾に余分なスラッシュがないか確認
3. キーに改行や空白が含まれていないか確認

### 次のステップ

Supabaseプロジェクトの設定が完了したら、開発を続行できます。
データベーススキーマの作成は別タスク（タスク0003）で実施します。
