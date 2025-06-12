# プロジェクトディレクトリ構造

本ドキュメントは、オープンデータ提供APIプロジェクトのディレクトリ構造を定義します。
DDDの原則に基づき、境界づけられたコンテキストごとに整理された構造を採用しています。

## 技術スタック

- **言語**: TypeScript
- **フレームワーク**: Fastify（API）、Vite（Web）
- **認証**: Supabase Auth
- **データベース**: Supabase (PostgreSQL)
- **デプロイ**: Vercel
- **APIドキュメント**: Scalar (静的生成)

## ディレクトリ構造

```
open-data-api/
├── .github/                      # GitHub関連設定
│   ├── workflows/                # GitHub Actions
│   │   ├── ci.yml               # CI/CDパイプライン
│   │   ├── build-docs.yml       # APIドキュメント生成
│   │   └── deploy.yml           # Vercelデプロイ
│   └── ISSUE_TEMPLATE/          # イシューテンプレート
│       └── task.md              # タスクテンプレート
│
├── api/                         # Fastify APIサーバー
│   ├── src/                     # APIソースコード
│   │   ├── index.ts            # エントリーポイント
│   │   ├── server.ts           # サーバー設定
│   │   ├── routes/             # APIルート
│   │   │   ├── index.ts       # ルートの集約
│   │   │   ├── auth.ts        # 認証関連
│   │   │   ├── data.ts        # データアクセス
│   │   │   └── health.ts      # ヘルスチェック
│   │   ├── plugins/            # Fastifyプラグイン
│   │   │   ├── cors.ts        # CORS設定
│   │   │   ├── swagger.ts     # OpenAPI生成
│   │   │   ├── security.ts    # セキュリティヘッダー
│   │   │   └── rateLimit.ts   # レート制限
│   │   ├── middleware/         # ミドルウェア
│   │   │   ├── authenticate.ts # JWT認証
│   │   │   ├── authorize.ts    # 認可チェック
│   │   │   ├── errorHandler.ts # エラーハンドリング
│   │   │   └── requestLogger.ts # リクエストログ
│   │   ├── schemas/            # スキーマ定義
│   │   │   ├── common.ts       # 共通スキーマ
│   │   │   ├── auth.ts         # 認証スキーマ
│   │   │   └── data.ts         # データスキーマ
│   │   └── types/              # API用型定義
│   │       ├── fastify.d.ts    # Fastify拡張
│   │       └── env.d.ts        # 環境変数型
│   ├── tests/                   # APIテスト
│   │   ├── unit/               # 単体テスト
│   │   └── integration/        # 統合テスト
│   ├── package.json            # API用パッケージ
│   ├── tsconfig.json           # TypeScript設定
│   └── vercel.json             # Vercelデプロイ設定
│
├── web/                         # Vite Webフロントエンド
│   ├── src/                     # フロントエンドソース
│   │   ├── main.ts             # エントリーポイント
│   │   ├── App.tsx             # メインコンポーネント
│   │   ├── pages/              # ページコンポーネント
│   │   │   ├── Landing.tsx     # ランディングページ
│   │   │   └── Dashboard.tsx   # ダッシュボード
│   │   ├── components/         # 共通コンポーネント
│   │   │   ├── AuthButtons.tsx # 認証ボタン
│   │   │   └── LogoutButton.tsx # ログアウトボタン
│   │   ├── hooks/              # カスタムフック
│   │   │   └── useAuth.ts      # 認証フック
│   │   └── lib/                # ユーティリティ
│   │       └── supabase.ts     # Supabaseクライアント
│   ├── public/                  # 静的アセット
│   │   └── favicon.ico         # ファビコン
│   ├── tests/                   # Webテスト
│   │   ├── unit/               # 単体テスト
│   │   └── e2e/                # E2Eテスト
│   ├── index.html              # HTMLテンプレート
│   ├── package.json            # Web用パッケージ
│   ├── tsconfig.json           # TypeScript設定
│   └── vite.config.ts          # Vite設定
│
├── core/                        # 共有ビジネスロジック（DDD）
│   ├── src/
│   │   ├── domain/             # ドメイン層
│   │   │   ├── auth/           # 認証コンテキスト
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── AuthenticatedUser.ts
│   │   │   │   │   ├── UserId.ts
│   │   │   │   │   ├── UserTier.ts
│   │   │   │   │   └── RateLimit.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── AuthenticationService.ts
│   │   │   │   └── events/
│   │   │   │       ├── UserAuthenticated.ts
│   │   │   │       └── AuthenticationFailed.ts
│   │   │   ├── api/            # APIコンテキスト
│   │   │   │   ├── entities/
│   │   │   │   │   └── RateLimitLog.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── APIEndpoint.ts
│   │   │   │   │   └── APIPath.ts
│   │   │   │   ├── aggregates/
│   │   │   │   │   └── RateLimiting.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── APIAccessControlService.ts
│   │   │   │   └── repositories/
│   │   │   │       └── IRateLimitRepository.ts
│   │   │   ├── data/           # データコンテキスト
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── OpenDataResource.ts
│   │   │   │   │   └── FilePath.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── DataAccessService.ts
│   │   │   │   └── repositories/
│   │   │   │       └── IOpenDataRepository.ts
│   │   │   └── shared/         # 共有カーネル
│   │   │       ├── value-objects/
│   │   │       │   ├── Result.ts
│   │   │       │   └── DomainError.ts
│   │   │       └── exceptions/
│   │   │           ├── DomainException.ts
│   │   │           └── ValidationException.ts
│   │   │
│   │   ├── application/        # アプリケーション層
│   │   │   ├── auth/           # 認証ユースケース
│   │   │   │   ├── AuthenticationUseCase.ts
│   │   │   │   └── TokenRefreshUseCase.ts
│   │   │   ├── api/            # APIユースケース
│   │   │   │   └── RateLimitUseCase.ts
│   │   │   └── data/           # データユースケース
│   │   │       └── DataRetrievalUseCase.ts
│   │   │
│   │   └── infrastructure/     # インフラストラクチャ層
│   │       ├── auth/           # 認証実装
│   │       │   └── SupabaseAuthAdapter.ts
│   │       ├── api/            # API実装
│   │       │   └── RateLimitRepositoryImpl.ts
│   │       ├── data/           # データ実装
│   │       │   └── FileSystemRepository.ts
│   │       └── database/       # データベース
│   │           └── SupabaseClient.ts
│   ├── tests/                  # コアロジックテスト
│   │   └── unit/              # 単体テスト
│   ├── package.json           # コア用パッケージ
│   └── tsconfig.json          # TypeScript設定
│
├── scripts/                    # ビルドスクリプト
│   ├── generate-openapi.ts    # OpenAPI仕様生成
│   ├── build-docs.ts          # 静的ドキュメント生成
│   └── migrate.ts             # DBマイグレーション
│
├── templates/                  # テンプレート
│   └── api-docs.html          # APIドキュメントテンプレート
│
├── data/                      # オープンデータファイル
│   ├── secure/               # セキュアデータ
│   │   └── 319985/
│   │       └── r5.json
│   └── public/               # パブリックデータ
│
├── database/                  # データベース関連
│   ├── migrations/           # マイグレーションファイル
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_setup_rate_limit.sql
│   │   └── 003_custom_access_token_hook.sql
│   └── seeds/                # シードデータ
│       └── development.sql
│
├── docs/                      # プロジェクトドキュメント
│   ├── architecture/         # アーキテクチャ関連
│   │   ├── overview.md      # アーキテクチャ概要
│   │   ├── directory-structure.md  # 本ドキュメント
│   │   └── decisions/       # ADR
│   ├── api/                 # API仕様書
│   │   └── openapi.yaml    # OpenAPI仕様（ソース）
│   └── guides/             # 開発ガイド
│       ├── development.md  # 開発環境セットアップ
│       └── deployment.md   # デプロイ手順
│
├── dist/                      # ビルド成果物（gitignore対象）
│   ├── api/                  # APIビルド
│   ├── web/                  # Webビルド
│   ├── openapi.json          # 生成されたOpenAPI仕様
│   ├── openapi.yaml          # 生成されたOpenAPI仕様（YAML）
│   └── api-docs.html         # 生成されたAPIドキュメント（Scalar）
│
├── .env.example              # 環境変数サンプル
├── .gitignore               # Git除外設定
├── package.json             # ルートパッケージ定義（ワークスペース）
├── tsconfig.json            # TypeScript設定（ルート）
├── README.md                # プロジェクトREADME
└── LICENSE                  # ライセンスファイル
```

## 主な構成の特徴

### 1. モノレポ構造

プロジェクトは3つの主要パッケージで構成されています：

- **api/**: Fastify APIサーバー
- **web/**: Vite Webフロントエンド
- **core/**: 共有ビジネスロジック（DDD）

各パッケージは独立したpackage.jsonを持ち、npm workspacesで管理されます。

### 2. ビルド成果物の管理

- **docs/api/openapi.yaml**: 手動で管理されるOpenAPI仕様のソース
- **dist/openapi.json**: 自動生成されるOpenAPI仕様（Fastifyから）
- **dist/api-docs.html**: 自動生成される静的APIドキュメント（Scalar UI）

### 3. デプロイ構成

- **api/vercel.json**: APIサーバーのVercelデプロイ設定
- **web/**: 別途Vercelプロジェクトとしてデプロイ可能
- **dist/api-docs.html**: `/api-docs`パスで静的配信

### 4. データファイル管理

- **data/**: JSONデータファイルの格納場所
- URLパス構造と同じディレクトリ構造で管理
- APIからのみアクセス可能（直接アクセス不可）

### 5. 環境別設定

```json
// ルートpackage.json
{
  "name": "open-data-api",
  "private": true,
  "workspaces": [
    "api",
    "web",
    "core"
  ],
  "scripts": {
    "dev": "npm run dev --workspaces",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "generate:openapi": "tsx scripts/generate-openapi.ts",
    "build:docs": "tsx scripts/build-docs.ts",
    "deploy": "vercel"
  }
}
```

## ディレクトリ構造の設計原則

### 1. DDDレイヤー構造

- **domain/**: ビジネスロジックの中核。外部依存なし
- **application/**: ユースケースの調整。ドメイン層を使用
- **infrastructure/**: 技術的実装。インターフェースを実装
- **presentation/**: ユーザーインターフェース。HTTPリクエスト処理

### 2. 境界づけられたコンテキスト

各コンテキスト（auth、api、data、log）は独立したディレクトリ構造を持ち：
- 高凝集・疎結合を実現
- 独立した開発・テストが可能
- 将来的なマイクロサービス化への移行パスを確保

### 3. 依存関係の方向

```
presentation → application → domain ← infrastructure
```

- ドメイン層は他の層に依存しない
- インフラ層はドメイン層のインターフェースを実装（DIP）
- 依存性注入により実装を注入

### 4. 共有カーネル

`domain/shared/`には、複数のコンテキストで共有される：
- 基本的な値オブジェクト（Result、DomainError）
- ドメインイベントの基底クラス
- 共通の例外クラス

### 5. フロントエンドの分離

Webフロントエンドは独立したパッケージとして管理：
- APIとは独立したビルド・デプロイが可能
- TypeScriptによる型安全性を共有
- Vercelの静的サイトホスティングを活用

## ファイル命名規則

### TypeScriptファイル

- **クラス/インターフェース**: PascalCase（例：`AuthenticatedUser.ts`）
- **関数/ユーティリティ**: camelCase（例：`generateToken.ts`）
- **定数**: UPPER_SNAKE_CASE（定数ファイル内）
- **テストファイル**: `*.test.ts`または`*.spec.ts`

### その他のファイル

- **設定ファイル**: kebab-case（例：`tsconfig.json`）
- **ドキュメント**: kebab-case（例：`api-docs.html`）
- **SQLファイル**: 番号プレフィックス付き（例：`001_initial_schema.sql`）

## インポートパス

TypeScriptのパスエイリアスを使用：

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@core/domain/*": ["../core/src/domain/*"],
      "@core/application/*": ["../core/src/application/*"],
      "@core/infrastructure/*": ["../core/src/infrastructure/*"],
      "@api/*": ["./src/*"],
      "@web/*": ["./src/*"]
    }
  }
}
```

使用例：
```typescript
import { AuthenticatedUser } from '@core/domain/auth/value-objects/AuthenticatedUser'
import { AuthenticationUseCase } from '@core/application/auth/AuthenticationUseCase'
```

## 開発フロー

1. **ローカル開発**
   ```bash
   npm install          # 全パッケージの依存関係インストール
   npm run dev          # 全サービス起動
   ```

2. **APIドキュメント生成**
   ```bash
   npm run generate:openapi  # OpenAPI仕様生成
   npm run build:docs        # 静的ドキュメント生成
   ```

3. **ビルド**
   ```bash
   npm run build        # 全パッケージビルド
   ```

4. **デプロイ**
   ```bash
   npm run deploy       # Vercelへデプロイ
   ```

## 環境別の考慮事項

### 開発環境

- `data/`ディレクトリにテストデータを配置
- `.env`ファイルでローカル設定
- `npm run dev`で開発サーバー起動

### ステージング環境

- Vercelのプレビューデプロイメント
- Supabaseのステージングプロジェクト
- 本番に近い設定でのテスト

### 本番環境

- Vercelの本番デプロイメント
- 環境変数はVercel管理画面で設定
- `data/`ディレクトリは本番データを含む

## セキュリティ考慮事項

### 機密情報の管理

- `.env`ファイルは`.gitignore`に含める
- Supabaseのサービスロールキーは本番環境でのみ使用
- JWTシークレットは環境変数で管理

### ファイルアクセス制御

- `data/`ディレクトリへの直接アクセスは禁止
- パストラバーサル攻撃への対策を実装
- APIを通じてのみデータアクセス可能

## 拡張ポイント

### 新しいコンテキストの追加

1. `core/src/domain/[new-context]/`を作成
2. 対応するapplication、infrastructure層を追加
3. 必要に応じてAPIにルートを追加

### 新しいエンドポイントの追加

1. `api/src/routes/`に新しいルートファイル
2. 対応するスキーマを`schemas/`に定義
3. OpenAPI仕様を更新

### 新しい外部サービスの統合

1. `core/src/infrastructure/[service]/`にアダプター実装
2. ドメイン層にインターフェース定義
3. DIコンテナで実装を注入

## まとめ

この構造により：

- **明確な責務分離**: API、Web、コアロジックが独立
- **DDD原則の適用**: ビジネスロジックの集約
- **開発効率**: モノレポによる統合的な開発
- **柔軟なデプロイ**: 各コンポーネントの独立デプロイが可能
- **APIドキュメントの自動化**: 静的生成による効率化

を実現しています。各開発者はこの構造に従うことで、一貫性のあるコードベースを維持できます。