# Health Check Endpoints

## Overview

ヘルスチェックエンドポイントは、アプリケーションの健全性を監視するために使用されます。複数のエンドポイントを提供し、異なるレベルの詳細情報を返します。

## Endpoints

### 1. Basic Health Check

**GET** `/health`

基本的なヘルスチェック。アプリケーションの全体的な健全性を返します。

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-06-14T12:00:00Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy"
    },
    "dataFiles": {
      "status": "healthy"
    },
    "cache": {
      "status": "healthy"
    }
  }
}
```

### 2. Detailed Health Check

**GET** `/api/v1/health/detailed`

詳細なヘルスチェック。システムメトリクスを含む詳細情報を返します。

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-06-14T12:00:00Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy"
    },
    "dataFiles": {
      "status": "healthy"
    },
    "cache": {
      "status": "healthy"
    }
  },
  "memory": {
    "used": 256,
    "total": 8192,
    "percentage": 3
  },
  "cpu": {
    "usage": 15
  }
}
```

### 3. Liveness Probe

**GET** `/api/v1/health/live`

Kubernetes liveness probe用。アプリケーションが動作しているかを確認。

**Response:**

```json
{
  "status": "ok"
}
```

### 4. Readiness Probe

**GET** `/api/v1/health/ready`

Kubernetes readiness probe用。アプリケーションがリクエストを受け付ける準備ができているかを確認。

**Response:**

```json
{
  "status": "ready",
  "checks": {
    "database": {
      "status": "healthy"
    },
    "dataFiles": {
      "status": "healthy"
    },
    "cache": {
      "status": "healthy"
    }
  }
}
```

## Status Values

- **healthy**: すべてのチェックが正常
- **degraded**: 一部のチェックが失敗しているが、サービスは利用可能
- **unhealthy**: 重要なチェックが失敗し、サービスが利用不可

## HTTP Status Codes

- **200 OK**: ヘルスチェック成功
- **503 Service Unavailable**: ヘルスチェック失敗

## Implementation Details

### Database Check

- Supabaseへの接続を確認
- 簡単なクエリを実行して応答を確認

### Data Files Check

- データディレクトリへのアクセスを確認
- index.jsonファイルの読み取り権限を確認

### Cache Check

- 現在は常に healthy を返す
- 将来的にRedis等を使用する場合は実装を更新

## Monitoring Integration

これらのエンドポイントは以下の監視ツールと統合できます：

- **Kubernetes**: liveness/readiness probe
- **Prometheus**: /metrics エンドポイント（将来実装）
- **CloudWatch**: カスタムメトリクス
- **Datadog**: ヘルスチェックモニター

## Best Practices

1. **頻度**: 基本的なヘルスチェックは30秒ごと
2. **タイムアウト**: 5秒以内にレスポンスを返す
3. **キャッシュ**: ヘルスチェック結果を短時間キャッシュ（5-10秒）
4. **アラート**: 連続3回失敗でアラート発火
