/**
 * Dependency Injection tokens for type-safe injection
 * These tokens are used to register and resolve dependencies in the TSyringe container
 */

export const DI_TOKENS = {
  // Configuration
  EnvConfig: Symbol.for('EnvConfig'),
  DataDirectory: Symbol.for('DataDirectory'),
  
  // External Services
  SupabaseService: Symbol.for('SupabaseService'),
  SupabaseClient: Symbol.for('SupabaseClient'),
  
  // Infrastructure Services
  EventBus: Symbol.for('IEventBus'),
  EventStore: Symbol.for('IEventStore'),
  Database: Symbol.for('IDatabase'),
  Logger: Symbol.for('ILogger'),
  Cache: Symbol.for('ICache'),
  FileStorage: Symbol.for('IFileStorage'),
  FileStorageService: Symbol.for('IFileStorageService'),
  
  // Auth Related
  AuthAdapter: Symbol.for('IAuthAdapter'),
  JWTValidator: Symbol.for('IJWTValidator'),
  JwtService: Symbol.for('IJwtService'),
  
  // Repositories
  RateLimitRepository: Symbol.for('IRateLimitRepository'),
  RateLimitLogRepository: Symbol.for('IRateLimitLogRepository'),
  AuthLogRepository: Symbol.for('IAuthLogRepository'),
  APILogRepository: Symbol.for('IAPILogRepository'),
  ApiLogRepository: Symbol.for('IApiLogRepository'), // Alias for backward compatibility
  UserRepository: Symbol.for('IUserRepository'),
  OpenDataRepository: Symbol.for('IOpenDataRepository'),
  
  // Domain Services
  RateLimitService: Symbol.for('IRateLimitService'),
  AuthenticationService: Symbol.for('IAuthenticationService'),
  AuthorizationService: Symbol.for('IAuthorizationService'),
  DataAccessService: Symbol.for('IDataAccessService'),
  APIAccessControlService: Symbol.for('IAPIAccessControlService'),
  SecurityAuditService: Symbol.for('ISecurityAuditService'),
  SecureFileAccessService: Symbol.for('ISecureFileAccessService'),
  ApiLogService: Symbol.for('IApiLogService'),
  
  // Application Services (Use Cases)
  AuthenticationUseCase: Symbol.for('AuthenticationUseCase'),
  DataAccessUseCase: Symbol.for('DataAccessUseCase'),
  DataRetrievalUseCase: Symbol.for('DataRetrievalUseCase'),
  RateLimitUseCase: Symbol.for('RateLimitUseCase'),
  APIAccessControlUseCase: Symbol.for('APIAccessControlUseCase'),
  
  // Factories
  OpenDataResourceFactory: Symbol.for('IOpenDataResourceFactory'),
  
  // Event Handlers
  RateLimitExceededHandler: Symbol.for('RateLimitExceededHandler'),
  AuthEventHandler: Symbol.for('AuthEventHandler'),
  
  // Plugins
  AuthPlugin: Symbol.for('AuthPlugin'),
  RateLimitPlugin: Symbol.for('RateLimitPlugin'),
  ErrorHandlerPlugin: Symbol.for('ErrorHandlerPlugin'),
} as const;

/**
 * Type helper to extract the token type
 */
export type DIToken = typeof DI_TOKENS[keyof typeof DI_TOKENS];

/**
 * Interface token type for better type safety
 */
export interface InjectionToken<T> {
  token: symbol;
  _type?: T; // phantom type for TypeScript inference
}

/**
 * Helper function to create typed injection tokens
 */
export function createToken<T>(name: string): InjectionToken<T> {
  return {
    token: Symbol.for(name),
  };
}

/**
 * Lifecycle scopes for dependency registration
 */
export enum LifecycleScope {
  Singleton = 'singleton',
  Scoped = 'scoped',
  Transient = 'transient',
}