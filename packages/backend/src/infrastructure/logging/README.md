# ロギングインフラストラクチャ

このディレクトリには、アプリケーション全体のロギングインフラストラクチャが含まれています。

## 概要

- **Pinoロガー**: 高性能な構造化ログライブラリ
- **環境ベース設定**: LOG_LEVELによるログレベル制御
- **センシティブ情報の自動除去**: パスワード、トークンなどの機密情報を自動的にマスク
- **パフォーマンスメトリクス**: 操作の実行時間を自動計測
- **ドメインイベントロギング**: すべてのドメインイベントを自動的にログに記録

## 主要コンポーネント

### 1. logger.ts

- Pinoロガーの設定と初期化
- 環境に応じた設定（開発環境ではpretty-print）
- センシティブデータのredact設定

### 2. fastify-logger.ts

- Fastifyサーバー用のロガー設定
- リクエスト/レスポンスの自動ログ
- エラーハンドリング

### 3. metrics.ts

- パフォーマンス計測ユーティリティ
- 非同期/同期操作の実行時間測定
- 成功/失敗の自動記録

### 4. event-logger.ts

- ドメインイベントの自動ログ記録
- センシティブデータのサニタイズ
- EventBusとの統合

## 使用方法

### 基本的なロギング

```typescript
import { container } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Logger } from 'pino';

const logger = container.resolve<Logger>(DI_TOKENS.Logger);

// 通常のログ
logger.info('Operation completed');
logger.error({ err: error }, 'Operation failed');

// 構造化ログ
logger.info(
  {
    userId: 'user-123',
    action: 'data_access',
    resource: '/api/data/test.json',
  },
  'User accessed data',
);
```

### パフォーマンス計測

```typescript
import { measurePerformance } from '@/infrastructure/logging';

// 非同期操作の計測
const result = await measurePerformance(
  logger,
  'database_query',
  async () => {
    return await db.query('SELECT * FROM users');
  },
  { queryType: 'select', table: 'users' },
);

// 同期操作の計測
const data = measureSyncPerformance(logger, 'data_transformation', () => transformData(input), {
  dataSize: input.length,
});
```

### ドメインイベントロギング

ドメインイベントは自動的にログに記録されます：

```typescript
// イベントを発行すると自動的にログに記録される
await eventBus.publish(new UserAuthenticated(userId, provider, tier, ipAddress));

// ログ出力例：
// {
//   "event": {
//     "name": "UserAuthenticated",
//     "eventId": "evt-123",
//     "aggregateId": "user-456",
//     "occurredAt": "2024-01-01T00:00:00Z",
//     "data": {
//       "provider": "google",
//       "tier": "tier1",
//       "ipAddress": "127.0.0.1"
//     }
//   },
//   "context": "domain_event",
//   "msg": "Domain event: UserAuthenticated"
// }
```

## 設定

### 環境変数

- `LOG_LEVEL`: ログレベル（fatal, error, warn, info, debug, trace）
- `NODE_ENV`: 環境（development, staging, production）

### センシティブデータのマスク

以下のフィールドは自動的にマスクされます：

- `req.headers.authorization`
- `req.headers.cookie`
- `*.password`
- `*.token`
- `*.apiKey`
- `*.secret`
- `*.jwt`
- `*.accessToken`
- `*.refreshToken`

## ベストプラクティス

1. **構造化ログを使用する**: 文字列の連結ではなく、オブジェクトでデータを渡す
2. **適切なログレベルを使用する**:
   - `error`: エラーとスタックトレース
   - `warn`: 警告や潜在的な問題
   - `info`: 重要なビジネスイベント
   - `debug`: デバッグ情報
3. **パフォーマンスを計測する**: 重要な操作には`measurePerformance`を使用
4. **コンテキストを追加する**: ユーザーID、リクエストIDなどの追跡可能な情報を含める
