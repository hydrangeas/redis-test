# API Changelog

このドキュメントは、Open Data APIの変更履歴を記録しています。

## [1.0.0] - 2025-01-24

### 追加

- 初回リリース
- JWT認証機能
- データアクセスエンドポイント (`GET /api/v1/data/{path}`)
- トークンリフレッシュエンドポイント (`POST /api/v1/auth/refresh`)
- ログアウトエンドポイント (`POST /api/v1/auth/logout`)
- ヘルスチェックエンドポイント (`GET /health`, `GET /health/detailed`)
- Prometheusメトリクスエンドポイント (`GET /metrics`)
- ティアベースのレート制限（TIER1: 60/分、TIER2: 120/分、TIER3: 300/分）
- RFC 7807準拠のエラーレスポンス
- ETagを使用した条件付きリクエストサポート
- Scalar UIによるAPIドキュメント

### セキュリティ

- HTTPS/TLS 1.3サポート
- JWTトークンベース認証
- CORS設定
- セキュリティヘッダー（HSTS、X-Content-Type-Options等）
- パストラバーサル攻撃の防止

### パフォーマンス

- 5分間のレスポンスキャッシュ
- gzip圧縮サポート
- 条件付きリクエストによる帯域幅削減

## 今後の予定

### [1.1.0] - 2025年Q2予定

- CSV形式のサポート
- XML形式のサポート
- バッチデータ取得エンドポイント
- WebSocketによるリアルタイム更新通知
- GraphQL APIの追加

### [1.2.0] - 2025年Q3予定

- データフィルタリング機能
- データ集計API
- カスタムレート制限の設定
- APIキー認証のサポート

## 廃止予定

現在、廃止予定の機能はありません。

## マイグレーションガイド

### v0.x から v1.0.0へ

v1.0.0は初回リリースのため、マイグレーションは不要です。

---

フォーマットは[Keep a Changelog](https://keepachangelog.com/ja/1.0.0/)に準拠し、
バージョニングは[Semantic Versioning](https://semver.org/lang/ja/)に従います。
