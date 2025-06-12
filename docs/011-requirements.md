# プロジェクト要求仕様

本ファイルに記載された内容を「プロジェクト要求仕様」と定義します。
例えば、『プロジェクト要求仕様の通りに実装する』とは、本ファイルの仕様を実装することを指します。

## プロジェクト名

オープンデータ提供API

## プロジェクトの機能

- Web APIを提供します
- 提供するデータは奈良県のオープンデータです
  - 例えば [https://www.pref.nara.jp/secure/319985/r5.xls] というデータがある場合、 [https://www.pref.nara.info/secure/319985/r5.json] という形式で提供します
  - ドメインについては変更可能であるものとします（アプリケーションで設定することは避けてください）
  - データは事前に用意されたJSON形式のファイルを使用します（データ変換は別プロジェクトで実施）
- APIの利用には認証が必要です
- Webページの構成
  - トップページ（Vite+TypeScript）
    - プロジェクトの概要説明を表示
    - APIドキュメントへのリンクを表示
    - 未認証時：ログイン/サインアップボタンを表示
    - 認証済み時：ダッシュボードへのリンクとログアウトボタンを表示
    - ログイン/サインアップボタンクリック時はSupabase Authへリダイレクト
  - ダッシュボードページ（認証後・Vite+TypeScript）
    - ログアウト機能のみを提供
    - ログアウト後はトップページにリダイレクト
  - APIドキュメントページ（/api-docs）
    - Scalarで生成された静的APIドキュメントを表示
    - 認証不要でアクセス可能
- APIはJWTによる認証を必須とします
  - アクセストークンの有効期限：1時間
  - リフレッシュトークンの有効期限：30日間
- ユーザーロールによるアクセス制御を実装します
  - 一般ユーザーを複数のティア（tier1、tier2、tier3）に分類します
  - 新規ユーザーはtier1からスタートします
  - ティア情報はSupabase Authのユーザーメタデータ（app_metadata）に保存します
  - Custom Access Token Hookを使用してJWTにティア情報を自動的に含めます
    - JWT発行時に実行されるPostgreSQL関数として実装
    - 初回ユーザーの場合は自動的にtier1を設定
    - 既存ユーザーの場合はapp_metadataからtier情報を読み取り
    - tier情報をJWTのカスタムクレームに追加
  - 各ティアごとにAPIレート制限（1分間あたりのアクセス回数）を制御します
    - 設定ファイルで変更可能とします
    - デフォルト値：tier1は1分間に60回まで
    - レート制限を超えた場合：
      - HTTP 429 (Too Many Requests) を返します
      - 次にリクエスト可能になるまでの時間情報を含めます
- APIエラーレスポンス
  - データが存在しない場合はHTTP 404 (Not Found)を返します
  - エラーレスポンスはRFC 7807 (Problem Details for HTTP APIs)に準拠した形式とします
  - エラーレスポンスの例：

    ```json
    {
      "type": "https://example.com/errors/not-found",
      "title": "Resource not found",
      "status": 404,
      "detail": "The requested data file does not exist",
      "instance": "/secure/319985/r5.json"
    }
    ```

  - エラーレスポンスもAPIレート制限のリクエスト数にカウントされます
- セキュリティ要件
  - JWTトークンはAuthorizationヘッダーで送信（Bearer形式）
  - すべての通信はHTTPS/TLS 1.3以上で暗号化
  - CORS（Cross-Origin Resource Sharing）設定を実装
    - 許可するオリジンは設定ファイルで管理
  - 入力検証とサニタイゼーション
    - APIパスパラメータの検証（パストラバーサル攻撃の防止）
    - 不正な文字列のサニタイゼーション
  - セキュリティヘッダーの設定
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - Strict-Transport-Security（HSTS）
  - APIアクセスログの記録
    - 認証成功/失敗のログ
    - レート制限違反のログ
    - 不正なアクセスパターンの検知用

## 補足事項

- APIは認証が必要です
- 認証にはSupabase Authを使用します
  - Supabase Auth UIコンポーネントを使用してプロバイダー選択画面を提供
  - 対応プロバイダー：Google、GitHub等
  - ユーザー管理はSupabase Authに完全委任（アプリケーション側でのユーザー作成処理は不要）
- APIはFastifyライブラリを使用します
- データストレージ
  - JSONファイルはローカルファイルシステムに保存
  - アプリケーションと一緒にデプロイされる
  - ファイル配置は `/data/` ディレクトリ配下にURLパスと同じ構造で保存
    - 例：URLが `/secure/319985/r5.json` の場合、ファイルパスは `/data/secure/319985/r5.json`
- デプロイ環境
  - Vercelへのデプロイを想定
- レート制限の実装
  - Supabaseのデータベースを使用してレート制限のカウント情報を保存
- APIドキュメント
  - OpenAPI 3.0仕様に準拠したAPIドキュメントを自動生成
  - ScalarでAPIドキュメントを閲覧可能にする（モダンなUI、ブラウザから直接APIテスト可能）
  - 認証不要でドキュメントは閲覧可能
