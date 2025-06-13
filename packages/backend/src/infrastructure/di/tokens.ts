/**
 * DIコンテナで使用するトークン定義
 * 型安全な依存性注入のための定数
 */
export const DI_TOKENS = {
  // Core Services
  Logger: Symbol.for('Logger'),
  EventBus: Symbol.for('EventBus'),
  EventStore: Symbol.for('EventStore'),
  
  // Configuration
  EnvConfig: Symbol.for('EnvConfig'),
  DataDirectory: Symbol.for('DataDirectory'),
  
  // Database
  SupabaseClient: Symbol.for('SupabaseClient'),
  
  // Repositories
  UserRepository: Symbol.for('UserRepository'),
  RateLimitRepository: Symbol.for('RateLimitRepository'),
  AuthLogRepository: Symbol.for('AuthLogRepository'),
  ApiLogRepository: Symbol.for('ApiLogRepository'),
  OpenDataRepository: Symbol.for('OpenDataRepository'),
  APILogRepository: Symbol.for('APILogRepository'),
  
  // Domain Services
  AuthenticationService: Symbol.for('AuthenticationService'),
  RateLimitService: Symbol.for('RateLimitService'),
  DataAccessService: Symbol.for('DataAccessService'),
  
  // Application Services
  AuthenticationUseCase: Symbol.for('AuthenticationUseCase'),
  DataRetrievalUseCase: Symbol.for('DataRetrievalUseCase'),
  
  // Infrastructure Services
  JwtService: Symbol.for('JwtService'),
  FileStorageService: Symbol.for('FileStorageService'),
  SecurityAuditService: Symbol.for('SecurityAuditService'),
} as const;