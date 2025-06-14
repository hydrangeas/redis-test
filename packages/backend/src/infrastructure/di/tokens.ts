/**
 * Dependency Injection tokens for TSyringe container
 * These tokens are used to identify dependencies in the container
 */
export const DI_TOKENS = {
  // Infrastructure
  Database: Symbol('IDatabase'),
  EventBus: Symbol('IEventBus'),
  Logger: Symbol('ILogger'),
  
  // Repositories
  UserRepository: Symbol('IUserRepository'),
  RateLimitRepository: Symbol('IRateLimitRepository'),
  DataRepository: Symbol('IDataRepository'),
  
  // Domain Services
  AuthenticationService: Symbol('IAuthenticationService'),
  RateLimitService: Symbol('IRateLimitService'),
  DataAccessService: Symbol('IDataAccessService'),
  
  // Application Services
  AuthenticationUseCase: Symbol('AuthenticationUseCase'),
  DataRetrievalUseCase: Symbol('DataRetrievalUseCase'),
  RateLimitUseCase: Symbol('RateLimitUseCase'),
  
  // Infrastructure Services
  SupabaseClient: Symbol('SupabaseClient'),
  JwtService: Symbol('IJwtService'),
  FileService: Symbol('IFileService'),
  
  // Configuration
  AppConfig: Symbol('AppConfig'),
  DatabaseConfig: Symbol('DatabaseConfig'),
  AuthConfig: Symbol('AuthConfig'),
  EnvConfig: Symbol('EnvConfig'),
} as const;

export type DITokens = typeof DI_TOKENS;