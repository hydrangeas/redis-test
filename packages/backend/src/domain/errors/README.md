# エラーハンドリング基盤

このディレクトリには、アプリケーション全体のエラーハンドリング基盤が含まれています。RFC 7807 (Problem Details for HTTP APIs) に準拠したエラーレスポンス形式を採用しています。

## 概要

- **RFC 7807準拠**: 標準化されたエラーレスポンス形式
- **ドメイン例外**: ビジネスロジック層で使用する型安全な例外クラス
- **Result型パターン**: 例外を投げない関数型エラーハンドリング
- **自動エラーマッピング**: ドメインエラーからHTTPレスポンスへの自動変換
- **パストラバーサル防御**: セキュリティ脅威の検出と防御

## 主要コンポーネント

### 1. DomainError
ビジネスロジック層で発生するエラーを表現する値オブジェクト。

```typescript
// エラーの作成
const error = DomainError.validation(
  'INVALID_EMAIL',
  'Email format is invalid',
  { field: 'email', value: 'invalid@' }
);

// Result型と組み合わせて使用
return Result.fail(error);
```

### 2. DomainException
スロー可能なドメイン例外クラス。特定のエラータイプに対応した具体的な例外クラスを提供。

```typescript
// 認証失敗
throw new AuthenticationException('google', 'Invalid token');

// レート制限
throw new RateLimitException(60, resetTime, 300);

// バリデーションエラー
throw new ValidationException('email', value, ['Must be valid email']);

// パストラバーサル検出
throw new PathTraversalException(attemptedPath, sanitizedPath);
```

### 3. Result型パターン
例外を投げずにエラーを扱うための関数型アプローチ。

```typescript
// 基本的な使用方法
function divide(a: number, b: number): Result<number> {
  if (b === 0) {
    return Result.fail(new Error('Division by zero'));
  }
  return Result.ok(a / b);
}

// チェーン操作
const result = divide(10, 2)
  .map(x => x * 2)
  .flatMap(x => divide(x, 5))
  .tap(x => console.log(`Result: ${x}`))
  .tapError(err => console.error(`Error: ${err.message}`));

// デフォルト値
const value = result.getValueOrDefault(0);

// Promise変換
const promise = result.toPromise();

// 非同期操作のラップ
const asyncResult = await Result.tryAsync(async () => {
  const data = await fetchData();
  return data;
});
```

### 4. ProblemDetails
RFC 7807準拠のエラーレスポンス形式。

```typescript
interface ProblemDetails {
  type: string;     // エラータイプのURI
  title: string;    // 人間が読めるエラータイトル
  status: number;   // HTTPステータスコード
  detail?: string;  // 詳細な説明
  instance?: string; // エラーが発生したリソースのURI
  [key: string]: any; // 拡張プロパティ
}
```

### 5. PathValidator
パストラバーサル攻撃を防ぐためのパス検証ユーティリティ。

```typescript
// パスの検証とサニタイズ
const safePath = PathValidator.validateAndSanitize(inputPath, basePath);

// 拡張子のチェック
if (PathValidator.isValidJsonPath(filePath)) {
  // JSONファイルとして処理
}
```

## エラーレスポンスの例

### バリデーションエラー
```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/api/auth/register",
  "errors": [
    {
      "field": "/email",
      "message": "must match format \"email\"",
      "params": { "format": "email" }
    }
  ]
}
```

### レート制限エラー
```json
{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Too many requests",
  "status": 429,
  "detail": "Too many requests",
  "instance": "/api/data/test.json",
  "limit": 60,
  "resetTime": "2024-01-01T12:00:00.000Z",
  "retryAfter": 300
}
```

### 認証エラー
```json
{
  "type": "https://api.example.com/errors/auth-failed",
  "title": "Authentication failed: Invalid token",
  "status": 401,
  "detail": "Authentication failed: Invalid token",
  "instance": "/api/auth/login"
}
```

## ベストプラクティス

### 1. エラーハンドリングの選択

**Result型を使用する場合:**
- 予期されるエラー（バリデーション、ビジネスルール違反）
- 複数のエラーを収集する必要がある場合
- 関数型プログラミングスタイルを採用している場合

**例外を使用する場合:**
- 予期しないエラー（システムエラー、プログラミングエラー）
- 即座に処理を中断する必要がある場合
- 既存のフレームワークとの統合

### 2. エラーコードの命名規則

- 大文字スネークケース: `USER_NOT_FOUND`, `INVALID_EMAIL`
- 意味が明確で一意であること
- ドメイン固有の用語を使用

### 3. エラーメッセージ

- ユーザー向け: 簡潔で理解しやすい
- 開発者向け: 詳細情報を`detail`や拡張プロパティに含める
- 機密情報を含めない

### 4. HTTPステータスコードのマッピング

- 400: バリデーションエラー、不正なリクエスト
- 401: 認証エラー
- 403: 認可エラー
- 404: リソース未発見
- 422: ビジネスルール違反
- 429: レート制限
- 500: 内部サーバーエラー
- 503: 外部サービスエラー