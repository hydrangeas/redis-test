# Open Data API Documentation

## 概要

Open Data APIは、奈良県のオープンデータをJSON形式で提供するRESTful Web APIサービスです。認証されたユーザーは、APIを通じて様々な統計データや公開情報にアクセスできます。

## 目次

1. [はじめに](#はじめに)
2. [認証](#認証)
3. [レート制限](#レート制限)
4. [エンドポイント](#エンドポイント)
5. [エラーハンドリング](#エラーハンドリング)
6. [クライアントライブラリ](#クライアントライブラリ)
7. [サンプルコード](#サンプルコード)
8. [API仕様書](#api仕様書)

## はじめに

### ベースURL

```
Production: https://api.example.com/api/v1
Staging:    https://staging-api.example.com/api/v1
Local:      http://localhost:3000/api/v1
```

### サポートされるデータ形式

現在はJSON形式のみサポートしています。将来的にCSVやXML形式もサポート予定です。

### HTTPメソッド

- `GET` - データの取得
- `POST` - 認証・ログアウト

## 認証

Open Data APIはJWT（JSON Web Token）ベースの認証を使用します。

### 認証フロー

1. Supabase Authでユーザー認証を行い、アクセストークンを取得
2. APIリクエストの`Authorization`ヘッダーにトークンを含める
3. トークンの有効期限が切れた場合は、リフレッシュトークンで更新

### ヘッダー形式

```http
Authorization: Bearer <your-access-token>
```

### トークンのリフレッシュ

```bash
curl -X POST https://api.example.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "your-refresh-token"}'
```

レスポンス:
```json
{
  "access_token": "new-access-token",
  "refresh_token": "new-refresh-token",
  "token_type": "bearer",
  "expires_in": 3600
}
```

## レート制限

APIリクエストはユーザーのティアに基づいて制限されます。

### ティア別制限

| ティア | リクエスト数/分 | 用途 |
|--------|----------------|------|
| TIER1 | 60 | 基本利用 |
| TIER2 | 120 | 標準利用 |
| TIER3 | 300 | ヘビーユーザー |

### レート制限ヘッダー

すべてのAPIレスポンスには以下のヘッダーが含まれます：

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1706007600
```

- `X-RateLimit-Limit` - 現在のティアの制限値
- `X-RateLimit-Remaining` - 残りリクエスト可能数
- `X-RateLimit-Reset` - 制限がリセットされるUnixタイムスタンプ

### レート制限超過時

制限を超えた場合、HTTP 429エラーが返されます：

```json
{
  "type": "https://example.com/errors/rate-limit-exceeded",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "API rate limit exceeded for TIER1"
}
```

`Retry-After`ヘッダーで再試行可能になるまでの秒数が示されます。

## エンドポイント

### 認証

#### POST /auth/refresh

トークンのリフレッシュ

**リクエスト:**
```json
{
  "refresh_token": "your-refresh-token"
}
```

**レスポンス:**
```json
{
  "access_token": "new-access-token",
  "refresh_token": "new-refresh-token",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### POST /auth/logout

ログアウト（要認証）

**レスポンス:** 204 No Content

### データアクセス

#### GET /data/{path}

指定されたパスのデータを取得

**パラメータ:**
- `path` - データファイルのパス（例: `secure/319985/r5.json`）

**ヘッダー（オプション）:**
- `If-None-Match` - 条件付きリクエスト用のETag

**レスポンス:**
```json
{
  "data": {
    "title": "令和5年度統計データ",
    "items": [
      { "項目": "人口", "値": 1324473 },
      { "項目": "世帯数", "値": 595534 }
    ]
  },
  "metadata": {
    "size": 2048,
    "lastModified": "2025-01-15T09:00:00Z",
    "etag": "33a64df551425fcc55e4d42a148795d9f25f89d4"
  }
}
```

### システム

#### GET /health

基本的なヘルスチェック（認証不要）

**レスポンス:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-23T10:30:00Z",
  "environment": "production",
  "region": "ap-northeast-1"
}
```

#### GET /health/detailed

詳細なヘルスチェック（認証不要）

**レスポンス:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-23T10:30:00Z",
  "uptime": 3600,
  "memory": {
    "rss": 104857600,
    "heapTotal": 73728000,
    "heapUsed": 45678900,
    "external": 1234567,
    "arrayBuffers": 123456
  },
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 15.5
    },
    "filesystem": {
      "status": "healthy"
    }
  }
}
```

#### GET /metrics

Prometheus形式のメトリクス（認証不要）

## エラーハンドリング

すべてのエラーレスポンスはRFC 7807 (Problem Details for HTTP APIs)に準拠しています。

### エラー形式

```json
{
  "type": "https://example.com/errors/error-type",
  "title": "Error Title",
  "status": 400,
  "detail": "Detailed error description",
  "instance": "/api/v1/specific/resource"
}
```

### 一般的なエラー

| ステータスコード | タイプ | 説明 |
|-----------------|--------|------|
| 400 | validation-failed | リクエストのバリデーションエラー |
| 401 | unauthorized | 認証エラー |
| 404 | not-found | リソースが見つからない |
| 429 | rate-limit-exceeded | レート制限超過 |
| 500 | internal-error | サーバー内部エラー |

## クライアントライブラリ

### JavaScript/TypeScript

```bash
npm install @example/opendata-api-client
```

```typescript
import { OpenDataAPIClient } from '@example/opendata-api-client';

const client = new OpenDataAPIClient({
  baseURL: 'https://api.example.com',
  auth: {
    token: 'your-jwt-token'
  }
});

// データ取得
try {
  const response = await client.data.get('secure/319985/r5.json');
  console.log(response.data);
  
  // レート制限情報
  console.log(client.rateLimit);
  // { limit: 60, remaining: 59, reset: Date }
} catch (error) {
  if (error.status === 429) {
    console.log(`Rate limit exceeded. Retry after ${error.retryAfter} seconds`);
  }
}
```

### Python

```bash
pip install opendata-api-client
```

```python
from opendata_api_client import OpenDataAPIClient

client = OpenDataAPIClient(
    base_url='https://api.example.com',
    token='your-jwt-token'
)

# データ取得
try:
    response = client.data.get('secure/319985/r5.json')
    print(response.data)
    
    # レート制限情報
    print(client.rate_limit)
    # RateLimit(limit=60, remaining=59, reset=datetime(...))
except RateLimitError as e:
    print(f"Rate limit exceeded. Retry after {e.retry_after} seconds")
```

## サンプルコード

### 基本的なデータ取得

```javascript
// Node.js with fetch
async function fetchData() {
  const response = await fetch('https://api.example.com/api/v1/data/secure/319985/r5.json', {
    headers: {
      'Authorization': 'Bearer your-jwt-token'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.title}: ${error.detail}`);
  }
  
  const result = await response.json();
  return result.data;
}
```

### 条件付きリクエスト（キャッシュ活用）

```javascript
let cachedETag = null;
let cachedData = null;

async function fetchDataWithCache() {
  const headers = {
    'Authorization': 'Bearer your-jwt-token'
  };
  
  if (cachedETag) {
    headers['If-None-Match'] = cachedETag;
  }
  
  const response = await fetch('https://api.example.com/api/v1/data/secure/319985/r5.json', {
    headers
  });
  
  if (response.status === 304) {
    // データは変更されていない
    return cachedData;
  }
  
  if (response.ok) {
    cachedETag = response.headers.get('ETag');
    const result = await response.json();
    cachedData = result.data;
    return cachedData;
  }
  
  throw new Error('Failed to fetch data');
}
```

### エラーハンドリングとリトライ

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // レート制限エラー
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`${error.title}: ${error.detail}`);
      }
      
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 指数バックオフ
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## API仕様書

### インタラクティブドキュメント

APIの詳細な仕様は、Scalar UIを使用したインタラクティブなドキュメントで確認できます：

- **Production**: https://api.example.com/api-docs
- **Local**: http://localhost:3000/api-docs

### OpenAPI仕様

OpenAPI 3.0形式の仕様書は以下から取得できます：

- **JSON形式**: https://api.example.com/api/v1/openapi.json
- **YAML形式**: https://api.example.com/api/v1/openapi.yaml

### Postmanコレクション

[Postmanコレクションをダウンロード](https://api.example.com/postman-collection.json)

## APIバージョニング

### バージョニング戦略

Open Data APIはURLパスベースのバージョニングを採用しています：

```
https://api.example.com/api/v1/...  # バージョン1
https://api.example.com/api/v2/...  # バージョン2（将来）
```

### 後方互換性

- マイナーバージョンアップでは後方互換性を維持
- 破壊的変更はメジャーバージョンアップ時のみ
- 廃止予定の機能は最低6ヶ月前に通知

### サポートポリシー

- 最新バージョン: フルサポート
- 1つ前のバージョン: セキュリティ修正のみ
- 2つ以上前のバージョン: サポート終了

## お問い合わせ

### サポート

- Email: api-support@example.com
- GitHub Issues: https://github.com/example/opendata-api/issues

### ステータスページ

- https://status.example.com

### 変更履歴

APIの変更履歴は[CHANGELOG](./CHANGELOG.md)をご覧ください。