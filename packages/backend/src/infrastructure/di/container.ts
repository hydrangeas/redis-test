import 'reflect-metadata';
import { container } from 'tsyringe';
import { DI_TOKENS } from './tokens.js';
import { SupabaseClient } from '../supabase/client.js';
import { FileService } from '../services/file.service.js';
import { JwtService } from '../services/jwt.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { RateLimitRepository } from '../repositories/rate-limit.repository.js';
import { DataRepository } from '../repositories/data.repository.js';
import { AuthenticationService } from '../../domain/services/authentication.service.js';
import { RateLimitService } from '../../domain/services/rate-limit.service.js';
import { DataAccessService } from '../../domain/services/data-access.service.js';
import { AuthenticationUseCase } from '../../application/use-cases/authentication.use-case.js';
import { DataRetrievalUseCase } from '../../application/use-cases/data-retrieval.use-case.js';
import { RateLimitUseCase } from '../../application/use-cases/rate-limit.use-case.js';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import type { FastifyInstance } from 'fastify';

/**
 * Setup the dependency injection container
 * This function registers all dependencies and their implementations
 */
export const setupContainer = (app: FastifyInstance): void => {
  // Configuration
  const config = {
    supabase: {
      url: app.config.SUPABASE_URL,
      anonKey: app.config.SUPABASE_ANON_KEY,
      serviceKey: app.config.SUPABASE_SERVICE_KEY,
    },
    auth: {
      jwtSecret: app.config.JWT_SECRET,
    },
    app: {
      environment: app.config.NODE_ENV,
      dataPath: app.config.DATA_PATH || './data',
    },
  };

  container.register(DI_TOKENS.AppConfig, { useValue: config.app });
  container.register(DI_TOKENS.DatabaseConfig, { useValue: config.supabase });
  container.register(DI_TOKENS.AuthConfig, { useValue: config.auth });

  // Logger
  container.register(DI_TOKENS.Logger, {
    useValue: app.log || pino({ level: 'info' }),
  });

  // Supabase Client
  const supabaseClient = createClient(config.supabase.url, config.supabase.serviceKey);
  container.register(DI_TOKENS.SupabaseClient, { useValue: supabaseClient });

  // Infrastructure Services
  container.register(DI_TOKENS.FileService, { useClass: FileService });
  container.register(DI_TOKENS.JwtService, { useClass: JwtService });

  // Repositories
  container.register(DI_TOKENS.UserRepository, { useClass: UserRepository });
  container.register(DI_TOKENS.RateLimitRepository, { useClass: RateLimitRepository });
  container.register(DI_TOKENS.DataRepository, { useClass: DataRepository });

  // Domain Services
  container.register(DI_TOKENS.AuthenticationService, { useClass: AuthenticationService });
  container.register(DI_TOKENS.RateLimitService, { useClass: RateLimitService });
  container.register(DI_TOKENS.DataAccessService, { useClass: DataAccessService });

  // Application Services (Use Cases)
  container.register(DI_TOKENS.AuthenticationUseCase, { useClass: AuthenticationUseCase });
  container.register(DI_TOKENS.DataRetrievalUseCase, { useClass: DataRetrievalUseCase });
  container.register(DI_TOKENS.RateLimitUseCase, { useClass: RateLimitUseCase });
};

/**
 * Get the configured container instance
 */
export const getContainer = () => container;

/**
 * Reset the container (useful for testing)
 */
export const resetContainer = () => {
  container.reset();
};

// Re-export for backward compatibility
export { setupDI } from './setup.js';