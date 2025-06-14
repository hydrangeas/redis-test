import { inject, injectable, singleton } from 'tsyringe';
import { DI_TOKENS } from './tokens.js';

/**
 * Decorator shortcuts for common injection patterns
 */

// Infrastructure decorators
export const InjectLogger = () => inject(DI_TOKENS.Logger);
export const InjectSupabaseClient = () => inject(DI_TOKENS.SupabaseClient);
export const InjectFileService = () => inject(DI_TOKENS.FileService);
export const InjectJwtService = () => inject(DI_TOKENS.JwtService);

// Repository decorators
export const InjectUserRepository = () => inject(DI_TOKENS.UserRepository);
export const InjectRateLimitRepository = () => inject(DI_TOKENS.RateLimitRepository);
export const InjectDataRepository = () => inject(DI_TOKENS.DataRepository);

// Domain service decorators
export const InjectAuthenticationService = () => inject(DI_TOKENS.AuthenticationService);
export const InjectRateLimitService = () => inject(DI_TOKENS.RateLimitService);
export const InjectDataAccessService = () => inject(DI_TOKENS.DataAccessService);

// Application service decorators
export const InjectAuthenticationUseCase = () => inject(DI_TOKENS.AuthenticationUseCase);
export const InjectDataRetrievalUseCase = () => inject(DI_TOKENS.DataRetrievalUseCase);
export const InjectRateLimitUseCase = () => inject(DI_TOKENS.RateLimitUseCase);

// Configuration decorators
export const InjectAppConfig = () => inject(DI_TOKENS.AppConfig);
export const InjectDatabaseConfig = () => inject(DI_TOKENS.DatabaseConfig);
export const InjectAuthConfig = () => inject(DI_TOKENS.AuthConfig);

// Re-export common decorators
export { injectable, singleton };