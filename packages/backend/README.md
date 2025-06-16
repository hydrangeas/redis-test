# Backend API

OpenデータAPIのバックエンドサーバー

## 環境構築

### 必要な環境

- Node.js 18以上
- Supabase CLI
- npm または yarn

### 初回セットアップ

1. 環境変数の設定
```bash
cp .env.example .env.development
```

2. Supabaseローカル環境の起動
```bash
supabase start
```

3. データベースマイグレーション
```bash
npm run db:migrate
```

4. シードデータの投入
```bash
npm run db:seed
```

## 開発

### 開発サーバーの起動

```bash
npm run dev
```

サーバーは http://localhost:3000 で起動します。

### テストの実行

```bash
# 単体テスト
npm run test:unit

# 統合テスト
npm run test:integration

# E2Eテスト
npm run test:e2e

# カバレッジ付きテスト
npm run test:coverage
```

## データベースシーダー

### シードデータの投入

開発環境でテスト用のデータを生成します：

```bash
npm run db:seed
```

### テストユーザー

以下のテストユーザーが作成されます：

| Email | Password | Tier | Rate Limit |
|-------|----------|------|------------|
| tier1@example.com | password123 | tier1 | 60 req/min |
| tier2@example.com | password123 | tier2 | 300 req/min |
| tier3@example.com | password123 | tier3 | 1000 req/min |

### 生成されるデータ

- **ユーザー**: 各ティアのテストユーザー + ランダムユーザー5名
- **APIキー**: 各ユーザーに1つずつ
- **レート制限ログ**: 過去1時間のアクセスログ
- **認証ログ**: 過去30日間のログイン/ログアウト履歴
- **APIログ**: 過去7日間のAPIアクセス履歴

### データのリセット

```bash
npm run db:reset
```

**注意**: 
- シーダーは開発環境でのみ実行可能です
- 本番環境では実行できないよう保護されています
- APIキーは開発環境でのみコンソールに出力されます

## API仕様

### エンドポイント

- `GET /api/data/{path}` - データファイルの取得
- `GET /api/docs` - APIドキュメント（Scalar）
- `GET /health` - ヘルスチェック
- `GET /metrics` - Prometheusメトリクス

### 認証

JWTトークンを使用したBearer認証：

```
Authorization: Bearer <token>
```

### レート制限

各ティアごとに1分間あたりのリクエスト数が制限されています：

- tier1: 60 requests/min
- tier2: 300 requests/min
- tier3: 1000 requests/min

## ディレクトリ構造

```
src/
├── domain/           # ドメイン層
├── application/      # アプリケーション層
├── infrastructure/   # インフラ層
├── presentation/     # プレゼンテーション層
├── commands/         # CLIコマンド
├── test/            # テスト関連
└── server.ts        # エントリーポイント
```

## 環境変数

必要な環境変数については `.env.example` を参照してください。

## トラブルシューティング

### Supabaseの接続エラー

```bash
# Supabaseの状態確認
supabase status

# Supabaseの再起動
supabase stop
supabase start
```

### マイグレーションエラー

```bash
# マイグレーションのリセット
supabase db reset
```