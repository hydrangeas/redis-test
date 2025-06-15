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
  RateLimitLogRepository: Symbol.for('RateLimitLogRepository'),
  AuthLogRepository: Symbol.for('AuthLogRepository'),
  ApiLogRepository: Symbol.for('ApiLogRepository'),
  OpenDataRepository: Symbol.for('OpenDataRepository'),
  APILogRepository: Symbol.for('APILogRepository'),
  
  // Domain Services
  AuthenticationService: Symbol.for('AuthenticationService'),
  RateLimitService: Symbol.for('RateLimitService'),
  DataAccessService: Symbol.for('DataAccessService'),
  APIAccessControlService: Symbol.for('APIAccessControlService'),
  LogAnalysisService: Symbol.for('LogAnalysisService'),
  
  // Application Services
  AuthenticationUseCase: Symbol.for('AuthenticationUseCase'),
  DataRetrievalUseCase: Symbol.for('DataRetrievalUseCase'),
  DataAccessUseCase: Symbol.for('DataAccessUseCase'),
  RateLimitUseCase: Symbol.for('RateLimitUseCase'),
  APIAccessControlUseCase: Symbol.for('APIAccessControlUseCase'),
  
  // Infrastructure Services
  JwtService: Symbol.for('JwtService'),
  JWTValidator: Symbol.for('JWTValidator'),
  FileStorageService: Symbol.for('FileStorageService'),
  FileStorage: Symbol.for('FileStorage'),
  SecurityAuditService: Symbol.for('SecurityAuditService'),
  SecurityAlertService: Symbol.for('SecurityAlertService'),
  AuthAdapter: Symbol.for('AuthAdapter'),
  NotificationService: Symbol.for('NotificationService'),
  SupabaseService: Symbol.for('SupabaseService'),
  
  // Factories
  OpenDataResourceFactory: Symbol.for('OpenDataResourceFactory'),
} as const;