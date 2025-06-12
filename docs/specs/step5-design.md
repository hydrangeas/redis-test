# 静的モデリング

## ドメインモデル図

### 認証コンテキスト

```mermaid
classDiagram
    %% 集約の境界
    class Authentication {
        <<Aggregate>>
    }
    
    %% エンティティ
    class UserSession {
        <<Entity>>
        +UserId userId
        +SessionId sessionId
        +UserTier tier
        +AccessToken accessToken
        +RefreshToken refreshToken
        +DateTime createdAt
        +DateTime expiresAt
        +isValid()
        +refresh(newTokens)
        +terminate()
    }
    
    %% バリューオブジェクト
    class UserId {
        <<Value Object>>
        +String value
        +equals()
        +hashCode()
    }
    
    class UserTier {
        <<Value Object>>
        +TierLevel level
        +RateLimit rateLimit
        +equals()
        +isHigherThan(other)
    }
    
    class AccessToken {
        <<Value Object>>
        +String token
        +DateTime expiresAt
        +isExpired()
        +equals()
    }
    
    class RefreshToken {
        <<Value Object>>
        +String token
        +DateTime expiresAt
        +isExpired()
        +equals()
    }
    
    %% ドメインサービス
    class AuthenticationService {
        <<Domain Service>>
        +authenticateWithProvider(provider, credentials)
        +validateAccessToken(token)
        +refreshTokens(refreshToken)
    }
    
    %% リポジトリインターフェース
    class UserSessionRepository {
        <<Repository>>
        +save(session)
        +findByUserId(userId)
        +findByAccessToken(token)
        +remove(sessionId)
    }
    
    %% ファクトリ
    class UserSessionFactory {
        <<Factory>>
        +createFromAuthResult(authResult)
        +reconstruct(data)
    }
    
    %% 関係性
    Authentication *-- UserSession : contains
    UserSession *-- UserId : has
    UserSession *-- UserTier : has
    UserSession *-- AccessToken : has
    UserSession *-- RefreshToken : has
    AuthenticationService ..> Authentication : uses
    UserSessionRepository ..> Authentication : persists
    UserSessionFactory ..> Authentication : creates
```

### APIコンテキスト

```mermaid
classDiagram
    %% 集約
    class APIRequest {
        <<Aggregate>>
    }
    
    class RateLimiting {
        <<Aggregate>>
    }
    
    %% エンティティ
    class APIEndpoint {
        <<Entity>>
        +EndpointId id
        +APIPath path
        +HttpMethod method
        +UserTier requiredTier
        +validateAccess(userTier)
        +processRequest(params)
    }
    
    class RateLimitBucket {
        <<Entity>>
        +BucketId id
        +UserId userId
        +WindowStart windowStart
        +RequestCount count
        +RateLimit limit
        +tryConsume()
        +reset()
        +isExceeded()
    }
    
    %% バリューオブジェクト
    class APIPath {
        <<Value Object>>
        +String value
        +equals()
        +matchesPattern(pattern)
    }
    
    class HttpMethod {
        <<Value Object>>
        +String method
        +equals()
        +isAllowed()
    }
    
    class RequestCount {
        <<Value Object>>
        +int value
        +increment()
        +equals()
    }
    
    class RateLimit {
        <<Value Object>>
        +int maxRequests
        +Duration window
        +equals()
    }
    
    %% ドメインサービス
    class APIAccessControlService {
        <<Domain Service>>
        +checkRateLimit(userId, endpoint)
        +validateTierAccess(userTier, requiredTier)
    }
    
    %% リポジトリインターフェース
    class APIEndpointRepository {
        <<Repository>>
        +findByPath(path)
        +listAll()
    }
    
    class RateLimitRepository {
        <<Repository>>
        +save(bucket)
        +findByUserId(userId)
        +removeExpired()
    }
    
    %% 関係性
    APIRequest *-- APIEndpoint : contains
    RateLimiting *-- RateLimitBucket : contains
    APIEndpoint *-- APIPath : has
    APIEndpoint *-- HttpMethod : has
    APIEndpoint *-- UserTier : requires
    RateLimitBucket *-- UserId : belongs to
    RateLimitBucket *-- RequestCount : tracks
    RateLimitBucket *-- RateLimit : enforces
    APIAccessControlService ..> APIRequest : uses
    APIAccessControlService ..> RateLimiting : uses
    APIEndpointRepository ..> APIRequest : persists
    RateLimitRepository ..> RateLimiting : persists
```

### データコンテキスト

```mermaid
classDiagram
    %% 集約
    class DataResource {
        <<Aggregate>>
    }
    
    %% エンティティ
    class OpenDataFile {
        <<Entity>>
        +FileId id
        +FilePath path
        +ContentType contentType
        +FileSize size
        +LastModified lastModified
        +exists()
        +getContent()
    }
    
    %% バリューオブジェクト
    class FilePath {
        <<Value Object>>
        +String value
        +equals()
        +isValid()
        +toSystemPath()
    }
    
    class ContentType {
        <<Value Object>>
        +String mimeType
        +equals()
        +isJson()
    }
    
    class FileSize {
        <<Value Object>>
        +long bytes
        +equals()
        +toHumanReadable()
    }
    
    %% ドメインサービス
    class DataAccessService {
        <<Domain Service>>
        +retrieveData(path)
        +validatePath(path)
    }
    
    %% リポジトリインターフェース
    class OpenDataRepository {
        <<Repository>>
        +findByPath(path)
        +exists(path)
        +getContent(fileId)
    }
    
    %% ファクトリ
    class OpenDataFactory {
        <<Factory>>
        +createFromPath(path)
        +reconstruct(metadata)
    }
    
    %% 関係性
    DataResource *-- OpenDataFile : contains
    OpenDataFile *-- FilePath : has
    OpenDataFile *-- ContentType : has
    OpenDataFile *-- FileSize : has
    DataAccessService ..> DataResource : uses
    OpenDataRepository ..> DataResource : persists
    OpenDataFactory ..> DataResource : creates
```

### ログコンテキスト

```mermaid
classDiagram
    %% 集約
    class AuthenticationLog {
        <<Aggregate>>
    }
    
    class APIAccessLog {
        <<Aggregate>>
    }
    
    %% エンティティ
    class AuthLogEntry {
        <<Entity>>
        +LogId id
        +UserId userId
        +AuthEvent event
        +Provider provider
        +IPAddress ipAddress
        +UserAgent userAgent
        +DateTime timestamp
        +AuthResult result
    }
    
    class APILogEntry {
        <<Entity>>
        +LogId id
        +RequestId requestId
        +UserId userId
        +APIPath path
        +HttpMethod method
        +StatusCode statusCode
        +ResponseTime responseTime
        +DateTime timestamp
    }
    
    %% バリューオブジェクト
    class AuthEvent {
        <<Value Object>>
        +EventType type
        +equals()
        +isSuccessful()
    }
    
    class Provider {
        <<Value Object>>
        +String name
        +equals()
        +isSupported()
    }
    
    class IPAddress {
        <<Value Object>>
        +String value
        +equals()
        +isValid()
        +anonymize()
    }
    
    class StatusCode {
        <<Value Object>>
        +int code
        +equals()
        +isSuccess()
        +isError()
    }
    
    class ResponseTime {
        <<Value Object>>
        +long milliseconds
        +equals()
        +toSeconds()
    }
    
    %% ドメインサービス
    class LogAnalysisService {
        <<Domain Service>>
        +detectSuspiciousActivity(userId)
        +calculateAPIUsageStats(timeRange)
        +generateSecurityReport()
    }
    
    %% リポジトリインターフェース
    class AuthLogRepository {
        <<Repository>>
        +save(logEntry)
        +findByUserId(userId, timeRange)
        +findByEvent(event, timeRange)
    }
    
    class APILogRepository {
        <<Repository>>
        +save(logEntry)
        +findByUserId(userId, timeRange)
        +findByPath(path, timeRange)
        +calculateStats(criteria)
    }
    
    %% 関係性
    AuthenticationLog *-- AuthLogEntry : contains
    APIAccessLog *-- APILogEntry : contains
    AuthLogEntry *-- UserId : references
    AuthLogEntry *-- AuthEvent : has
    AuthLogEntry *-- Provider : has
    AuthLogEntry *-- IPAddress : has
    APILogEntry *-- UserId : references
    APILogEntry *-- APIPath : has
    APILogEntry *-- HttpMethod : has
    APILogEntry *-- StatusCode : has
    APILogEntry *-- ResponseTime : has
    LogAnalysisService ..> AuthenticationLog : analyzes
    LogAnalysisService ..> APIAccessLog : analyzes
    AuthLogRepository ..> AuthenticationLog : persists
    APILogRepository ..> APIAccessLog : persists
```

### ドキュメントコンテキスト

```mermaid
classDiagram
    %% 集約
    class APIDocumentation {
        <<Aggregate>>
    }
    
    %% エンティティ
    class APISpecification {
        <<Entity>>
        +SpecId id
        +Version version
        +OpenAPISchema schema
        +LastUpdated lastUpdated
        +render()
        +validate()
    }
    
    %% バリューオブジェクト
    class Version {
        <<Value Object>>
        +String value
        +equals()
        +isCompatible(other)
    }
    
    class OpenAPISchema {
        <<Value Object>>
        +Object definition
        +equals()
        +toJSON()
        +validate()
    }
    
    %% ドメインサービス
    class DocumentationService {
        <<Domain Service>>
        +generateFromEndpoints(endpoints)
        +renderUI(specification)
    }
    
    %% リポジトリインターフェース
    class APISpecificationRepository {
        <<Repository>>
        +save(specification)
        +findLatest()
        +findByVersion(version)
    }
    
    %% 関係性
    APIDocumentation *-- APISpecification : contains
    APISpecification *-- Version : has
    APISpecification *-- OpenAPISchema : has
    DocumentationService ..> APIDocumentation : uses
    APISpecificationRepository ..> APIDocumentation : persists
```

### ドメインモデルの説明

1. **認証集約（Authentication）**
   - 集約ルート：UserSession
   - 責務：ユーザーセッションとトークンの管理、ティア情報の保持
   - 不変条件：有効なセッションは必ず有効なアクセストークンを持つ

2. **API集約（APIRequest）**
   - 集約ルート：APIEndpoint
   - 責務：APIエンドポイントの定義とアクセス制御
   - 不変条件：各エンドポイントは必要なティアレベルを定義する

3. **レート制限集約（RateLimiting）**
   - 集約ルート：RateLimitBucket
   - 責務：ユーザーごとのAPI利用回数の管理
   - 不変条件：リクエスト数は制限値を超えることができない

4. **データ集約（DataResource）**
   - 集約ルート：OpenDataFile
   - 責務：オープンデータファイルの管理とアクセス
   - 不変条件：存在しないファイルへのアクセスは許可されない

5. **認証ログ集約（AuthenticationLog）**
   - 集約ルート：AuthLogEntry
   - 責務：認証イベントの記録と監査証跡の保持
   - 不変条件：ログエントリは不変（作成後の変更不可）

6. **APIログ集約（APIAccessLog）**
   - 集約ルート：APILogEntry
   - 責務：APIアクセスの記録とパフォーマンス分析
   - 不変条件：ログエントリは不変（作成後の変更不可）

7. **ドキュメント集約（APIDocumentation）**
   - 集約ルート：APISpecification
   - 責務：API仕様の管理とドキュメント生成
   - 不変条件：仕様は有効なOpenAPI形式である必要がある

## レイヤードアーキテクチャ図

```mermaid
graph TB
    subgraph "プレゼンテーション層"
        API[REST API<br/>Fastify Routes]
        Web[Web UI<br/>Scalar Docs]
        MW[Middleware<br/>Auth/CORS/Rate Limit]
    end
    
    subgraph "アプリケーション層"
        AuthUseCase[認証ユースケース]
        APIUseCase[APIアクセスユースケース]
        DataUseCase[データ取得ユースケース]
        LogUseCase[ログ記録ユースケース]
        DocUseCase[ドキュメント生成ユースケース]
    end
    
    subgraph "ドメイン層"
        AuthDomain[認証ドメイン<br/>UserSession/UserTier]
        APIDomain[APIドメイン<br/>Endpoint/RateLimit]
        DataDomain[データドメイン<br/>OpenDataFile]
        LogDomain[ログドメイン<br/>AuthLog/APILog]
        DocDomain[ドキュメントドメイン<br/>APISpec]
        DomainService[ドメインサービス]
        Repository[リポジトリインターフェース]
        DomainEvent[ドメインイベント]
    end
    
    subgraph "インフラストラクチャ層"
        SupabaseAuth[Supabase Auth<br/>Adapter]
        SupabaseDB[(Supabase DB)]
        FileSystem[File System<br/>Adapter]
        EventBus[Event Bus<br/>Implementation]
        RepositoryImpl[リポジトリ実装]
        Cache[Cache Layer<br/>Memory/Edge]
    end
    
    %% 依存関係
    API --> MW
    MW --> AuthUseCase
    API --> APIUseCase
    API --> DataUseCase
    Web --> DocUseCase
    
    AuthUseCase --> AuthDomain
    APIUseCase --> APIDomain
    DataUseCase --> DataDomain
    LogUseCase --> LogDomain
    DocUseCase --> DocDomain
    
    AuthUseCase --> Repository
    APIUseCase --> Repository
    DataUseCase --> Repository
    LogUseCase --> Repository
    
    AuthDomain --> DomainService
    APIDomain --> DomainService
    AuthDomain --> DomainEvent
    APIDomain --> DomainEvent
    
    RepositoryImpl -.-> Repository
    RepositoryImpl --> SupabaseDB
    RepositoryImpl --> FileSystem
    RepositoryImpl --> Cache
    
    SupabaseAuth -.-> AuthUseCase
    EventBus -.-> DomainEvent
    
    %% スタイル
    classDef presentation fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef application fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef domain fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef infrastructure fill:#efebe9,stroke:#3e2723,stroke-width:2px
    
    class API,Web,MW presentation
    class AuthUseCase,APIUseCase,DataUseCase,LogUseCase,DocUseCase application
    class AuthDomain,APIDomain,DataDomain,LogDomain,DocDomain,DomainService,Repository,DomainEvent domain
    class SupabaseAuth,SupabaseDB,FileSystem,EventBus,RepositoryImpl,Cache infrastructure
```

### アーキテクチャの説明

1. **依存関係の方向**
   - 上位層から下位層への依存のみ許可
   - ドメイン層は他の層に依存しない
   - インフラ層はドメイン層のインターフェースを実装（DIP）

2. **各層の責務**
   - プレゼンテーション層：HTTPリクエスト/レスポンスの処理、認証の検証
   - アプリケーション層：ユースケースの調整、トランザクション管理
   - ドメイン層：ビジネスロジック、ドメインイベントの発行
   - インフラ層：外部システム連携、永続化、キャッシュ

3. **TypeScript/Fastifyでの実装**
   - Fastifyプラグインアーキテクチャを活用
   - 依存性注入にTSyringeまたはInversifyJSを使用
   - 型安全性を最大限に活用

## 境界づけられたコンテキスト統合図

```mermaid
graph LR
    subgraph "認証コンテキスト"
        AuthService[認証サービス]
        AuthModel[UserSession]
        ACL[Supabase Auth ACL]
    end
    
    subgraph "APIコンテキスト"
        APIService[APIサービス]
        APIModel[Endpoint/RateLimit]
    end
    
    subgraph "データコンテキスト"
        DataService[データサービス]
        DataModel[OpenDataFile]
    end
    
    subgraph "ログコンテキスト"
        LogService[ログサービス]
        AuthLogModel[AuthLog]
        APILogModel[APILog]
    end
    
    subgraph "ドキュメントコンテキスト"
        DocService[ドキュメントサービス]
        DocModel[APISpecification]
    end
    
    subgraph "外部システム"
        SupabaseAuth[Supabase Auth]
        SocialProvider[Social Providers]
        UISystem[UI System]
    end
    
    %% 統合パターン
    AuthService --> APIService
    APIService --> DataService
    APIService --> DocService
    
    SupabaseAuth --> ACL
    ACL --> AuthModel
    SocialProvider --> SupabaseAuth
    UISystem --> AuthService
    UISystem --> APIService
    
    %% イベント駆動
    AuthModel -.->|UserAuthenticated| EventBus[Event Bus]
    APIModel -.->|APIAccessed| EventBus
    EventBus -.->|Events| LogService
    
    %% 同期的な統合
    APIService -->|OpenAPI Spec| DocService
```

### 統合パターンの説明

1. **腐敗防止層（ACL）**
   - Supabase Authとの統合にACLを使用
   - 外部システムの変更から内部ドメインを保護

2. **上流/下流関係**
   - 認証コンテキスト → APIコンテキスト（認証情報の提供）
   - APIコンテキスト → データコンテキスト（データアクセス）

3. **イベント駆動統合**
   - 認証イベント、APIアクセスイベントを非同期で配信
   - ログコンテキストがイベントを購読して記録

4. **公開ホストサービス**
   - APIコンテキストがOpenAPI仕様を公開
   - ドキュメントコンテキストが仕様を読み取り

## シーケンス図 <API認証とデータ取得処理>

```mermaid
sequenceDiagram
    participant Client as クライアント
    participant MW as Middleware
    participant AuthApp as 認証ユースケース
    participant APIApp as APIユースケース
    participant DataApp as データユースケース
    participant LogApp as ログユースケース
    participant AuthDomain as 認証ドメイン
    participant APIDomain as APIドメイン
    participant DataDomain as データドメイン
    participant AuthRepo as 認証リポジトリ(I)
    participant RateRepo as レート制限リポジトリ(I)
    participant DataRepo as データリポジトリ(I)
    participant LogRepo as ログリポジトリ(I)
    participant EventBus as イベントバス
    participant DB as Supabase DB
    participant FS as File System
    
    Note over MW,DB: 初期化時：DIコンテナで各リポジトリ実装を注入
    
    Client->>MW: GET /secure/319985/r5.json<br/>Authorization: Bearer token
    MW->>AuthApp: validateToken(token)
    AuthApp->>AuthDomain: validateAccessToken(token)
    AuthDomain->>AuthRepo: findByAccessToken(token)
    AuthRepo->>DB: SELECT * FROM sessions
    DB-->>AuthRepo: session data
    AuthRepo-->>AuthDomain: UserSession
    AuthDomain-->>AuthApp: ValidationResult(userId, tier)
    
    alt トークンが無効
        AuthApp-->>MW: Unauthorized
        MW-->>Client: 401 Unauthorized
        MW->>LogApp: 認証失敗ログ記録
    else トークンが有効
        AuthApp-->>MW: Authorized(userId, tier)
        MW->>APIApp: checkAccess(userId, tier, path)
        APIApp->>APIDomain: validateAccess(tier, endpoint)
        APIDomain->>RateRepo: findByUserId(userId)
        RateRepo->>DB: SELECT * FROM rate_limits
        DB-->>RateRepo: bucket data
        RateRepo-->>APIDomain: RateLimitBucket
        APIDomain->>APIDomain: tryConsume()
        
        alt レート制限超過
            APIDomain-->>APIApp: RateLimitExceeded
            APIApp-->>MW: TooManyRequests
            MW-->>Client: 429 Too Many Requests
        else レート制限OK
            APIDomain->>RateRepo: save(bucket)
            APIDomain-->>APIApp: AccessGranted
            
            MW->>DataApp: getData(path)
            DataApp->>DataDomain: retrieveData(path)
            DataDomain->>DataRepo: findByPath(path)
            DataRepo->>FS: readFile(/data/secure/...)
            
            alt ファイルが存在しない
                FS-->>DataRepo: FileNotFound
                DataRepo-->>DataDomain: null
                DataDomain-->>DataApp: DataNotFound
                DataApp-->>MW: NotFound
                MW-->>Client: 404 Not Found (RFC 7807)
            else ファイルが存在
                FS-->>DataRepo: file content
                DataRepo-->>DataDomain: OpenDataFile
                DataDomain-->>DataApp: DataContent
                DataApp-->>MW: Success(content)
                MW-->>Client: 200 OK + JSON data
            end
            
            %% イベント発行
            APIDomain->>EventBus: publish(APIAccessedEvent)
            EventBus->>LogApp: handle(APIAccessedEvent)
            LogApp->>LogRepo: save(APILogEntry)
            LogRepo->>DB: INSERT INTO api_logs
        end
    end
    
    %% mermaid記載上の【重要】注意点
    %% 1. スタイル定義中のカンマの前後には空白を入れないでください
    %% 2. クラス定義中のカンマの前後には空白を入れないでください
    %% 3. 【厳禁】行末にコメントを追加しないでください
```

### シーケンスの説明

1. **レイヤー間の責務分担**
   - Middleware：認証トークンの抽出、HTTPレスポンスの生成
   - アプリケーション層：ユースケースの調整、エラーハンドリング
   - ドメイン層：ビジネスロジック（認証、レート制限、データアクセス）
   - インフラ層：永続化、ファイルシステムアクセス

2. **依存性逆転の原則（DIP）の適用**
   - ドメイン層はリポジトリインターフェースのみに依存
   - インフラ層がドメイン層のインターフェースを実装
   - DIコンテナ（TSyringe/InversifyJS）で実装を注入
   - これにより、テスト時にモック実装への差し替えが容易

3. **エラー処理とレスポンス**
   - 認証エラー：401 Unauthorized
   - レート制限：429 Too Many Requests
   - データ不在：404 Not Found（RFC 7807形式）

4. **非同期イベント処理**
   - ドメインイベントをEventBus経由で非同期配信
   - ログ記録は本処理と独立して実行

## ステートマシン図 <UserSession>

```mermaid
stateDiagram-v2
    [*] --> 新規作成: ソーシャルログイン成功
    新規作成 --> アクティブ: トークン発行
    
    アクティブ --> アクティブ: APIアクセス
    アクティブ --> 期限切れ: アクセストークン期限切れ
    アクティブ --> 終了: ログアウト
    
    期限切れ --> アクティブ: トークンリフレッシュ成功
    期限切れ --> 無効: リフレッシュトークン期限切れ
    期限切れ --> 終了: ログアウト
    
    無効 --> 終了: セッション削除
    終了 --> [*]
    
    %% 状態の説明
    新規作成: 認証直後・トークン未発行
    アクティブ: 有効なアクセストークンあり
    期限切れ: アクセストークン期限切れ・リフレッシュ可能
    無効: 両トークン期限切れ
    終了: セッション終了
    
    %% mermaid記載上の【重要】注意点
    %% 1. スタイル定義中のカンマの前後には空白を入れないでください
    %% 2. クラス定義中のカンマの前後には空白を入れないでください
    %% 3. 【厳禁】行末にコメントを追加しないでください
```

## ステートマシン図 <RateLimitBucket>

```mermaid
stateDiagram-v2
    [*] --> 新規作成: 初回APIアクセス
    新規作成 --> 使用中: リクエスト処理
    
    使用中 --> 使用中: リクエスト追加（制限内）
    使用中 --> 制限到達: リクエスト数=制限値
    使用中 --> リセット済み: 時間窓終了
    
    制限到達 --> 制限到達: リクエスト拒否
    制限到達 --> リセット済み: 時間窓終了
    
    リセット済み --> 使用中: 新規リクエスト
    リセット済み --> 削除: 長期間未使用
    
    削除 --> [*]
    
    %% 状態の説明
    新規作成: バケット作成直後
    使用中: リクエスト数 < 制限値
    制限到達: リクエスト数 = 制限値
    リセット済み: 時間窓リセット後
    削除: メモリから削除
    
    %% mermaid記載上の【重要】注意点
    %% コメントは独立した行に記述
```

### 状態遷移の説明

1. **UserSessionの状態遷移**
   - 新規作成：ソーシャルログイン成功時
   - アクティブ：有効なアクセストークンを保持
   - 期限切れ：アクセストークンは無効だがリフレッシュ可能
   - 無効：両方のトークンが期限切れ
   - 終了：ログアウトまたはセッション削除

2. **RateLimitBucketの状態遷移**
   - 新規作成：ユーザーの初回APIアクセス時
   - 使用中：制限値未満のリクエスト数
   - 制限到達：制限値に到達（新規リクエスト拒否）
   - リセット済み：時間窓経過後のリセット
   - 削除：長期間未使用時のメモリ解放

## クラス図 <認証コンテキスト>

```mermaid
classDiagram
    %% ドメイン層
    class UserSession {
        <<Entity>>
        -UserId userId
        -SessionId sessionId
        -UserTier tier
        -AccessToken accessToken
        -RefreshToken refreshToken
        -DateTime createdAt
        -DateTime expiresAt
        +isValid() boolean
        +refresh(tokens) void
        +terminate() void
    }
    
    class UserTier {
        <<Value Object>>
        -TierLevel level
        -RateLimit rateLimit
        +equals(other) boolean
        +isHigherThan(other) boolean
        +getRateLimit() RateLimit
    }
    
    class AuthenticationService {
        <<Domain Service>>
        +authenticateWithProvider(provider, credentials) AuthResult
        +validateAccessToken(token) ValidationResult
        +refreshTokens(refreshToken) TokenPair
    }
    
    class IUserSessionRepository {
        <<interface>>
        +save(session) Promise~void~
        +findByUserId(userId) Promise~UserSession~
        +findByAccessToken(token) Promise~UserSession~
        +remove(sessionId) Promise~void~
    }
    
    %% アプリケーション層
    class AuthenticationUseCase {
        <<Application Service>>
        -sessionRepository IUserSessionRepository
        -authService AuthenticationService
        -eventBus IEventBus
        +authenticate(provider, credentials) Promise~AuthResponse~
        +validateToken(token) Promise~ValidationResponse~
        +refreshToken(refreshToken) Promise~TokenResponse~
        +logout(userId) Promise~void~
    }
    
    %% インフラ層
    class UserSessionRepositoryImpl {
        <<Repository Implementation>>
        -supabaseClient SupabaseClient
        -cache ICache
        +save(session) Promise~void~
        +findByUserId(userId) Promise~UserSession~
        +findByAccessToken(token) Promise~UserSession~
        +remove(sessionId) Promise~void~
    }
    
    class SupabaseAuthAdapter {
        <<Infrastructure Service>>
        -supabaseClient SupabaseClient
        +signInWithProvider(provider) Promise~AuthResult~
        +verifyToken(token) Promise~TokenData~
        +refreshSession(refreshToken) Promise~Session~
    }
    
    %% 関係性
    UserSession *-- UserTier
    AuthenticationUseCase ..> UserSession
    AuthenticationUseCase ..> AuthenticationService
    AuthenticationUseCase ..> IUserSessionRepository
    UserSessionRepositoryImpl ..|> IUserSessionRepository
    AuthenticationService ..> UserSession
    AuthenticationUseCase ..> SupabaseAuthAdapter
    
    %% mermaid記載上の【重要】注意点
    %% コメントは独立した行に記述
```

## クラス図 <APIコンテキスト>

```mermaid
classDiagram
    %% ドメイン層
    class APIEndpoint {
        <<Entity>>
        -EndpointId id
        -APIPath path
        -HttpMethod method
        -UserTier requiredTier
        +validateAccess(userTier) boolean
        +matchesRequest(path, method) boolean
    }
    
    class RateLimitBucket {
        <<Entity>>
        -BucketId id
        -UserId userId
        -WindowStart windowStart
        -RequestCount count
        -RateLimit limit
        +tryConsume() ConsumeResult
        +reset() void
        +isExpired() boolean
    }
    
    class RateLimit {
        <<Value Object>>
        -int maxRequests
        -Duration window
        +allows(count) boolean
        +getResetTime(windowStart) DateTime
    }
    
    class APIAccessControlService {
        <<Domain Service>>
        +checkRateLimit(userId, endpoint) AccessResult
        +validateTierAccess(userTier, requiredTier) boolean
    }
    
    class IAPIEndpointRepository {
        <<interface>>
        +findByPath(path) Promise~APIEndpoint~
        +listAll() Promise~APIEndpoint[]~
    }
    
    class IRateLimitRepository {
        <<interface>>
        +save(bucket) Promise~void~
        +findByUserId(userId) Promise~RateLimitBucket~
        +removeExpired() Promise~void~
    }
    
    %% アプリケーション層
    class APIAccessUseCase {
        <<Application Service>>
        -endpointRepo IAPIEndpointRepository
        -rateLimitRepo IRateLimitRepository
        -accessControl APIAccessControlService
        +validateAccess(userId, tier, path, method) Promise~AccessResult~
        +consumeRateLimit(userId, tier) Promise~ConsumeResult~
    }
    
    %% インフラ層
    class RateLimitRepositoryImpl {
        <<Repository Implementation>>
        -cache ICache
        -db IDatabase
        +save(bucket) Promise~void~
        +findByUserId(userId) Promise~RateLimitBucket~
        +removeExpired() Promise~void~
    }
    
    %% 関係性
    APIEndpoint *-- UserTier
    RateLimitBucket *-- RateLimit
    APIAccessControlService ..> APIEndpoint
    APIAccessControlService ..> RateLimitBucket
    APIAccessUseCase ..> IAPIEndpointRepository
    APIAccessUseCase ..> IRateLimitRepository
    APIAccessUseCase ..> APIAccessControlService
    RateLimitRepositoryImpl ..|> IRateLimitRepository
    
    %% mermaid記載上の【重要】注意点
    %% コメントは独立した行に記述
```

### クラス設計の説明

1. **ドメイン層のクラス**
   - エンティティ：識別子を持ち、ライフサイクルを管理
   - バリューオブジェクト：不変で値による等価性判定
   - ドメインサービス：複数の集約にまたがるビジネスロジック
   - リポジトリインターフェース：永続化の抽象化

2. **レイヤー間の分離**
   - インターフェースによる依存性逆転
   - アプリケーションサービスがユースケースを調整
   - インフラ層が技術的詳細を実装

3. **TypeScript固有の実装**
   - Promiseによる非同期処理
   - ジェネリクスによる型安全性
   - インターフェースによる契約の定義

## ドメインイベントの設計

### イベントクラス

```mermaid
classDiagram
    class DomainEvent {
        <<abstract>>
        +eventId string
        +occurredAt DateTime
        +aggregateId string
        +version number
        +getEventName() string
    }
    
    class UserAuthenticated {
        <<Domain Event>>
        +userId string
        +provider string
        +tier UserTier
        +sessionId string
        +getEventName() string
    }
    
    class TokenRefreshed {
        <<Domain Event>>
        +userId string
        +sessionId string
        +getEventName() string
    }
    
    class UserLoggedOut {
        <<Domain Event>>
        +userId string
        +sessionId string
        +reason string
        +getEventName() string
    }
    
    class APIAccessed {
        <<Domain Event>>
        +userId string
        +path string
        +method string
        +statusCode number
        +responseTime number
        +getEventName() string
    }
    
    class RateLimitExceeded {
        <<Domain Event>>
        +userId string
        +path string
        +limit number
        +resetTime DateTime
        +getEventName() string
    }
    
    class IEventHandler~T~ {
        <<interface>>
        +handle(event T) Promise~void~
    }
    
    class IEventBus {
        <<interface>>
        +publish(event DomainEvent) void
        +publishAll(events DomainEvent[]) void
        +subscribe(eventName string, handler IEventHandler) void
    }
    
    class EventBusImpl {
        <<Infrastructure>>
        -handlers Map~string, IEventHandler[]~
        -eventQueue DomainEvent[]
        +publish(event) void
        +publishAll(events) void
        +subscribe(eventName, handler) void
        -dispatch() Promise~void~
    }
    
    DomainEvent <|-- UserAuthenticated
    DomainEvent <|-- TokenRefreshed
    DomainEvent <|-- UserLoggedOut
    DomainEvent <|-- APIAccessed
    DomainEvent <|-- RateLimitExceeded
    IEventHandler ..> DomainEvent
    IEventBus ..> DomainEvent
    EventBusImpl ..|> IEventBus
    EventBusImpl ..> IEventHandler
```

### イベント設計の説明

1. **イベントの実装方針**
   - イベント名は過去形で命名（UserAuthenticated、TokenRefreshed等）
   - 不変オブジェクトとして実装（readonlyプロパティ）
   - 必要最小限の情報のみを含める（集約ID、関連データ）

2. **イベントの発行タイミング**
   - 集約内でビジネスロジック実行後に発行
   - トランザクションコミット後に配信（遅延ディスパッチ）
   - エラー時はイベント発行をスキップ

3. **TypeScriptでの実装**
   ```typescript
   // ドメインイベントの基底クラス
   abstract class DomainEvent {
     readonly eventId: string = uuid();
     readonly occurredAt: DateTime = DateTime.now();
     
     constructor(
       readonly aggregateId: string,
       readonly version: number
     ) {}
     
     abstract getEventName(): string;
   }
   
   // 具体的なイベント
   class UserAuthenticated extends DomainEvent {
     constructor(
       aggregateId: string,
       version: number,
       readonly userId: string,
       readonly provider: string,
       readonly tier: UserTier,
       readonly sessionId: string
     ) {
       super(aggregateId, version);
     }
     
     getEventName(): string {
       return 'UserAuthenticated';
     }
   }
   ```

## 例外とエラー処理の設計

### エラー処理パターン

```mermaid
classDiagram
    class DomainException {
        <<abstract>>
        +message string
        +code string
        +statusCode number
    }
    
    class AuthenticationException {
        <<Domain Exception>>
        +provider string
        +reason string
    }
    
    class AuthorizationException {
        <<Domain Exception>>
        +userId string
        +resource string
        +action string
    }
    
    class RateLimitException {
        <<Domain Exception>>
        +limit number
        +resetTime DateTime
        +retryAfter number
    }
    
    class ResourceNotFoundException {
        <<Domain Exception>>
        +resourceType string
        +resourceId string
    }
    
    class Result~T~ {
        <<Value Object>>
        -value T | null
        -error DomainError | null
        +isSuccess boolean
        +isFailure boolean
        +getValue() T
        +getError() DomainError
        +static ok(value) Result~T~
        +static fail(error) Result~T~
    }
    
    class DomainError {
        <<Value Object>>
        +code string
        +message string
        +type ErrorType
        +details any
    }
    
    class ErrorType {
        <<enumeration>>
        VALIDATION
        BUSINESS_RULE
        NOT_FOUND
        UNAUTHORIZED
        RATE_LIMIT
        EXTERNAL_SERVICE
    }
    
    class ValidationResult {
        <<Value Object>>
        -errors ValidationError[]
        +isValid boolean
        +addError(field, message) void
        +getErrors() ValidationError[]
    }
    
    DomainException <|-- AuthenticationException
    DomainException <|-- AuthorizationException
    DomainException <|-- RateLimitException
    DomainException <|-- ResourceNotFoundException
    Result~T~ *-- DomainError
    DomainError *-- ErrorType
    ValidationResult *-- ValidationError
```

### エラー処理の説明

1. **例外の使用方針**
   - ドメイン不変条件の違反：DomainExceptionをスロー
   - 検証エラー：Result型で処理
   - 外部システムエラー：アプリケーション層でラップ

2. **層別のエラー処理**
   - ドメイン層：ビジネスルール違反の検出とResult型での返却
   - アプリケーション層：エラーの変換とHTTPステータスへのマッピング
   - プレゼンテーション層：RFC 7807形式でのエラーレスポンス生成

3. **TypeScriptでの実装例**
   ```typescript
   // Result型の使用例
   class UserSession {
     static create(
       userId: UserId,
       tier: UserTier
     ): Result<UserSession> {
       if (!userId.isValid()) {
         return Result.fail(
           new DomainError(
             'INVALID_USER_ID',
             'User ID is invalid',
             ErrorType.VALIDATION
           )
         );
       }
       
       const session = new UserSession(userId, tier);
       return Result.ok(session);
     }
   }
   
   // エラーレスポンスの生成（RFC 7807）
   function toProblemDetails(error: DomainError): ProblemDetails {
     return {
       type: `https://api.example.com/errors/${error.code}`,
       title: error.message,
       status: mapErrorToStatus(error.type),
       detail: error.details,
       instance: request.url
     };
   }
   ```

## 横断的関心事の設計

### アーキテクチャパターン

```mermaid
graph TB
    subgraph "横断的関心事の実装"
        AuthMW[認証ミドルウェア<br/>JWT検証]
        AuthzDecorator[認可デコレータ<br/>ティアチェック]
        LogInterceptor[ロギングインターセプタ<br/>リクエスト/レスポンス]
        RateLimitMW[レート制限ミドルウェア]
        CacheInterceptor[キャッシュインターセプタ<br/>Edge Cache]
        ErrorHandler[エラーハンドラー<br/>RFC 7807]
    end
    
    subgraph "アプリケーション層"
        AppService[アプリケーションサービス]
        EventHandlers[イベントハンドラー]
    end
    
    subgraph "ドメイン層"
        Domain[ドメインロジック]
        DomainEvents[ドメインイベント]
    end
    
    subgraph "インフラ層"
        Logger[Pino Logger]
        Cache[Cache Manager]
        Monitoring[Metrics Collector]
    end
    
    AuthMW --> AppService
    AuthzDecorator --> AppService
    RateLimitMW --> AppService
    LogInterceptor --> Logger
    CacheInterceptor --> Cache
    ErrorHandler --> AppService
    
    AppService --> Domain
    Domain --> DomainEvents
    DomainEvents --> EventHandlers
    EventHandlers --> Logger
    
    Note over AuthMW,ErrorHandler: Fastifyプラグインとして実装
    Note over Domain: ビジネスロジックのみ
    Note over Logger,Monitoring: 監視・分析基盤
```

### 横断的関心事の実装指針

1. **認証（Authentication）**
   - 実装場所：Fastifyミドルウェア（preHandler hook）
   - JWT検証とセッション確認
   - Supabase Authとの連携

2. **認可（Authorization）**
   - 単純な権限：ルートレベルのpreHandlerフック
   - ティアベースのアクセス制御：デコレータパターン
   - ビジネスルール：ドメイン層の仕様オブジェクト

3. **ロギング・監査**
   - 実装場所：Fastifyフック（onRequest/onResponse）
   - Pinoロガー（Fastifyデフォルト）の活用
   - 構造化ログ（JSON形式）で出力

4. **レート制限**
   - 実装場所：Fastifyプラグイン
   - ユーザーティアに基づく動的制限
   - Redis互換のメモリキャッシュ使用

5. **キャッシュ**
   - 実装場所：インターセプタパターン
   - Vercel Edge Cacheの活用
   - キャッシュキー生成戦略

6. **エラーハンドリング**
   - グローバルエラーハンドラー
   - RFC 7807準拠のレスポンス
   - 環境別のエラー詳細度制御

### Fastifyでの実装例

```typescript
// 認証ミドルウェア
const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    const token = extractToken(request.headers.authorization);
    
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }
    
    const validation = await authUseCase.validateToken(token);
    if (!validation.isValid) {
      throw new UnauthorizedException('Invalid token');
    }
    
    request.user = validation.user;
  });
};

// レート制限デコレータ
function RateLimit(tier: UserTier) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const userId = args[0].userId;
      const canProceed = await rateLimitService.tryConsume(
        userId,
        tier
      );
      
      if (!canProceed) {
        throw new RateLimitException(
          tier.rateLimit,
          calculateResetTime()
        );
      }
      
      return originalMethod.apply(this, args);
    };
  };
}

// 構造化ロギング
const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label: string) => ({ level: label }),
    bindings: (bindings: any) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
      node_version: process.version,
    }),
  },
  serializers: {
    req: (request: FastifyRequest) => ({
      method: request.method,
      url: request.url,
      userId: request.user?.id,
      ip: request.ip,
    }),
    res: (reply: FastifyReply) => ({
      statusCode: reply.statusCode,
      responseTime: reply.getResponseTime(),
    }),
  },
};
```

## チェックリスト

### ドメインモデルの品質
- [x] すべての集約がドメインモデルとして表現されている
- [x] エンティティとバリューオブジェクトが適切に区別されている
- [x] ドメインサービスが識別され、責務が明確である
- [x] 集約間の参照がIDによる参照になっている
- [x] 不変条件（ビジネスルール）が集約内で保証されている

### アーキテクチャの整合性
- [x] レイヤー間の依存関係が単一方向である
- [x] ドメイン層が技術的な詳細に依存していない
- [x] インフラ層の実装がインターフェースを通じて抽象化されている
- [x] 各層の責務が明確に分離されている

### 境界づけられたコンテキストの統合
- [x] コンテキスト間の統合パターンが明確に定義されている
- [x] 腐敗防止層（ACL）が適切に設計されている
- [x] イベント駆動の統合が考慮されている
- [x] 外部システムとの統合方法が具体的である

### 実装可能性
- [x] 使用する技術スタックでの実装方法が明確である
- [x] 永続化戦略が定義されている
- [x] トランザクション境界が明確である
- [x] パフォーマンスを考慮した設計になっている

### イベントストーミングとの整合性
- [x] イベントストーミングで識別した要素がすべて反映されている
- [x] ドメインイベントがステートマシン図に反映されている
- [x] コマンドがアプリケーションサービスに対応している
- [x] 読み取りモデルが適切に設計されている

### ドメインイベントの設計
- [x] 重要なビジネスイベントがドメインイベントとして定義されている
- [x] イベントの命名が過去形でユビキタス言語を使用している
- [x] イベントの発行と配信の仕組みが明確である
- [x] イベントハンドリングの責務が適切に配置されている

### 例外処理とエラー設計
- [x] ドメイン例外が適切に定義されている
- [x] エラー処理パターン（例外/Result型）が一貫している
- [x] 各層でのエラー処理責任が明確である
- [x] ビジネスルール違反が適切に表現されている

### 横断的関心事の設計
- [x] 認証・認可の実装場所が適切である
- [x] ドメインロジックから横断的関心事が分離されている
- [x] ロギング・監査の仕組みが設計されている
- [x] プロジェクト固有の非機能要件が考慮されている

## 補足

### TypeScript/Fastify固有の設計考慮事項

1. **型安全性の活用**
   - ドメインモデルに厳密な型定義
   - ブランド型によるプリミティブ型の区別
   - 判別共用体によるエラーハンドリング

2. **非同期処理の設計**
   - Promise/async-awaitの一貫した使用
   - エラー伝播の明確化
   - 並行処理の最適化

3. **Vercelデプロイメント最適化**
   - Edge Functionsでの実行を考慮
   - コールドスタート対策
   - バンドルサイズの最小化

4. **テスタビリティ**
   - 依存性注入によるモック化
   - 純粋関数の活用
   - 統合テストの容易性

## 変更履歴

|更新日時|変更点|
|-|-|
|2025-01-12T14:00:00+09:00|新規作成 - TypeScript/Fastify/Vercel環境に特化した静的モデリング|