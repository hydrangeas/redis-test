# Vercel環境変数設定ガイド

## 概要

本ドキュメントでは、オープンデータ提供APIをVercelにデプロイする際に必要な環境変数の設定方法を説明します。

## 必要な環境変数

### Supabase関連

| 変数名 | 説明 | 取得方法 |
|--------|------|----------|
| `SUPABASE_URL` | SupabaseプロジェクトのURL | Supabaseダッシュボード > Settings > API > Project URL |
| `SUPABASE_ANON_KEY` | Supabaseの匿名キー（公開可能） | Supabaseダッシュボード > Settings > API > anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseのサービスロールキー（秘密） | Supabaseダッシュボード > Settings > API > service_role secret |

### アプリケーション設定

| 変数名 | 説明 | 推奨値 |
|--------|------|--------|
| `NODE_ENV` | 実行環境 | `production` |
| `PORT` | サーバーポート | `8080`（Vercelでは自動設定） |
| `HOST` | サーバーホスト | `0.0.0.0`（Vercelでは自動設定） |
| `LOG_LEVEL` | ログレベル | `info` または `warn` |

### セキュリティ

| 変数名 | 説明 | 要件 |
|--------|------|------|
| `JWT_SECRET` | JWT署名用の秘密鍵 | 32文字以上のランダムな文字列 |

### API設定

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `API_BASE_URL` | APIのベースURL | `https://your-app.vercel.app` |
| `FRONTEND_URL` | フロントエンドURL | `https://your-app.vercel.app` |

### レート制限

| 変数名 | 説明 | デフォルト値 |
|--------|------|--------------|
| `RATE_LIMIT_TIER1` | Tier1の1分あたりリクエスト数 | `60` |
| `RATE_LIMIT_TIER2` | Tier2の1分あたりリクエスト数 | `120` |
| `RATE_LIMIT_TIER3` | Tier3の1分あたりリクエスト数 | `300` |
| `RATE_LIMIT_WINDOW` | レート制限のウィンドウ（秒） | `60` |

## Vercelでの設定方法

### 1. Vercelダッシュボードから設定

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. 対象のプロジェクトを選択
3. "Settings" タブをクリック
4. "Environment Variables" セクションに移動
5. 各環境変数を追加：
   - Key: 環境変数名
   - Value: 環境変数の値
   - Environment: Production/Preview/Development から選択

### 2. Vercel CLIから設定

```bash
# Vercel CLIのインストール
npm i -g vercel

# ログイン
vercel login

# 環境変数の設定
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... 他の環境変数も同様に設定
```

### 3. vercel.jsonでの設定（非推奨）

機密情報を含む環境変数は`vercel.json`に記載しないでください。
開発用のデフォルト値のみ設定可能です。

```json
{
  "env": {
    "NODE_ENV": "production",
    "LOG_LEVEL": "info"
  }
}
```

## セキュリティのベストプラクティス

1. **機密情報の保護**
   - `SUPABASE_SERVICE_ROLE_KEY`と`JWT_SECRET`は必ず秘密にする
   - これらの値をコードやGitリポジトリにコミットしない

2. **環境ごとの分離**
   - Production、Preview、Development環境で異なる値を使用
   - 特にSupabaseプロジェクトは環境ごとに分ける

3. **定期的な更新**
   - JWT_SECRETは定期的に更新する
   - 漏洩の疑いがある場合は即座に変更

4. **アクセス制限**
   - Vercelチームメンバーの環境変数アクセス権限を適切に管理
   - 必要最小限のメンバーのみがProduction環境変数にアクセス可能にする

## トラブルシューティング

### 環境変数が反映されない

1. デプロイメントを再実行する
2. Vercelのキャッシュをクリアする
3. 環境変数名のタイポを確認する

### ビルドエラー

環境変数の検証エラーが発生した場合：
- ビルドログで具体的なエラーメッセージを確認
- 必須環境変数がすべて設定されているか確認
- 環境変数の形式（URL、数値など）が正しいか確認

## 参考リンク

- [Vercel Environment Variables Documentation](https://vercel.com/docs/environment-variables)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [環境変数設定例](.env.example)