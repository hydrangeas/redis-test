# 開発環境のセットアップ

## 概要

このドキュメントでは、バックエンドAPIの開発環境をセットアップする手順を説明します。

## 前提条件

- Node.js 18以上
- Docker Desktop (Supabase Local Development用)
- Supabase CLI
- npm または yarn

## 初回セットアップ

### 1. 環境変数の設定

```bash
cd packages/backend
cp .env.example .env
```

`.env`ファイルを編集して、必要な環境変数を設定してください。

### 2. Supabaseローカル環境の起動

```bash
# プロジェクトルートで実行
cd ../..
supabase start
```

起動後、表示される認証情報を`.env`ファイルに設定してください：

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. データベースマイグレーション

```bash
# プロジェクトルートで実行
supabase db push
```

### 4. シードデータの投入

```bash
cd packages/backend
npm run db:seed
```

これにより、以下のテストデータが作成されます：

- テストユーザー（各ティア）
- APIキー
- サンプルログデータ

## テストユーザー

以下のテストユーザーが作成されます：

| Email             | Password    | Tier  | Rate Limit  |
| ----------------- | ----------- | ----- | ----------- |
| tier1@example.com | password123 | tier1 | 60 req/min  |
| tier2@example.com | password123 | tier2 | 120 req/min |
| tier3@example.com | password123 | tier3 | 300 req/min |

その他にもランダムなテストユーザーが作成されます。

## APIキーの確認

シードデータ投入時、各ユーザーのAPIキーがコンソールに出力されます。
開発環境でのテスト用に使用してください。

```
例：
[INFO] API key created {
  userId: "xxxx-xxxx-xxxx-xxxx",
  email: "tier1@example.com",
  apiKey: "nara_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

## データのリセット

既存のテストデータを削除して、新しいデータを生成する場合：

```bash
# スキーマのリセット（Supabase CLI）
supabase db reset

# シードデータの再投入
npm run db:seed
```

## 開発サーバーの起動

```bash
npm run dev
```

サーバーは http://localhost:8000 で起動します。

## よくある使用例

### APIエンドポイントのテスト

```bash
# ヘルスチェック
curl http://localhost:8000/health

# 認証なしでAPIドキュメントを確認
curl http://localhost:8000/api-docs

# JWTトークンを使用してデータにアクセス
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/secure/population/2024.json
```

### ログの確認

シードデータには以下のログが含まれます：

- **認証ログ**: 過去30日間のログイン/ログアウト履歴
- **APIログ**: 過去7日間のAPIアクセス履歴
- **レート制限ログ**: 過去1時間のレート制限カウント

## トラブルシューティング

### シードデータ投入エラー

1. Supabaseが起動していることを確認

   ```bash
   supabase status
   ```

2. 環境変数が正しく設定されていることを確認

   ```bash
   npm run validate:env
   ```

3. データベースマイグレーションが完了していることを確認
   ```bash
   supabase db push
   ```

### ユーザー作成エラー

"User already exists"エラーが出る場合は、既存のテストユーザーをスキップしているため正常動作です。

### APIキーの再生成

既存のAPIキーは削除されないため、新しいAPIキーが必要な場合は手動で既存のキーを削除してから再度シードを実行してください。

## 注意事項

- シーダーは開発環境でのみ実行可能です
- 本番環境では実行できないよう保護されています
- APIキーは開発環境でのみコンソールに出力されます
- テストユーザーのメールアドレスは必ず`@example.com`で終わります
