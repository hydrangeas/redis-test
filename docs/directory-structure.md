# プロジェクトディレクトリ構造

本ドキュメントは、オープンデータ提供APIプロジェクトのディレクトリ構造を定義します。
DDDの原則に基づき、境界づけられたコンテキストごとに整理された構造を採用しています。

## 技術スタック

- **言語**: TypeScript
- **フレームワーク**: Fastify
- **フロントエンド**: Vite + TypeScript
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
├── docs/                        # プロジェクトドキュメント
│   ├── architecture/           # アーキテクチャ関連
│   │   ├── overview.md        # アーキテクチャ概要
│   │   ├── directory-structure.md  # 本ドキュメント
│   │   └── decisions/         # ADR (Architecture Decision Records)
│   ├── api/                   # API仕様
│   │   └── openapi.yaml      # OpenAPI仕様（生成元）
│   └── guides/               # 開発ガイド
│       ├── development.md    # 開発環境セットアップ
│       └── deployment.md     # デプロイ手順
│
├── src/                         # ソースコード
│   ├── domain/                 # ドメイン層
│   │   ├── auth/              # 認証コンテキスト
│   │   │   ├── entities/     # エンティティ（なし）
│   │   │   ├── value-objects/
│   │   │   │   ├── AuthenticatedUser.ts
│   │   │   │   ├── UserId.ts
│   │   │   │   ├── UserTier.ts
│   │   │   │   ├── TierLevel.ts
│   │   │   │   └── RateLimit.ts
│   │   │   ├── services/
│   │   │   │   └── AuthenticationService.ts
│   │   │   └── events/
│   │   │       ├── UserAuthenticated.ts
│   │   │       ├── TokenRefreshed.ts
│   │   │       ├── UserLoggedOut.ts
│   │   │       └── AuthenticationFailed.ts
│   │   │
│   │   ├── api/               # APIコンテキスト
│   │   │   ├── entities/
│   │   │   │   └── RateLimitLog.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── APIEndpoint.ts
│   │   │   │   ├── APIPath.ts
│   │   │   │   ├── LogId.ts
│   │   │   │   └── Endpoint.ts
│   │   │   ├── aggregates/
│   │   │   │   └── RateLimiting.ts
│   │   │   ├── services/
│   │   │   │   └── APIAccessControlService.ts
│   │   │   ├── repositories/
│   │   │   │   ├── IAPIEndpointRepository.ts
│   │   │   │   └── IRateLimitRepository.ts
│   │   │   └── events/
│   │   │       ├── APIAccessed.ts
│   │   │       └── RateLimitExceeded.ts
│   │   │
│   │   ├── data/              # データコンテキスト
│   │   │   ├── value-objects/
│   │   │   │   ├── OpenDataResource.ts
│   │   │   │   ├── FilePath.ts
│   │   │   │   ├── ContentType.ts
│   │   │   │   ├── FileSize.ts
│   │   │   │   └── JsonObject.ts
│   │   │   ├── services/
│   │   │   │   └── DataAccessService.ts
│   │   │   ├── repositories/
│   │   │   │   └── IOpenDataRepository.ts
│   │   │   ├── factories/
│   │   │   │   └── OpenDataResourceFactory.ts
│   │   │   └── events/
│   │   │       └── DataRetrieved.ts
│   │   │
│   │   ├── log/               # ログコンテキスト
│   │   │   ├── entities/
│   │   │   │   ├── AuthLogEntry.ts
│   │   │   │   └── APILogEntry.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── AuthEvent.ts
│   │   │   │   ├── Provider.ts
│   │   │   │   ├── IPAddress.ts
│   │   │   │   ├── UserAgent.ts
│   │   │   │   ├── StatusCode.ts
│   │   │   │   ├── ResponseTime.ts
│   │   │   │   ├── RequestId.ts
│   │   │   │   ├── TimeRange.ts
│   │   │   │   └── StatsCriteria.ts
│   │   │   ├── aggregates/
│   │   │   │   ├── AuthenticationLog.ts
│   │   │   │   └── APIAccessLog.ts
│   │   │   ├── services/
│   │   │   │   └── LogAnalysisService.ts
│   │   │   └── repositories/
│   │   │       ├── IAuthLogRepository.ts
│   │   │       └── IAPILogRepository.ts
│   │   │
│   │   └── shared/            # 共有カーネル
│   │       ├── value-objects/
│   │       │   ├── Result.ts
│   │       │   ├── DomainError.ts
│   │       │   └── ErrorType.ts
│   │       ├── events/
│   │       │   ├── DomainEvent.ts
│   │       │   └── IEventHandler.ts
│   │       └── exceptions/
│   │           ├── DomainException.ts
│   │           ├── AuthenticationException.ts
│   │           ├── AuthorizationException.ts
│   │           ├── RateLimitException.ts
│   │           ├── ResourceNotFoundException.ts
│   │           ├── ValidationException.ts
│   │           └── PathTraversalException.ts
│   │
│   ├── application/            # アプリケーション層
│   │   ├── auth/              # 認証ユースケース
│   │   │   ├── AuthenticationUseCase.ts
│   │   │   ├── TokenRefreshUseCase.ts
│   │   │   └── LogoutUseCase.ts
│   │   ├── api/               # APIユースケース
│   │   │   ├── APIAccessUseCase.ts
│   │   │   └── RateLimitUseCase.ts
│   │   ├── data/              # データユースケース
│   │   │   └── DataRetrievalUseCase.ts
│   │   ├── log/               # ログユースケース
│   │   │   ├── AuthLogUseCase.ts
│   │   │   └── APILogUseCase.ts
│   │   └── shared/            # 共有
│   │       ├── IEventBus.ts
│   │       └── IUseCase.ts
│   │
│   ├── infrastructure/         # インフラストラクチャ層
│   │   ├── auth/              # 認証実装
│   │   │   └── SupabaseAuthAdapter.ts
│   │   ├── api/               # API実装
│   │   │   ├── RateLimitRepositoryImpl.ts
│   │   │   └── APIEndpointRepositoryImpl.ts
│   │   ├── data/              # データ実装
│   │   │   └── FileSystemRepository.ts
│   │   ├── log/               # ログ実装
│   │   │   ├── AuthLogRepositoryImpl.ts
│   │   │   └── APILogRepositoryImpl.ts
│   │   ├── database/          # データベース
│   │   │   ├── SupabaseClient.ts
│   │   │   └── migrations/    # DBマイグレーション
│   │   │       ├── 001_initial_schema.sql
│   │   │       ├── 002_setup_cron_jobs.sql
│   │   │       └── 003_custom_access_token_hook.sql
│   │   ├── cache/             # キャッシュ
│   │   │   ├── OpenDataCache.ts
│   │   │   └── CacheKeyGenerator.ts
│   │   └── events/            # イベントバス
│   │       └── EventBusImpl.ts
│   │
│   ├── presentation/           # プレゼンテーション層
│   │   ├── api/               # REST API
│   │   │   ├── routes/        # ルート定義
│   │   │   │   ├── index.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── data.ts
│   │   │   │   └── health.ts
│   │   │   ├── middleware/    # ミドルウェア
│   │   │   │   ├── authentication.ts
│   │   │   │   ├── rateLimit.ts
│   │   │   │   ├── errorHandler.ts
│   │   │   │   └── requestLogger.ts
│   │   │   ├── schemas/       # リクエスト/レスポンススキーマ
│   │   │   │   ├── common.ts
│   │   │   │   ├── auth.ts
│   │   │   │   └── data.ts
│   │   │   └── plugins/       # Fastifyプラグイン
│   │   │       ├── cors.ts
│   │   │       ├── security.ts
│   │   │       ├── metrics.ts
│   │   │       └── errorTracking.ts
│   │   │
│   │   └── web/               # Webフロントエンド (Vite)
│   │       ├── index.html
│   │       ├── vite.config.ts
│   │       ├── src/
│   │       │   ├── main.ts
│   │       │   ├── App.tsx
│   │       │   ├── pages/
│   │       │   │   ├── Landing.tsx
│   │       │   │   └── Dashboard.tsx
│   │       │   ├── components/
│   │       │   │   ├── AuthButtons.tsx
│   │       │   │   └── LogoutButton.tsx
│   │       │   └── hooks/
│   │       │       └── useAuth.ts
│   │       └── public/
│   │           └── favicon.ico
│   │
│   ├── config/                 # 設定
│   │   ├── index.ts           # 設定エントリーポイント
│   │   ├── env.ts             # 環境変数
│   │   └── logger.ts          # ロガー設定
│   │
│   ├── types/                  # 型定義
│   │   ├── api.ts             # API関連の型
│   │   ├── fastify.d.ts       # Fastify拡張
│   │   └── env.d.ts           # 環境変数の型
│   │
│   └── index.ts               # アプリケーションエントリーポイント
│
├── scripts/                    # ビルドスクリプト
│   ├── generate-openapi.ts    # OpenAPI仕様生成
│   ├── build-docs.ts          # 静的ドキュメント生成
│   └── migrate.ts             # DBマイグレーション
│
├── templates/                  # テンプレート
│   └── api-docs.html          # APIドキュメントテンプレート
│
├── tests/                      # テスト
│   ├── unit/                  # 単体テスト
│   │   ├── domain/           # ドメイン層のテスト
│   │   ├── application/      # アプリケーション層のテスト
│   │   └── infrastructure/   # インフラ層のテスト
│   ├── integration/           # 統合テスト
│   │   ├── api/             # APIエンドポイントテスト
│   │   └── database/        # データベーステスト
│   └── e2e/                  # E2Eテスト
│       └── scenarios/        # テストシナリオ
│
├── data/                      # オープンデータファイル
│   ├── secure/               # セキュアデータ
│   │   └── 319985/
│   │       └── r5.json
│   └── public/               # パブリックデータ
│
├── dist/                      # ビルド成果物
│   ├── api/                  # APIビルド
│   ├── web/                  # Webビルド
│   ├── openapi.json          # 生成されたOpenAPI仕様
│   └── api-docs.html         # 生成されたAPIドキュメント
│
├── .env.example              # 環境変数サンプル
├── .gitignore               # Git除外設定
├── package.json             # NPMパッケージ定義
├── tsconfig.json            # TypeScript設定
├── vercel.json              # Vercelデプロイ設定
└── README.md                # プロジェクトREADME
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

`presentation/web/`にViteベースのSPAを配置：
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
      "@/domain/*": ["src/domain/*"],
      "@/application/*": ["src/application/*"],
      "@/infrastructure/*": ["src/infrastructure/*"],
      "@/presentation/*": ["src/presentation/*"],
      "@/config/*": ["src/config/*"],
      "@/types/*": ["src/types/*"]
    }
  }
}
```

使用例：
```typescript
import { AuthenticatedUser } from '@/domain/auth/value-objects/AuthenticatedUser'
import { AuthenticationUseCase } from '@/application/auth/AuthenticationUseCase'
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

1. `src/domain/[new-context]/`を作成
2. 対応するapplication、infrastructure層を追加
3. 必要に応じてpresentation層にルートを追加

### 新しいエンドポイントの追加

1. `src/presentation/api/routes/`に新しいルートファイル
2. 対応するスキーマを`schemas/`に定義
3. OpenAPI仕様を更新

### 新しい外部サービスの統合

1. `src/infrastructure/[service]/`にアダプター実装
2. ドメイン層にインターフェース定義
3. DIコンテナで実装を注入

## まとめ

このディレクトリ構造は：

- **DDDの原則**に基づいた明確なレイヤー分離
- **境界づけられたコンテキスト**による高凝集・疎結合
- **TypeScript/Fastify/Vercel**環境に最適化
- **将来の拡張性**を考慮した設計
- **開発効率**と**保守性**のバランス

を実現しています。各開発者はこの構造に従うことで、一貫性のあるコードベースを維持できます。