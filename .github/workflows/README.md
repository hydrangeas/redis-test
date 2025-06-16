# GitHub Actions Workflows

このディレクトリには、CI/CDパイプラインを構成するGitHub Actionsワークフローが含まれています。

## ワークフロー一覧

### 1. PR Check (`pr-check.yml`)

- **トリガー**: プルリクエストの作成、更新、再オープン時
- **実行内容**:
  - コードの静的解析（ESLint、TypeScript）
  - フォーマットチェック（Prettier）
  - 単体テスト
  - 統合テスト
  - E2Eテスト
  - ビルドチェック
  - セキュリティスキャン
- **必要なSecrets**:
  - `SUPABASE_TEST_URL`
  - `SUPABASE_TEST_ANON_KEY`
  - `SUPABASE_TEST_SERVICE_ROLE_KEY`

### 2. Deploy to Production (`deploy-production.yml`)

- **トリガー**: mainブランチへのプッシュ時
- **実行内容**:
  - PR Checkワークフローの全テストを実行
  - Vercelへのデプロイ
  - デプロイメント記録の作成
- **必要なSecrets**:
  - `SUPABASE_PROD_URL`
  - `SUPABASE_PROD_ANON_KEY`
  - `API_PROD_URL`
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`

### 3. Scheduled Tasks (`scheduled-tasks.yml`)

- **トリガー**:
  - 毎日UTC 3:00（日本時間 12:00）
  - 手動実行（workflow_dispatch）
- **実行内容**:
  - セキュリティ監査
  - 依存関係の脆弱性チェック
  - パフォーマンスモニタリング（Lighthouse）
  - 問題検出時の自動Issue作成

### 4. Reusable Test Workflow (`reusable-test.yml`)

- **用途**: 他のワークフローから呼び出される再利用可能なテストワークフロー
- **パラメータ**:
  - `environment`: 実行環境
  - `node-version`: Node.jsバージョン（デフォルト: 18）

## セットアップ手順

### 1. 必要なSecrets設定

リポジトリのSettings > Secrets and variablesで以下を設定：

#### テスト環境用

- `SUPABASE_TEST_URL`: Supabaseテスト環境のURL
- `SUPABASE_TEST_ANON_KEY`: Supabaseテスト環境の匿名キー
- `SUPABASE_TEST_SERVICE_ROLE_KEY`: Supabaseテスト環境のサービスロールキー

#### 本番環境用

- `SUPABASE_PROD_URL`: Supabase本番環境のURL
- `SUPABASE_PROD_ANON_KEY`: Supabase本番環境の匿名キー
- `API_PROD_URL`: API本番環境のURL

#### Vercel用

- `VERCEL_TOKEN`: VercelのAPIトークン
- `VERCEL_ORG_ID`: Vercelの組織ID
- `VERCEL_PROJECT_ID`: VercelのプロジェクトID

### 2. 環境の設定

GitHub Environments（Settings > Environments）で以下を設定：

- `production`: 本番環境
  - 保護ルールの設定（レビュー必須など）
  - デプロイ前の承認者設定

## 使用方法

### プルリクエスト作成時

1. ブランチで作業を完了
2. プルリクエストを作成
3. 自動的にPR Checkワークフローが実行される
4. すべてのチェックがパスすることを確認

### 本番デプロイ

1. プルリクエストをmainブランチにマージ
2. 自動的にデプロイワークフローが実行される
3. Actionsタブでデプロイ状況を確認

### 手動でのセキュリティチェック

1. Actionsタブに移動
2. "Scheduled Tasks"ワークフローを選択
3. "Run workflow"ボタンをクリック

## トラブルシューティング

### ワークフローが失敗する場合

1. **依存関係のインストールエラー**

   - `pnpm-lock.yaml`が最新か確認
   - Node.jsバージョンが18以上か確認

2. **テストの失敗**

   - ローカルでテストが通ることを確認
   - 環境変数が正しく設定されているか確認

3. **デプロイの失敗**
   - Vercel関連のSecretsが正しく設定されているか確認
   - Vercelプロジェクトの設定を確認

### Dependabot設定

`dependabot.yml`により、以下が自動化されています：

- npm依存関係の週次更新チェック
- GitHub Actions依存関係の週次更新チェック
- 開発依存関係のグループ化（eslint、prettier、typescript関連）

## ベストプラクティス

1. **Secret管理**

   - 機密情報は必ずGitHub Secretsを使用
   - 環境ごとに異なるSecretsを使用

2. **ワークフローの最適化**

   - 並列実行可能なジョブは並列化
   - キャッシュを活用して実行時間を短縮

3. **モニタリング**

   - 定期的にActionsタブでワークフローの実行状況を確認
   - 失敗したワークフローは速やかに修正

4. **セキュリティ**
   - 定期的なセキュリティスキャンの結果を確認
   - 脆弱性が検出された場合は速やかに対応
