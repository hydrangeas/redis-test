# TypeScript Clean Architecture and Development Guidelines

## 目次

1. [序文](#序文)
2. [アーキテクチャ基本原則](#アーキテクチャ基本原則)
3. [SOLID原則](#solid原則)
4. [命名規則とコーディングスタイル](#命名規則とコーディングスタイル)
5. [ドメイン駆動設計 (DDD) の適用](#ドメイン駆動設計-ddd-の適用)
6. [TypeScript固有のパターン](#typescript固有のパターン)
7. [エラーハンドリング](#エラーハンドリング)
8. [テスト戦略](#テスト戦略)
9. [パフォーマンス最適化](#パフォーマンス最適化)
10. [セキュリティベストプラクティス](#セキュリティベストプラクティス)
11. [Fastify固有のパターン](#fastify固有のパターン)
12. [コード組織化とモジュールパターン](#コード組織化とモジュールパターン)
13. [非同期処理のベストプラクティス](#非同期処理のベストプラクティス)
14. [全般的なガイドライン](#全般的なガイドライン)

## 序文

このファイルはTypeScriptコードを生成する際のルールを定義します。
クリーンアーキテクチャとSOLID原則に基づき、モダンなTypeScriptのベストプラクティスを取り入れたガイドラインです。
このルールセットに従うことで、型安全性が高く、保守性があり、テスト可能で、拡張性のあるコードベースを実現します。

## アーキテクチャ基本原則

### クリーンアーキテクチャのレイヤー構造

* ドメインレイヤー - すべてのビジネスエンティティとルールを含む最内層
* アプリケーションレイヤー - ユースケース、アプリケーションサービス、インターフェース定義
* インフラストラクチャレイヤー - 永続化、外部サービス連携、技術的実装
* プレゼンテーションレイヤー - UI、API、ユーザーインターフェース

### 依存関係の方向

* 依存関係は常に内側に向かわなければならない
* 外側のレイヤーは内側のレイヤーに依存するが、その逆は許されない
* ドメインレイヤーは他のどのレイヤーにも依存してはならない
* インターフェースは内側のレイヤーで定義し、外側のレイヤーで実装する

```text
// プロジェクト構造の例
// project-root/
//   ├── src/
//   │   ├── domain/               // 最内層: ビジネスエンティティとルール
//   │   │   ├── entities/
//   │   │   ├── value-objects/
//   │   │   ├── services/
//   │   │   └── events/
//   │   ├── application/          // ユースケース実装、依存はdomainのみ
//   │   │   ├── use-cases/
//   │   │   ├── interfaces/
//   │   │   └── dtos/
//   │   ├── infrastructure/       // 技術的実装、依存はdomainとapplication
//   │   │   ├── repositories/
//   │   │   ├── services/
//   │   │   ├── config/
//   │   │   └── adapters/
//   │   └── presentation/         // ユーザーインターフェース、依存はapplication
//   │        ├── api/             // Fastify routes/controllers
//   │        │   ├── routes/
//   │        │   ├── middleware/
//   │        │   └── schemas/
//   │        └── web/             // Vite+TypeScript frontend
//   │             ├── pages/
//   │             ├── components/
//   │             └── hooks/
//   ├── tests/
//   ├── scripts/
//   └── package.json
```

## SOLID原則

### 単一責任の原則 (SRP)

* クラスは単一の責任のみを持つべき
* 変更理由が一つだけになるようにクラスを設計する
* 大きなクラスは小さな単一責任のクラスに分割する

```typescript
// 良い例: 単一責任を持つクラス
export class UserValidator {
  validateUser(user: User): ValidationResult {
    if (!user) {
      throw new ArgumentNullError('user');
    }
    
    const errors: ValidationError[] = [];
    
    if (!this.isValidEmail(user.email)) {
      errors.push(new ValidationError('email', 'Invalid email format'));
    }
    
    if (!this.isValidTier(user.tier)) {
      errors.push(new ValidationError('tier', 'Invalid user tier'));
    }
    
    return new ValidationResult(errors);
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  private isValidTier(tier: string): boolean {
    return ['tier1', 'tier2', 'tier3'].includes(tier);
  }
}

export class UserService {
  constructor(
    private readonly repository: IUserRepository,
    private readonly validator: UserValidator,
    private readonly eventBus: IEventBus
  ) {}
  
  async createUser(userData: CreateUserDto): Promise<Result<User>> {
    const user = User.create(userData);
    if (user.isFailure) {
      return Result.fail(user.error);
    }
    
    const validationResult = this.validator.validateUser(user.value);
    if (!validationResult.isValid) {
      return Result.fail(new ValidationException(validationResult.errors));
    }
    
    await this.repository.save(user.value);
    await this.eventBus.publish(new UserCreatedEvent(user.value.id));
    
    return Result.ok(user.value);
  }
}
```

### 開放/閉鎖原則 (OCP)

* ソフトウェアエンティティは拡張に対しては開いているが、修正に対しては閉じているべき
* インターフェースと抽象クラスを活用して拡張ポイントを確保する
* 継承より構成を優先する

```typescript
// 良い例: 拡張に開いているが、修正には閉じている設計
interface IRateLimitStrategy {
  getLimit(tier: UserTier): RateLimit;
}

class DefaultRateLimitStrategy implements IRateLimitStrategy {
  getLimit(tier: UserTier): RateLimit {
    switch (tier.level) {
      case TierLevel.TIER1:
        return new RateLimit(60, 60); // 60 requests per 60 seconds
      case TierLevel.TIER2:
        return new RateLimit(120, 60);
      case TierLevel.TIER3:
        return new RateLimit(300, 60);
      default:
        return new RateLimit(60, 60);
    }
  }
}

class CustomRateLimitStrategy implements IRateLimitStrategy {
  constructor(private readonly config: RateLimitConfig) {}
  
  getLimit(tier: UserTier): RateLimit {
    const limit = this.config.limits[tier.level];
    return new RateLimit(limit.maxRequests, limit.windowSeconds);
  }
}

// 新しい戦略を追加するためにこのクラスを変更する必要はない
export class RateLimitService {
  constructor(private readonly strategy: IRateLimitStrategy) {}
  
  checkRateLimit(user: AuthenticatedUser): boolean {
    const limit = this.strategy.getLimit(user.tier);
    // Rate limit checking logic
    return true;
  }
}
```

### リスコフの置換原則 (LSP)

* サブタイプはそのベースタイプとして置換可能であるべき
* 継承関係においては、派生クラスは基底クラスの動作を尊重すべき
* 契約による設計（Design by Contract）を意識する

```typescript
// 良い例: 派生クラスはベースクラスの動作に準拠
abstract class DomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  
  constructor(
    readonly aggregateId: string,
    readonly version: number
  ) {}
  
  abstract getEventName(): string;
}

class UserAuthenticated extends DomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    readonly userId: string,
    readonly provider: string,
    readonly tier: string
  ) {
    super(aggregateId, version);
  }
  
  getEventName(): string {
    return 'UserAuthenticated';
  }
}

class APIAccessed extends DomainEvent {
  constructor(
    aggregateId: string,
    version: number,
    readonly userId: string,
    readonly path: string,
    readonly statusCode: number
  ) {
    super(aggregateId, version);
  }
  
  getEventName(): string {
    return 'APIAccessed';
  }
}

// どのDomainEventのサブクラスでも問題なく動作する
export class EventStore {
  private events: DomainEvent[] = [];
  
  async store(event: DomainEvent): Promise<void> {
    this.events.push(event);
    console.log(`Stored event: ${event.getEventName()} at ${event.occurredAt}`);
  }
  
  getEventsByAggregate(aggregateId: string): DomainEvent[] {
    return this.events.filter(e => e.aggregateId === aggregateId);
  }
}
```

### インターフェース分離の原則 (ISP)

* クライアントは使用しないメソッドに依存すべきでない
* 大きなインターフェースは小さく特化したインターフェースに分割する
* ロールインターフェースを活用する

```typescript
// 良い例: 特化した小さなインターフェース
interface IDataReader {
  findByPath(path: string): Promise<OpenDataResource | null>;
  exists(path: string): Promise<boolean>;
}

interface IDataContentReader {
  getContent(path: string): Promise<JsonObject>;
}

interface ILogWriter {
  save(logEntry: LogEntry): Promise<void>;
}

interface ILogReader {
  findByUserId(userId: string, timeRange: TimeRange): Promise<LogEntry[]>;
  countByUserId(userId: string): Promise<number>;
}

// 必要なインターフェースのみを使用
export class DataRetrievalService {
  constructor(
    private readonly dataReader: IDataReader,
    private readonly contentReader: IDataContentReader
  ) {}
  
  async retrieveData(path: string): Promise<Result<JsonObject>> {
    const exists = await this.dataReader.exists(path);
    if (!exists) {
      return Result.fail(new ResourceNotFoundException('data', path));
    }
    
    const content = await this.contentReader.getContent(path);
    return Result.ok(content);
  }
}

export class APILoggingService {
  constructor(private readonly logWriter: ILogWriter) {}
  
  async logAPIAccess(
    userId: string,
    path: string,
    statusCode: number
  ): Promise<void> {
    const logEntry = new APILogEntry({
      userId,
      path,
      statusCode,
      timestamp: new Date()
    });
    
    await this.logWriter.save(logEntry);
  }
}
```

### 依存性逆転の原則 (DIP)

* 上位モジュールは下位モジュールに依存すべきでない。どちらも抽象に依存すべき
* 抽象は詳細に依存すべきでない。詳細が抽象に依存すべき
* 依存性注入を活用して実装の詳細を隠蔽する

```typescript
// 良い例: 上位モジュールと下位モジュールがともに抽象に依存
export interface IAuthenticationService {
  verifyToken(token: string): Promise<TokenPayload>;
  refreshToken(refreshToken: string): Promise<Session>;
}

// 下位モジュール: インターフェースを実装
export class SupabaseAuthService implements IAuthenticationService {
  constructor(private readonly supabaseClient: SupabaseClient) {}
  
  async verifyToken(token: string): Promise<TokenPayload> {
    const { data, error } = await this.supabaseClient.auth.getUser(token);
    if (error) {
      throw new AuthenticationException('Invalid token', error.message);
    }
    return this.mapToTokenPayload(data);
  }
  
  async refreshToken(refreshToken: string): Promise<Session> {
    const { data, error } = await this.supabaseClient.auth.refreshSession({
      refresh_token: refreshToken
    });
    if (error) {
      throw new AuthenticationException('Refresh failed', error.message);
    }
    return data.session;
  }
  
  private mapToTokenPayload(user: any): TokenPayload {
    return {
      sub: user.id,
      app_metadata: user.app_metadata,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    };
  }
}

// 上位モジュール: インターフェースに依存
export class AuthenticationUseCase {
  constructor(
    private readonly authService: IAuthenticationService,
    private readonly eventBus: IEventBus
  ) {}
  
  async validateToken(token: string): Promise<Result<AuthenticatedUser>> {
    try {
      const payload = await this.authService.verifyToken(token);
      const user = AuthenticatedUser.fromTokenPayload(payload);
      
      await this.eventBus.publish(
        new UserAuthenticated(user.userId.value, 1, user.userId.value, 'jwt', user.tier.level)
      );
      
      return Result.ok(user);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
```

## 命名規則とコーディングスタイル

### 一般的な命名規則

* **ファイル/フォルダ**: kebab-caseで`feature-name.ts`の形式
* **クラス/インターフェース**: PascalCaseで、クラスは名詞、インターフェースはIプレフィックス付き
* **型エイリアス/型**: PascalCaseで、意味を明確に表現
* **関数/メソッド**: camelCaseで動詞または動詞句
* **定数**: UPPER_SNAKE_CASEで説明的な名前
* **変数/パラメータ**: camelCaseで意味のある名前
* **プライベートプロパティ**: camelCaseで先頭にアンダースコア不要（privateキーワードで明示）

```typescript
// 命名規則の例
// src/domain/value-objects/user-id.ts
export class UserId {
  private readonly brand!: unique symbol;
  
  constructor(readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new InvalidUserIdError('User ID cannot be empty');
    }
  }
  
  equals(other: UserId): boolean {
    return this.value === other.value;
  }
  
  toString(): string {
    return this.value;
  }
}

// src/application/use-cases/authenticate-user.ts
export interface IAuthenticateUserUseCase {
  execute(token: string): Promise<Result<AuthenticatedUser>>;
}

export class AuthenticateUserUseCase implements IAuthenticateUserUseCase {
  private static readonly TOKEN_HEADER_PREFIX = 'Bearer ';
  
  constructor(
    private readonly authService: IAuthenticationService,
    private readonly logger: ILogger
  ) {}
  
  async execute(token: string): Promise<Result<AuthenticatedUser>> {
    this.logger.info('Authenticating user', { tokenLength: token.length });
    
    const cleanToken = this.extractToken(token);
    if (!cleanToken) {
      return Result.fail(new InvalidTokenError('Invalid token format'));
    }
    
    try {
      const payload = await this.authService.verifyToken(cleanToken);
      const user = this.createAuthenticatedUser(payload);
      
      this.logger.info('User authenticated successfully', { 
        userId: user.userId.value,
        tier: user.tier.level 
      });
      
      return Result.ok(user);
    } catch (error) {
      this.logger.error('Authentication failed', error);
      return Result.fail(error as Error);
    }
  }
  
  private extractToken(authHeader: string): string | null {
    if (!authHeader.startsWith(AuthenticateUserUseCase.TOKEN_HEADER_PREFIX)) {
      return null;
    }
    return authHeader.slice(AuthenticateUserUseCase.TOKEN_HEADER_PREFIX.length);
  }
  
  private createAuthenticatedUser(payload: TokenPayload): AuthenticatedUser {
    const userId = new UserId(payload.sub);
    const tier = UserTier.fromString(payload.app_metadata?.tier || 'tier1');
    return new AuthenticatedUser(userId, tier);
  }
}
```

### ファイルとフォルダ構成

* ファイル名はクラス名のkebab-case版と一致させる
* 1ファイル1エクスポート（関連する小さな型は例外）
* フォルダ構造は機能とレイヤーで整理する
* バレルエクスポート（index.ts）を適切に使用する
* テストファイルは対応するファイルと同じ場所に`.test.ts`または`.spec.ts`として配置

### コードスタイル

* インデントは2スペース（タブではなく）
* セミコロンは省略しない
* シングルクォートを使用（JSX内は除く）
* 末尾カンマを使用する（trailing comma）
* 1行は100文字以内に収める
* 意味のある論理的なブロック間には空行を入れる
* 早期リターンを活用してネストを減らす

```typescript
// コードスタイルの例
export class RateLimitService {
  constructor(
    private readonly repository: IRateLimitRepository,
    private readonly config: RateLimitConfig,
  ) {}
  
  async checkRateLimit(user: AuthenticatedUser): Promise<RateLimitResult> {
    // 早期リターンでネストを減らす
    if (!user || !user.userId) {
      return RateLimitResult.denied('Invalid user');
    }
    
    const limit = user.tier.getRateLimit();
    const windowStart = new Date(Date.now() - limit.windowSeconds * 1000);
    
    // 現在のリクエスト数を取得
    const currentCount = await this.repository.countByUserId(
      user.userId,
      windowStart,
    );
    
    // レート制限チェック
    if (currentCount >= limit.maxRequests) {
      const resetTime = new Date(windowStart.getTime() + limit.windowSeconds * 1000);
      return RateLimitResult.exceeded(limit.maxRequests, resetTime);
    }
    
    // アクセスログを記録
    await this.repository.save(
      new RateLimitLog({
        userId: user.userId,
        requestedAt: new Date(),
        endpoint: this.config.endpoint,
      }),
    );
    
    return RateLimitResult.allowed(limit.maxRequests - currentCount - 1);
  }
}
```

## ドメイン駆動設計 (DDD) の適用

### エンティティ

* 同一性（ID）によって識別される
* エンティティは不変条件を自身で検証する
* エンティティのビジネスロジックはエンティティクラス内に含める
* IDはブランド型（Branded Type）として実装する
* プライベートコンストラクタとファクトリメソッドパターンを使用する

```typescript
// エンティティの例
export type OrderId = Brand<string, 'OrderId'>;
export type CustomerId = Brand<string, 'CustomerId'>;
export type ProductId = Brand<string, 'ProductId'>;

export enum OrderStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  SHIPPED = 'shipped',
  CANCELLED = 'cancelled',
}

export class Order {
  private readonly items: OrderItem[] = [];
  
  constructor(
    public readonly id: OrderId,
    public readonly customerId: CustomerId,
    private status: OrderStatus,
    public readonly createdAt: Date,
    public readonly currency: Currency,
  ) {}
  
  static create(customerId: CustomerId, currency: Currency = 'USD'): Order {
    return new Order(
      crypto.randomUUID() as OrderId,
      customerId,
      OrderStatus.PENDING,
      new Date(),
      currency,
    );
  }
  
  addItem(productId: ProductId, quantity: number, unitPrice: Money): Result<void> {
    if (this.status !== OrderStatus.PENDING) {
      return Result.fail(new InvalidOperationError('Cannot add items to non-pending order'));
    }
    
    if (quantity <= 0) {
      return Result.fail(new ValidationError('Quantity must be positive'));
    }
    
    if (unitPrice.currency !== this.currency) {
      return Result.fail(new InvalidOperationError('Item currency must match order currency'));
    }
    
    const existingItem = this.items.find(item => item.productId === productId);
    if (existingItem) {
      existingItem.increaseQuantity(quantity);
    } else {
      this.items.push(new OrderItem(crypto.randomUUID(), this.id, productId, quantity, unitPrice));
    }
    
    return Result.ok();
  }
  
  submit(): Result<OrderSubmittedEvent> {
    if (this.status !== OrderStatus.PENDING) {
      return Result.fail(new InvalidOperationError('Only pending orders can be submitted'));
    }
    
    if (this.items.length === 0) {
      return Result.fail(new InvalidOperationError('Cannot submit order without items'));
    }
    
    this.status = OrderStatus.SUBMITTED;
    
    return Result.ok(new OrderSubmittedEvent(this.id, this.customerId, this.calculateTotal()));
  }
  
  private calculateTotal(): Money {
    return this.items.reduce(
      (total, item) => total.add(item.getSubtotal()),
      Money.zero(this.currency),
    );
  }
  
  getItems(): ReadonlyArray<OrderItem> {
    return [...this.items];
  }
  
  getStatus(): OrderStatus {
    return this.status;
  }
}
```

### Value Objects

* その属性によって識別される（IDを持たない）
* 常に不変（Immutable）
* 値の等価性によって比較される
* 自己完結型で副作用を持たない

```typescript
// Value Objectの例: Money
export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: Currency,
  ) {
    if (amount < 0) {
      throw new ArgumentError('Amount cannot be negative');
    }
    
    if (!isValidCurrency(currency)) {
      throw new ArgumentError('Invalid currency code');
    }
    
    // 金額を適切な精度に丸める
    this.amount = Math.round(amount * 100) / 100;
  }
  
  static zero(currency: Currency = 'USD'): Money {
    return new Money(0, currency);
  }
  
  add(other: Money): Money {
    if (other.currency !== this.currency) {
      throw new InvalidOperationError(
        `Cannot add money with different currencies: ${this.currency} and ${other.currency}`,
      );
    }
    
    return new Money(this.amount + other.amount, this.currency);
  }
  
  subtract(other: Money): Money {
    if (other.currency !== this.currency) {
      throw new InvalidOperationError(
        `Cannot subtract money with different currencies: ${this.currency} and ${other.currency}`,
      );
    }
    
    return new Money(this.amount - other.amount, this.currency);
  }
  
  multiply(multiplier: number): Money {
    return new Money(this.amount * multiplier, this.currency);
  }
  
  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
  
  toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`;
  }
}

// Value Objectの例: Email
export class Email {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  constructor(public readonly value: string) {
    if (!Email.EMAIL_REGEX.test(value)) {
      throw new ValidationError('Invalid email format');
    }
  }
  
  equals(other: Email): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }
  
  toString(): string {
    return this.value;
  }
  
  getDomain(): string {
    return this.value.split('@')[1];
  }
}
```

### 集約

* トランザクション境界を定義する関連エンティティのグループ
* 集約ルート（親エンティティ）を介してのみアクセスする
* 集約内の整合性は常に保持する
* リポジトリは集約単位で操作する

```typescript
// 集約の例: RateLimiting
export class RateLimitLog {
  constructor(
    public readonly id: LogId,
    public readonly userId: UserId,
    public readonly requestedAt: Date,
    public readonly endpoint: Endpoint,
  ) {}
}

export class RateLimiting {
  private logs: RateLimitLog[] = [];
  
  constructor(
    public readonly userId: UserId,
    private readonly limit: RateLimit,
  ) {}
  
  canMakeRequest(now: Date = new Date()): boolean {
    const windowStart = new Date(now.getTime() - this.limit.windowSeconds * 1000);
    const recentLogs = this.logs.filter(log => log.requestedAt > windowStart);
    
    return recentLogs.length < this.limit.maxRequests;
  }
  
  recordRequest(endpoint: string, now: Date = new Date()): Result<RateLimitLog> {
    if (!this.canMakeRequest(now)) {
      return Result.fail(new RateLimitExceededError(this.limit, this.getResetTime(now)));
    }
    
    const log = new RateLimitLog(
      crypto.randomUUID() as LogId,
      this.userId,
      now,
      new Endpoint(endpoint),
    );
    
    this.logs.push(log);
    return Result.ok(log);
  }
  
  getResetTime(now: Date = new Date()): Date {
    const oldestRelevantLog = this.logs
      .filter(log => log.requestedAt > new Date(now.getTime() - this.limit.windowSeconds * 1000))
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime())[0];
    
    if (!oldestRelevantLog) {
      return now;
    }
    
    return new Date(oldestRelevantLog.requestedAt.getTime() + this.limit.windowSeconds * 1000);
  }
  
  // リポジトリから再構築する際に使用
  static reconstitute(userId: UserId, limit: RateLimit, logs: RateLimitLog[]): RateLimiting {
    const rateLimiting = new RateLimiting(userId, limit);
    rateLimiting.logs = logs;
    return rateLimiting;
  }
}
```

### ドメインサービス

* 単一のエンティティに自然に属さない操作を実装する
* 複数の集約にまたがる操作はドメインサービスで実装する
* ステートレスにする

```typescript
// ドメインサービスの例
export interface IEndpointRepository {
  findByPath(path: string): Promise<APIEndpoint | null>;
}

export interface IRateLimitRepository {
  findByUserId(userId: UserId): Promise<RateLimiting | null>;
  save(rateLimiting: RateLimiting): Promise<void>;
  countByUserId(userId: UserId, since: Date): Promise<number>;
}

export class APIAccessControlService {
  constructor(
    private readonly endpointRepository: IEndpointRepository,
    private readonly rateLimitRepository: IRateLimitRepository,
  ) {}
  
  async validateAccess(
    user: AuthenticatedUser,
    requestPath: string,
  ): Promise<Result<APIAccessGrant>> {
    // エンドポイントの検証
    const endpoint = await this.endpointRepository.findByPath(requestPath);
    if (!endpoint) {
      return Result.fail(new EndpointNotFoundError(requestPath));
    }
    
    // ティアレベルの検証
    if (!user.canAccessEndpoint(endpoint.requiredTier)) {
      return Result.fail(new InsufficientTierError(user.tier, endpoint.requiredTier));
    }
    
    // レート制限の検証
    const rateLimitResult = await this.checkRateLimit(user);
    if (rateLimitResult.isFailure) {
      return Result.fail(rateLimitResult.error);
    }
    
    return Result.ok(new APIAccessGrant(user.userId, endpoint, new Date()));
  }
  
  private async checkRateLimit(user: AuthenticatedUser): Promise<Result<void>> {
    const limit = user.tier.getRateLimit();
    const windowStart = new Date(Date.now() - limit.windowSeconds * 1000);
    
    const count = await this.rateLimitRepository.countByUserId(user.userId, windowStart);
    
    if (count >= limit.maxRequests) {
      const resetTime = new Date(windowStart.getTime() + limit.windowSeconds * 1000);
      return Result.fail(new RateLimitExceededError(limit, resetTime));
    }
    
    // ログを記録
    await this.rateLimitRepository.save(
      new RateLimitLog(
        crypto.randomUUID() as LogId,
        user.userId,
        new Date(),
        new Endpoint('api'),
      ),
    );
    
    return Result.ok();
  }
}
```

## TypeScript固有のパターン

### ブランド型（Branded Types）

プリミティブ型に型安全性を追加する

```typescript
// ブランド型の定義
type Brand<K, T> = K & { __brand: T };

// 使用例
type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;
type PositiveNumber = Brand<number, 'PositiveNumber'>;

// ヘルパー関数で安全に作成
function createUserId(id: string): Result<UserId> {
  if (!id || id.trim().length === 0) {
    return Result.fail(new ValidationError('User ID cannot be empty'));
  }
  return Result.ok(id as UserId);
}

function createEmail(email: string): Result<Email> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return Result.fail(new ValidationError('Invalid email format'));
  }
  return Result.ok(email as Email);
}

// 型安全な使用
function sendEmail(to: Email, subject: string): void {
  // Email型が保証されているので、ここでの検証は不要
  console.log(`Sending email to ${to}`);
}

// コンパイルエラー: string型をEmail型として使用できない
// sendEmail('user@example.com', 'Hello'); // Error!

// 正しい使用方法
const emailResult = createEmail('user@example.com');
if (emailResult.isSuccess) {
  sendEmail(emailResult.value, 'Hello');
}
```

### 判別共用体（Discriminated Unions）

状態管理とエラーハンドリングに活用

```typescript
// 判別共用体の例: APIレスポンス
type APIResponse<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; error: APIError }
  | { status: 'loading' };

type APIError = 
  | { type: 'network'; message: string }
  | { type: 'validation'; errors: ValidationError[] }
  | { type: 'unauthorized' }
  | { type: 'rate_limit'; resetTime: Date };

// 使用例
function handleAPIResponse<T>(response: APIResponse<T>): void {
  switch (response.status) {
    case 'loading':
      console.log('Loading...');
      break;
      
    case 'success':
      console.log('Data:', response.data);
      break;
      
    case 'error':
      switch (response.error.type) {
        case 'network':
          console.error('Network error:', response.error.message);
          break;
          
        case 'validation':
          console.error('Validation errors:', response.error.errors);
          break;
          
        case 'unauthorized':
          console.error('Please login');
          break;
          
        case 'rate_limit':
          console.error('Rate limit exceeded. Reset at:', response.error.resetTime);
          break;
          
        default:
          // TypeScriptのexhaustiveness check
          const _exhaustive: never = response.error;
          throw new Error(`Unhandled error type: ${_exhaustive}`);
      }
      break;
      
    default:
      // TypeScriptのexhaustiveness check
      const _exhaustive: never = response;
      throw new Error(`Unhandled response status: ${_exhaustive}`);
  }
}
```

### Utility Types

TypeScriptの組み込み型ユーティリティを活用

```typescript
// Partial: すべてのプロパティをオプショナルに
type UpdateUserDto = Partial<User>;

// Required: すべてのプロパティを必須に
type CompleteUserProfile = Required<UpdateUserDto>;

// Pick: 特定のプロパティのみを抽出
type UserCredentials = Pick<User, 'email' | 'password'>;

// Omit: 特定のプロパティを除外
type UserWithoutPassword = Omit<User, 'password'>;

// Record: キーと値の型を定義
type UserRoles = Record<UserId, Role[]>;

// カスタムUtility Types
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type Maybe<T> = T | null | undefined;

// 条件型
type IsArray<T> = T extends any[] ? true : false;
type ExtractArrayType<T> = T extends (infer U)[] ? U : never;

// Template Literal Types
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type APIPath = `/api/${string}`;
type APIEndpoint = `${HTTPMethod} ${APIPath}`;

// 使用例
const endpoint: APIEndpoint = 'GET /api/users'; // OK
// const invalid: APIEndpoint = 'GET /users'; // Error: '/users'は'/api/'で始まらない
```

### Builder Pattern with Type Safety

型安全なビルダーパターンの実装

```typescript
// ビルダーパターンの例
class UserBuilder<T = {}> {
  private constructor(private readonly data: T) {}
  
  static create(): UserBuilder {
    return new UserBuilder({});
  }
  
  withId(id: UserId): UserBuilder<T & { id: UserId }> {
    return new UserBuilder({ ...this.data, id });
  }
  
  withEmail(email: Email): UserBuilder<T & { email: Email }> {
    return new UserBuilder({ ...this.data, email });
  }
  
  withTier(tier: UserTier): UserBuilder<T & { tier: UserTier }> {
    return new UserBuilder({ ...this.data, tier });
  }
  
  build(this: UserBuilder<{ id: UserId; email: Email; tier: UserTier }>): User {
    return new User(this.data.id, this.data.email, this.data.tier);
  }
}

// 使用例
const user = UserBuilder.create()
  .withId('123' as UserId)
  .withEmail('user@example.com' as Email)
  .withTier(UserTier.TIER1)
  .build(); // すべての必須プロパティが設定されているときのみビルド可能

// コンパイルエラー: emailが不足
// const invalid = UserBuilder.create()
//   .withId('123' as UserId)
//   .withTier(UserTier.TIER1)
//   .build(); // Error: Property 'email' is missing
```

## エラーハンドリング

### Result型パターン

例外ではなく型安全なエラーハンドリング

```typescript
// Result型の定義
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

export class ResultClass {
  static ok<T>(value: T): Result<T> {
    return { success: true, value };
  }
  
  static fail<E = Error>(error: E): Result<never, E> {
    return { success: false, error };
  }
  
  static combine<T>(results: Result<T>[]): Result<T[]> {
    const errors = results.filter(r => !r.success).map(r => r.error);
    if (errors.length > 0) {
      return ResultClass.fail(new AggregateError(errors));
    }
    
    const values = results.filter(r => r.success).map(r => (r as any).value);
    return ResultClass.ok(values);
  }
}

// 使用例
export class UserService {
  async createUser(dto: CreateUserDto): Promise<Result<User>> {
    // 検証
    const validationResult = this.validateUserDto(dto);
    if (!validationResult.success) {
      return validationResult;
    }
    
    // メールの重複チェック
    const existingUser = await this.repository.findByEmail(dto.email);
    if (existingUser) {
      return ResultClass.fail(new DuplicateEmailError(dto.email));
    }
    
    // ユーザー作成
    const user = User.create(dto);
    if (!user.success) {
      return user;
    }
    
    // 保存
    try {
      await this.repository.save(user.value);
      return ResultClass.ok(user.value);
    } catch (error) {
      return ResultClass.fail(new DatabaseError('Failed to save user', error));
    }
  }
  
  private validateUserDto(dto: CreateUserDto): Result<void> {
    const errors: ValidationError[] = [];
    
    if (!dto.email || dto.email.trim().length === 0) {
      errors.push(new ValidationError('email', 'Email is required'));
    }
    
    if (!isValidEmail(dto.email)) {
      errors.push(new ValidationError('email', 'Invalid email format'));
    }
    
    if (errors.length > 0) {
      return ResultClass.fail(new ValidationException(errors));
    }
    
    return ResultClass.ok(undefined);
  }
}
```

### Either モナド

関数型プログラミングのアプローチ

```typescript
// Either型の定義
abstract class Either<L, R> {
  abstract map<T>(fn: (r: R) => T): Either<L, T>;
  abstract flatMap<T>(fn: (r: R) => Either<L, T>): Either<L, T>;
  abstract fold<T>(leftFn: (l: L) => T, rightFn: (r: R) => T): T;
  
  static left<L, R>(value: L): Either<L, R> {
    return new Left(value);
  }
  
  static right<L, R>(value: R): Either<L, R> {
    return new Right(value);
  }
  
  static tryCatch<L, R>(fn: () => R, onError: (e: any) => L): Either<L, R> {
    try {
      return Either.right(fn());
    } catch (error) {
      return Either.left(onError(error));
    }
  }
}

class Left<L, R> extends Either<L, R> {
  constructor(private readonly value: L) {
    super();
  }
  
  map<T>(_fn: (r: R) => T): Either<L, T> {
    return new Left(this.value);
  }
  
  flatMap<T>(_fn: (r: R) => Either<L, T>): Either<L, T> {
    return new Left(this.value);
  }
  
  fold<T>(leftFn: (l: L) => T, _rightFn: (r: R) => T): T {
    return leftFn(this.value);
  }
}

class Right<L, R> extends Either<L, R> {
  constructor(private readonly value: R) {
    super();
  }
  
  map<T>(fn: (r: R) => T): Either<L, T> {
    return new Right(fn(this.value));
  }
  
  flatMap<T>(fn: (r: R) => Either<L, T>): Either<L, T> {
    return fn(this.value);
  }
  
  fold<T>(_leftFn: (l: L) => T, rightFn: (r: R) => T): T {
    return rightFn(this.value);
  }
}

// 使用例
function parseJSON(json: string): Either<Error, any> {
  return Either.tryCatch(
    () => JSON.parse(json),
    (error) => new Error(`JSON parse error: ${error.message}`),
  );
}

function validateUser(data: any): Either<ValidationError[], User> {
  const errors: ValidationError[] = [];
  
  if (!data.email) {
    errors.push(new ValidationError('email', 'Email is required'));
  }
  
  if (!data.name) {
    errors.push(new ValidationError('name', 'Name is required'));
  }
  
  if (errors.length > 0) {
    return Either.left(errors);
  }
  
  return Either.right(new User(data));
}

// チェーン処理
const result = parseJSON(jsonString)
  .flatMap(data => validateUser(data))
  .map(user => enrichUserData(user))
  .fold(
    errors => console.error('Errors:', errors),
    user => console.log('Success:', user),
  );
```

### カスタム例外階層

ドメイン固有の例外を定義

```typescript
// 基底例外クラス
export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

// 認証関連の例外
export class AuthenticationError extends DomainError {
  constructor(message: string, public readonly reason?: string) {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends DomainError {
  constructor(
    message: string,
    public readonly requiredRole?: string,
    public readonly actualRole?: string,
  ) {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

// バリデーション例外
export class ValidationError extends DomainError {
  constructor(
    public readonly field: string,
    public readonly constraint: string,
    public readonly value?: any,
  ) {
    super(`Validation failed for field '${field}': ${constraint}`, 'VALIDATION_ERROR', 400);
  }
}

export class ValidationException extends DomainError {
  constructor(public readonly errors: ValidationError[]) {
    super(
      'Validation failed',
      'VALIDATION_EXCEPTION',
      400,
    );
  }
  
  toJSON(): object {
    return {
      ...super.toJSON(),
      errors: this.errors.map(e => e.toJSON()),
    };
  }
}

// リソース関連の例外
export class ResourceNotFoundError extends DomainError {
  constructor(
    public readonly resourceType: string,
    public readonly resourceId: string,
  ) {
    super(
      `${resourceType} with ID '${resourceId}' not found`,
      'RESOURCE_NOT_FOUND',
      404,
    );
  }
}

// レート制限例外
export class RateLimitExceededError extends DomainError {
  constructor(
    public readonly limit: RateLimit,
    public readonly resetTime: Date,
  ) {
    super(
      `Rate limit exceeded: ${limit.maxRequests} requests per ${limit.windowSeconds} seconds`,
      'RATE_LIMIT_EXCEEDED',
      429,
    );
  }
  
  get retryAfter(): number {
    return Math.ceil((this.resetTime.getTime() - Date.now()) / 1000);
  }
}
```

## テスト戦略

### ユニットテスト

ビジネスロジックの単体テスト

```typescript
// Jest/Vitestを使用したユニットテストの例
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from './user-service';
import { IUserRepository } from './interfaces';
import { User, UserId, Email, UserTier } from '../domain';

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: IUserRepository;
  let mockEventBus: IEventBus;
  
  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    
    mockEventBus = {
      publish: vi.fn(),
      publishAll: vi.fn(),
      subscribe: vi.fn(),
    };
    
    userService = new UserService(mockRepository, mockEventBus);
  });
  
  describe('createUser', () => {
    it('should create a user successfully with valid data', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        name: 'Test User',
        tier: 'tier1',
      };
      
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(undefined);
      
      // Act
      const result = await userService.createUser(dto);
      
      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.email.value).toBe(dto.email);
        expect(result.value.tier.level).toBe(TierLevel.TIER1);
      }
      
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.objectContaining({ value: dto.email }),
        }),
      );
      
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          getEventName: expect.any(Function),
          userId: expect.any(String),
        }),
      );
    });
    
    it('should fail when email already exists', async () => {
      // Arrange
      const existingUser = User.create({
        id: '123' as UserId,
        email: new Email('existing@example.com'),
        tier: UserTier.TIER1,
      });
      
      mockRepository.findByEmail.mockResolvedValue(existingUser);
      
      // Act
      const result = await userService.createUser({
        email: 'existing@example.com',
        name: 'Test User',
        tier: 'tier1',
      });
      
      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(DuplicateEmailError);
        expect(result.error.message).toContain('existing@example.com');
      }
      
      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
    
    it('should validate user data before creation', async () => {
      // Arrange
      const invalidDto = {
        email: 'invalid-email',
        name: '',
        tier: 'invalid-tier',
      };
      
      // Act
      const result = await userService.createUser(invalidDto);
      
      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationException);
        const validationError = result.error as ValidationException;
        expect(validationError.errors).toHaveLength(3);
        expect(validationError.errors.map(e => e.field)).toContain('email');
        expect(validationError.errors.map(e => e.field)).toContain('name');
        expect(validationError.errors.map(e => e.field)).toContain('tier');
      }
      
      expect(mockRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
  
  describe('updateUserTier', () => {
    it('should update user tier and publish event', async () => {
      // Arrange
      const user = User.create({
        id: '123' as UserId,
        email: new Email('user@example.com'),
        tier: UserTier.TIER1,
      });
      
      mockRepository.findById.mockResolvedValue(user);
      mockRepository.save.mockResolvedValue(undefined);
      
      // Act
      const result = await userService.updateUserTier('123' as UserId, TierLevel.TIER2);
      
      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.tier.level).toBe(TierLevel.TIER2);
      }
      
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          getEventName: expect.any(Function),
          userId: '123',
          fromTier: TierLevel.TIER1,
          toTier: TierLevel.TIER2,
        }),
      );
    });
  });
});
```

### 統合テスト

コンポーネント間の連携をテスト

```typescript
// 統合テストの例 (Fastifyのテスト)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from './app';
import { FastifyInstance } from 'fastify';
import { createTestDatabase, clearTestDatabase } from './test-utils';

describe('API Integration Tests', () => {
  let app: FastifyInstance;
  let authToken: string;
  
  beforeAll(async () => {
    await createTestDatabase();
    app = await build({ logger: false });
    
    // テストユーザーを作成してトークンを取得
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123',
      },
    });
    
    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.access_token;
  });
  
  afterAll(async () => {
    await clearTestDatabase();
    await app.close();
  });
  
  describe('GET /api/data/:path', () => {
    it('should return data for authenticated user with valid tier', async () => {
      // Arrange
      const testPath = 'secure/test-data/sample.json';
      
      // Act
      const response = await app.inject({
        method: 'GET',
        url: `/api/data/${testPath}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('value');
    });
    
    it('should return 401 for unauthenticated request', async () => {
      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/data/secure/test.json',
      });
      
      // Assert
      expect(response.statusCode).toBe(401);
      
      const error = JSON.parse(response.body);
      expect(error).toMatchObject({
        type: 'https://example.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: expect.stringContaining('Missing or invalid token'),
      });
    });
    
    it('should return 429 when rate limit exceeded', async () => {
      // Arrange: tier1ユーザーの制限は60回/分
      const requests = Array.from({ length: 61 }, (_, i) => 
        app.inject({
          method: 'GET',
          url: `/api/data/test-${i}.json`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        }),
      );
      
      // Act
      const responses = await Promise.all(requests);
      
      // Assert
      const successResponses = responses.filter(r => r.statusCode === 200);
      const rateLimitResponses = responses.filter(r => r.statusCode === 429);
      
      expect(successResponses).toHaveLength(60);
      expect(rateLimitResponses).toHaveLength(1);
      
      const rateLimitError = JSON.parse(rateLimitResponses[0].body);
      expect(rateLimitError).toMatchObject({
        type: 'https://example.com/errors/rate-limit-exceeded',
        title: 'Too Many Requests',
        status: 429,
        detail: expect.stringContaining('Rate limit exceeded'),
      });
      
      expect(rateLimitResponses[0].headers).toHaveProperty('retry-after');
    });
    
    it('should return 404 for non-existent data', async () => {
      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/data/non-existent/file.json',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      // Assert
      expect(response.statusCode).toBe(404);
      
      const error = JSON.parse(response.body);
      expect(error).toMatchObject({
        type: 'https://example.com/errors/not-found',
        title: 'Resource not found',
        status: 404,
        detail: 'The requested data file does not exist',
        instance: '/non-existent/file.json',
      });
    });
  });
  
  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Arrange
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });
      
      const { refresh_token } = JSON.parse(loginResponse.body);
      
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: {
          refresh_token,
        },
      });
      
      // Assert
      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('access_token');
      expect(data).toHaveProperty('refresh_token');
      expect(data).toHaveProperty('expires_in');
      expect(data.access_token).not.toBe(authToken); // 新しいトークンが発行される
    });
  });
});
```

### E2Eテスト

エンドツーエンドのシナリオテスト

```typescript
// Playwrightを使用したE2Eテストの例
import { test, expect } from '@playwright/test';
import { setupTestUser, cleanupTestUser } from './e2e-utils';

test.describe('User Authentication Flow', () => {
  let testUser: { email: string; password: string };
  
  test.beforeAll(async () => {
    testUser = await setupTestUser();
  });
  
  test.afterAll(async () => {
    await cleanupTestUser(testUser.email);
  });
  
  test('user can login and access dashboard', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Click login button
    await page.click('button:has-text("Login")');
    
    // Wait for redirect to Supabase Auth
    await page.waitForURL(/supabase\.co\/auth/);
    
    // Fill in credentials
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button:has-text("Sign in")');
    
    // Wait for redirect back to app
    await page.waitForURL('/dashboard');
    
    // Verify dashboard elements
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();
    
    // Verify user info
    await expect(page.locator('[data-testid="user-email"]')).toContainText(testUser.email);
    await expect(page.locator('[data-testid="user-tier"]')).toContainText('Tier 1');
  });
  
  test('API documentation is accessible without authentication', async ({ page }) => {
    // Navigate directly to API docs
    await page.goto('/api-docs');
    
    // Verify Scalar UI is loaded
    await expect(page.locator('.scalar-api-reference')).toBeVisible();
    
    // Verify API endpoints are listed
    await expect(page.locator('text=/api/data/{path}')).toBeVisible();
    await expect(page.locator('text=/api/auth/refresh')).toBeVisible();
    
    // No login button should be present on docs page
    await expect(page.locator('button:has-text("Login")')).not.toBeVisible();
  });
  
  test('rate limiting works correctly', async ({ page, request }) => {
    // Login first to get token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });
    
    const { access_token } = await loginResponse.json();
    
    // Make requests up to the limit
    const requests = [];
    for (let i = 0; i < 61; i++) {
      requests.push(
        request.get(`/api/data/test-${i}.json`, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }),
      );
    }
    
    const responses = await Promise.all(requests);
    
    // First 60 should succeed
    for (let i = 0; i < 60; i++) {
      expect(responses[i].status()).toBe(200);
    }
    
    // 61st should be rate limited
    expect(responses[60].status()).toBe(429);
    
    const rateLimitError = await responses[60].json();
    expect(rateLimitError.type).toBe('https://example.com/errors/rate-limit-exceeded');
  });
});
```

## パフォーマンス最適化

### バンドルサイズの最適化

```typescript
// 動的インポートで遅延読み込み
const heavyModule = await import('./heavy-module');

// Tree-shakingを活用
export { specificFunction } from './utils'; // 必要な関数のみエクスポート

// Production buildでの最適化
// vite.config.ts
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash-es', 'date-fns'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  plugins: [
    visualizer({
      filename: './dist/stats.html',
      open: true,
    }),
  ],
});
```

### メモリ管理

```typescript
// WeakMapでメモリリークを防ぐ
class CacheManager {
  private cache = new WeakMap<object, any>();
  
  set(key: object, value: any): void {
    this.cache.set(key, value);
  }
  
  get(key: object): any {
    return this.cache.get(key);
  }
}

// イベントリスナーの適切な管理
class EventEmitter {
  private listeners = new Map<string, Set<Function>>();
  
  on(event: string, listener: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(listener);
    
    // Cleanup function
    return () => {
      this.listeners.get(event)?.delete(listener);
      if (this.listeners.get(event)?.size === 0) {
        this.listeners.delete(event);
      }
    };
  }
  
  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(listener => {
      listener(...args);
    });
  }
}

// 大量データの処理
async function* processLargeDataset(data: string[]): AsyncGenerator<string> {
  for (const item of data) {
    // バッチ処理で非同期に処理
    yield await processItem(item);
  }
}

// 使用例
for await (const result of processLargeDataset(largeArray)) {
  console.log(result);
}
```

### 型パフォーマンスの最適化

```typescript
// 型の複雑さを減らす
// 悪い例: 深くネストされた条件型
type DeepConditional<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: DeepConditional<O[K]> }
    : never
  : T;

// 良い例: シンプルな型定義
type SimpleTransform<T> = {
  [K in keyof T]: T[K] extends object ? SimpleTransform<T[K]> : T[K];
};

// インターフェースを優先
// 良い例: interfaceは型の拡張が高速
interface User {
  id: string;
  name: string;
  email: string;
}

interface AdminUser extends User {
  permissions: string[];
}

// 型パラメータの制約を明確に
function processItems<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map(item => [item.id, item]));
}
```

## セキュリティベストプラクティス

### 入力検証

```typescript
// ランタイム型チェック with Zod
import { z } from 'zod';

// スキーマ定義
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  tier: z.enum(['tier1', 'tier2', 'tier3']),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

// 検証関数
export function validateCreateUser(input: unknown): Result<CreateUserInput> {
  try {
    const validated = CreateUserSchema.parse(input);
    return Result.ok(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => 
        new ValidationError(e.path.join('.'), e.message),
      );
      return Result.fail(new ValidationException(errors));
    }
    return Result.fail(new Error('Unknown validation error'));
  }
}

// パストラバーサル攻撃の防止
export function sanitizePath(userInput: string): Result<string> {
  // 危険なパターンをチェック
  const dangerousPatterns = [
    '..',
    '~',
    '/etc/',
    '/usr/',
    '\\',
    '%2e%2e',
    '%252e%252e',
  ];
  
  const normalizedPath = path.normalize(userInput);
  
  for (const pattern of dangerousPatterns) {
    if (normalizedPath.includes(pattern)) {
      return Result.fail(new SecurityError('Invalid path detected'));
    }
  }
  
  // 許可されたディレクトリ内かチェック
  const resolvedPath = path.resolve('/data', normalizedPath);
  if (!resolvedPath.startsWith(path.resolve('/data'))) {
    return Result.fail(new SecurityError('Path traversal attempt detected'));
  }
  
  return Result.ok(normalizedPath);
}
```

### SQLインジェクション対策

```typescript
// パラメータ化クエリの使用
export class UserRepository {
  constructor(private readonly db: Database) {}
  
  // 良い例: パラメータ化クエリ
  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.db.query(query, [email]);
    
    return result.rows[0] ? this.mapToUser(result.rows[0]) : null;
  }
  
  // 良い例: 複数条件でのパラメータ化
  async findByFilters(filters: UserFilters): Promise<User[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filters.email) {
      conditions.push(`email = $${paramIndex++}`);
      params.push(filters.email);
    }
    
    if (filters.tier) {
      conditions.push(`tier = $${paramIndex++}`);
      params.push(filters.tier);
    }
    
    if (filters.createdAfter) {
      conditions.push(`created_at > $${paramIndex++}`);
      params.push(filters.createdAfter);
    }
    
    const query = `
      SELECT * FROM users
      ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
      ORDER BY created_at DESC
    `;
    
    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapToUser(row));
  }
}
```

### XSS対策

```typescript
// HTMLエスケープ
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Content Security Policy設定
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.example.com",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// Fastifyでのヘッダー設定
app.addHook('onSend', async (request, reply) => {
  Object.entries(securityHeaders).forEach(([header, value]) => {
    reply.header(header, value);
  });
});
```

### 認証・認可の実装

```typescript
// JWT検証ミドルウェア
export const authMiddleware: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = extractBearerToken(request.headers.authorization);
      if (!token) {
        throw new UnauthorizedError('Missing authentication token');
      }
      
      const payload = await verifyJWT(token, fastify.config.JWT_SECRET);
      
      // トークンの有効期限チェック
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new UnauthorizedError('Token expired');
      }
      
      // ユーザー情報をリクエストに添付
      request.user = {
        id: payload.sub,
        tier: payload.app_metadata?.tier || 'tier1',
      };
    } catch (error) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: error.message,
      });
    }
  });
};

// 認可デコレータ
export function RequireTier(minTier: TierLevel) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (request: FastifyRequest, reply: FastifyReply) {
      const userTier = getUserTier(request.user);
      
      if (!userTier.isHigherThanOrEqualTo(minTier)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: `This endpoint requires ${minTier} or higher`,
        });
      }
      
      return originalMethod.call(this, request, reply);
    };
    
    return descriptor;
  };
}

// 使用例
export class DataController {
  @RequireTier(TierLevel.TIER2)
  async getPremiumData(request: FastifyRequest, reply: FastifyReply) {
    // Tier2以上のユーザーのみアクセス可能
    const data = await this.dataService.getPremiumData();
    return reply.send(data);
  }
}
```

## Fastify固有のパターン

### プラグインアーキテクチャ

```typescript
// プラグインの作成
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// 自動的にencapsulationを無効化するプラグイン
export const databasePlugin = fp(async (fastify, options) => {
  const db = await createDatabaseConnection(options);
  
  // Fastifyインスタンスにデコレート
  fastify.decorate('db', db);
  
  // グレースフルシャットダウン
  fastify.addHook('onClose', async () => {
    await db.close();
  });
}, {
  name: 'database-plugin',
  dependencies: ['config-plugin'], // 依存関係を明示
});

// 使用側
declare module 'fastify' {
  interface FastifyInstance {
    db: DatabaseConnection;
  }
}
```

### ルート定義のベストプラクティス

```typescript
// routes/users/index.ts
import { FastifyPluginAsync } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

// スキーマ定義
const UserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  tier: Type.Union([
    Type.Literal('tier1'),
    Type.Literal('tier2'),
    Type.Literal('tier3'),
  ]),
});

const CreateUserSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  tier: Type.Optional(Type.String({ pattern: '^tier[123]$' })),
});

type User = Static<typeof UserSchema>;
type CreateUserBody = Static<typeof CreateUserSchema>;

export const usersRoute: FastifyPluginAsync = async (fastify) => {
  // 依存性の取得
  const userService = fastify.diContainer.resolve(UserService);
  
  // POST /users
  fastify.post<{ Body: CreateUserBody }>('/users', {
    schema: {
      body: CreateUserSchema,
      response: {
        201: UserSchema,
        400: ErrorSchema,
        409: ErrorSchema,
      },
    },
    preHandler: [fastify.authenticate, fastify.requireTier('tier2')],
  }, async (request, reply) => {
    const result = await userService.createUser(request.body);
    
    if (result.isFailure) {
      return reply.code(400).send({
        error: result.error.message,
        code: result.error.code,
      });
    }
    
    return reply.code(201).send(result.value);
  });
  
  // GET /users/:id
  fastify.get<{ Params: { id: string } }>('/users/:id', {
    schema: {
      params: Type.Object({
        id: Type.String({ format: 'uuid' }),
      }),
      response: {
        200: UserSchema,
        404: ErrorSchema,
      },
    },
    preHandler: fastify.authenticate,
  }, async (request, reply) => {
    const result = await userService.getUser(request.params.id);
    
    if (result.isFailure) {
      return reply.code(404).send({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }
    
    return result.value;
  });
};
```

### カスタムフックとデコレータ

```typescript
// hooks/auth.ts
export const authHooks: FastifyPluginAsync = async (fastify) => {
  // 認証フック
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractBearerToken(request.headers.authorization);
    
    if (!token) {
      throw new UnauthorizedError('Missing authentication token');
    }
    
    const result = await fastify.authService.validateToken(token);
    if (result.isFailure) {
      throw new UnauthorizedError(result.error.message);
    }
    
    request.user = result.value;
  });
  
  // 認可フック
  fastify.decorate('requireTier', (minTier: TierLevel) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        throw new UnauthorizedError('Authentication required');
      }
      
      if (!request.user.tier.isHigherThanOrEqualTo(minTier)) {
        throw new ForbiddenError(`This resource requires ${minTier} or higher`);
      }
    };
  });
};

// TypeScript宣言の拡張
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
  
  interface FastifyInstance {
    authenticate: preHandlerHookHandler;
    requireTier: (tier: TierLevel) => preHandlerHookHandler;
  }
}
```

### エラーハンドリング

```typescript
// error-handler.ts
export const errorHandler: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    // ロギング
    fastify.log.error({
      err: error,
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
        params: request.params,
        query: request.query,
      },
    });
    
    // ドメインエラーの処理
    if (error instanceof DomainError) {
      return reply.code(error.statusCode).send({
        type: `https://api.example.com/errors/${error.code}`,
        title: error.name,
        status: error.statusCode,
        detail: error.message,
        instance: request.url,
      });
    }
    
    // バリデーションエラー
    if (error.validation) {
      return reply.code(400).send({
        type: 'https://api.example.com/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: 'Request validation failed',
        errors: error.validation,
      });
    }
    
    // レート制限エラー
    if (error instanceof RateLimitError) {
      reply.header('Retry-After', error.retryAfter.toString());
      return reply.code(429).send({
        type: 'https://api.example.com/errors/rate-limit',
        title: 'Too Many Requests',
        status: 429,
        detail: error.message,
        retryAfter: error.retryAfter,
      });
    }
    
    // 予期しないエラー
    const isProduction = process.env.NODE_ENV === 'production';
    return reply.code(500).send({
      type: 'https://api.example.com/errors/internal',
      title: 'Internal Server Error',
      status: 500,
      detail: isProduction ? 'An unexpected error occurred' : error.message,
      ...(isProduction ? {} : { stack: error.stack }),
    });
  });
};
```

## コード組織化とモジュールパターン

### プロジェクト構造

```text
src/
├── domain/                    # ドメイン層
│   ├── entities/             # エンティティ
│   │   ├── user.ts
│   │   └── order.ts
│   ├── value-objects/        # 値オブジェクト
│   │   ├── email.ts
│   │   ├── money.ts
│   │   └── user-id.ts
│   ├── services/             # ドメインサービス
│   │   └── pricing-service.ts
│   ├── repositories/         # リポジトリインターフェース
│   │   └── user-repository.interface.ts
│   ├── events/              # ドメインイベント
│   │   └── user-events.ts
│   └── errors/              # ドメイン例外
│       └── domain-errors.ts
│
├── application/             # アプリケーション層
│   ├── use-cases/          # ユースケース
│   │   ├── create-user/
│   │   │   ├── create-user.usecase.ts
│   │   │   ├── create-user.dto.ts
│   │   │   └── create-user.test.ts
│   │   └── authenticate/
│   ├── interfaces/         # 外部サービスインターフェース
│   │   └── auth-service.interface.ts
│   └── services/          # アプリケーションサービス
│       └── notification.service.ts
│
├── infrastructure/        # インフラストラクチャ層
│   ├── repositories/     # リポジトリ実装
│   │   └── user-repository.postgres.ts
│   ├── services/        # 外部サービス実装
│   │   └── supabase-auth.service.ts
│   ├── config/         # 設定
│   │   ├── database.config.ts
│   │   └── app.config.ts
│   └── adapters/       # アダプター
│       └── event-bus.adapter.ts
│
├── presentation/       # プレゼンテーション層
│   ├── api/           # REST API
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── controllers/
│   │   └── schemas/
│   └── web/          # フロントエンド
│       ├── pages/
│       ├── components/
│       └── hooks/
│
├── shared/           # 共有コード
│   ├── types/       # 共通型定義
│   ├── utils/       # ユーティリティ
│   └── constants/   # 定数
│
└── main.ts          # エントリーポイント
```

### バレルエクスポート

```typescript
// domain/entities/index.ts
export { User } from './user';
export { Order } from './order';
export { Product } from './product';

// domain/value-objects/index.ts
export { Email } from './email';
export { Money } from './money';
export { UserId } from './user-id';
export { Address } from './address';

// domain/index.ts
export * from './entities';
export * from './value-objects';
export * from './services';
export * from './events';
export * from './errors';

// 使用側
import { User, Email, Money, DomainError } from '@/domain';
```

### 依存性注入（DI）

```typescript
// DIコンテナの設定 (tsyringe使用例)
import 'reflect-metadata';
import { container } from 'tsyringe';
import { IUserRepository, IAuthService, IEventBus } from './interfaces';
import { PostgresUserRepository, SupabaseAuthService, EventBusImpl } from './infrastructure';

// インターフェースとトークンの定義
export const TOKENS = {
  UserRepository: Symbol('UserRepository'),
  AuthService: Symbol('AuthService'),
  EventBus: Symbol('EventBus'),
  Logger: Symbol('Logger'),
  Database: Symbol('Database'),
} as const;

// 依存関係の登録
export function configureDependencies(): void {
  // シングルトン
  container.registerSingleton(TOKENS.Database, DatabaseConnection);
  container.registerSingleton(TOKENS.EventBus, EventBusImpl);
  container.registerSingleton(TOKENS.Logger, PinoLogger);
  
  // スコープド（リクエストごと）
  container.register(TOKENS.UserRepository, {
    useClass: PostgresUserRepository,
  }, { lifecycle: Lifecycle.Scoped });
  
  // 設定値の注入
  container.register('DatabaseConfig', {
    useValue: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  });
}

// 使用例
@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(TOKENS.UserRepository) private readonly userRepository: IUserRepository,
    @inject(TOKENS.EventBus) private readonly eventBus: IEventBus,
    @inject(TOKENS.Logger) private readonly logger: ILogger,
  ) {}
  
  async execute(dto: CreateUserDto): Promise<Result<User>> {
    this.logger.info('Creating user', { email: dto.email });
    
    // ビジネスロジック
    const user = User.create(dto);
    if (user.isFailure) {
      return user;
    }
    
    await this.userRepository.save(user.value);
    await this.eventBus.publish(new UserCreatedEvent(user.value));
    
    return Result.ok(user.value);
  }
}

// Fastifyでの統合
export async function buildApp(): Promise<FastifyInstance> {
  configureDependencies();
  
  const app = fastify({
    logger: container.resolve(TOKENS.Logger),
  });
  
  // ルート登録時にDIコンテナから解決
  app.get('/users/:id', async (request, reply) => {
    const useCase = container.resolve(GetUserUseCase);
    const result = await useCase.execute(request.params.id);
    
    if (result.isFailure) {
      return reply.code(404).send({ error: result.error.message });
    }
    
    return reply.send(result.value);
  });
  
  return app;
}
```

## 非同期処理のベストプラクティス

### async/awaitの適切な使用

```typescript
// 良い例: エラーハンドリングを含む非同期処理
export class DataService {
  async fetchData(id: string): Promise<Result<Data>> {
    try {
      // 並行実行が可能な処理はPromise.allで実行
      const [metadata, content] = await Promise.all([
        this.fetchMetadata(id),
        this.fetchContent(id),
      ]);
      
      return Result.ok({ metadata, content });
    } catch (error) {
      // エラーの型を絞り込む
      if (error instanceof NetworkError) {
        return Result.fail(new ServiceUnavailableError('Network error', error));
      }
      
      return Result.fail(new UnknownError('Failed to fetch data', error));
    }
  }
  
  // 順次実行が必要な場合
  async processSequentially(items: Item[]): Promise<Result<ProcessedItem[]>> {
    const results: ProcessedItem[] = [];
    
    for (const item of items) {
      const result = await this.processItem(item);
      if (result.isFailure) {
        // 早期リターン
        return Result.fail(result.error);
      }
      results.push(result.value);
    }
    
    return Result.ok(results);
  }
  
  // バッチ処理での並行実行制御
  async processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<Result<ProcessedItem>>,
    batchSize: number = 5,
  ): Promise<Result<ProcessedItem[]>> {
    const results: ProcessedItem[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => processor(item)),
      );
      
      // エラーチェック
      const errors = batchResults.filter(r => r.isFailure);
      if (errors.length > 0) {
        return Result.fail(new BatchProcessingError(errors.map(e => e.error)));
      }
      
      results.push(...batchResults.map(r => r.value));
    }
    
    return Result.ok(results);
  }
}
```

### Promise のタイムアウト処理

```typescript
// タイムアウト付きPromiseラッパー
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(errorMessage)), timeoutMs),
    ),
  ]);
}

// 使用例
const result = await withTimeout(
  fetchDataFromSlowAPI(),
  5000,
  'API request timed out after 5 seconds',
);
```

### 非同期イテレータの活用

```typescript
// 大量データのストリーミング処理
export async function* streamLargeFile(
  filePath: string,
  chunkSize: number = 1024 * 1024, // 1MB
): AsyncGenerator<Buffer, void, unknown> {
  const fileHandle = await fs.open(filePath, 'r');
  
  try {
    const buffer = Buffer.alloc(chunkSize);
    let position = 0;
    
    while (true) {
      const { bytesRead } = await fileHandle.read(buffer, 0, chunkSize, position);
      
      if (bytesRead === 0) {
        break;
      }
      
      yield buffer.slice(0, bytesRead);
      position += bytesRead;
    }
  } finally {
    await fileHandle.close();
  }
}

// 使用例
for await (const chunk of streamLargeFile('large-file.json')) {
  await processChunk(chunk);
}
```

## 全般的なガイドライン

* **純粋関数の活用**: 副作用のない関数を優先し、テスタビリティと予測可能性を向上させる
* **イミュータビリティ**: オブジェクトの不変性を保ち、予期しない変更を防ぐ
* **エラーファースト**: エラーケースを先に処理し、正常系をネストしない
* **型推論の活用**: 明示的な型注釈は必要な箇所のみに留め、TypeScriptの型推論を活用する
* **Null安全性**: Optional chainingやNullish coalescingを活用してnull/undefinedを安全に扱う
* **非同期処理**: async/awaitを一貫して使用し、適切なエラーハンドリングを実装する
* **ログ**: 構造化ログを使用し、適切なログレベルで記録する
* **ドキュメント**: JSDocコメントで公開APIを文書化し、型情報は自己文書化とする
* **パッケージ管理**: package.jsonのdependenciesとdevDependenciesを適切に分離する
* **環境変数**: dotenvとzodで型安全な環境変数の管理を行う
* **コードフォーマット**: Prettierで統一的なフォーマットを維持する
* **リンティング**: ESLintで一貫したコード品質を保つ
* **プリコミットフック**: husky + lint-stagedで品質チェックを自動化する
* **CI/CD**: GitHub Actionsで自動テストとデプロイを設定する
* **型定義**: @typesパッケージの適切な管理とカスタム型定義の作成

### 環境変数の型安全な管理

```typescript
// env.schema.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.string().transform(Number).pipe(z.number().positive()),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  RATE_LIMIT_TIER1: z.string().transform(Number).default('60'),
  RATE_LIMIT_TIER2: z.string().transform(Number).default('120'),
  RATE_LIMIT_TIER3: z.string().transform(Number).default('300'),
});

export type Env = z.infer<typeof envSchema>;

// 環境変数の検証と型付け
export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  
  return parsed.data;
}

// 使用
export const env = validateEnv();

// 型安全にアクセス
console.log(`Server running on port ${env.PORT}`);
```

### コード品質の自動化

```json
// package.json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,json,md}\"",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'import', 'unicorn'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:unicorn/recommended',
    'prettier',
  ],
  rules: {
    // TypeScript
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    
    // Import
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      },
    ],
    
    // Unicorn
    'unicorn/filename-case': [
      'error',
      {
        case: 'kebabCase',
      },
    ],
  },
};
```

### Vite + TypeScriptフロントエンド

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // または vue, svelte など
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(), // TypeScriptのパスエイリアスをサポート
  ],
  
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@hooks': '/src/hooks',
      '@utils': '/src/utils',
      '@types': '/src/types',
    },
  },
  
  build: {
    target: 'es2022',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
  
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

```typescript
// src/hooks/use-auth.ts
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // 初期セッションの取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  const signIn = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    
    if (error) {
      throw new AuthError('Sign in failed', error.message);
    }
  };
  
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new AuthError('Sign out failed', error.message);
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

```typescript
// src/components/protected-route.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
}
```

### TypeScript設定のベストプラクティス

```json
// tsconfig.json
{
  "compilerOptions": {
    // 型チェックの厳密性
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    
    // 追加の型チェック
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    
    // モジュール設定
    "module": "ES2022",
    "target": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    
    // パス設定
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@domain/*": ["domain/*"],
      "@application/*": ["application/*"],
      "@infrastructure/*": ["infrastructure/*"],
      "@presentation/*": ["presentation/*"],
      "@shared/*": ["shared/*"]
    },
    
    // 出力設定
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    
    // その他
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "coverage", "**/*.test.ts", "**/*.spec.ts"],
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  }
}
```

```json
// tsconfig.build.json (ビルド用)
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "removeComments": true,
    "sourceMap": false
  },
  "exclude": [
    "node_modules",
    "dist",
    "coverage",
    "**/*.test.ts",
    "**/*.spec.ts",
    "src/**/__tests__/**/*",
    "src/**/__mocks__/**/*"
  ]
}
```

このガイドラインに従うことで、保守性が高く、型安全で、パフォーマンスに優れたTypeScriptアプリケーションを構築できます。プロジェクトの要件に応じて、これらのガイドラインを適切にカスタマイズしてください。