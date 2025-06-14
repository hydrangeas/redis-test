import 'reflect-metadata';
import { container } from 'tsyringe';
import { DI_TOKENS } from './tokens.js';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env.local') });

/**
 * Setup DI container without Fastify dependency
 * This is for backward compatibility with existing code
 */
export const setupDI = async (): Promise<void> => {
  // Environment configuration
  const config = {
    supabase: {
      url: process.env.SUPABASE_URL!,
      anonKey: process.env.SUPABASE_ANON_KEY!,
      serviceKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!,
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET!,
    },
    app: {
      environment: process.env.NODE_ENV || 'development',
      dataPath: process.env.DATA_PATH || './data',
      port: parseInt(process.env.PORT || '8000', 10),
      host: process.env.HOST || '0.0.0.0',
    },
  };

  // Register config
  container.register(DI_TOKENS.AppConfig, { useValue: config.app });
  container.register(DI_TOKENS.DatabaseConfig, { useValue: config.supabase });
  container.register(DI_TOKENS.AuthConfig, { useValue: config.auth });
  
  // Environment config for backward compatibility
  container.register(DI_TOKENS.EnvConfig, { useValue: {
    NODE_ENV: config.app.environment,
    PORT: config.app.port,
    HOST: config.app.host,
    SUPABASE_URL: config.supabase.url,
    SUPABASE_ANON_KEY: config.supabase.anonKey,
    SUPABASE_SERVICE_KEY: config.supabase.serviceKey,
    JWT_SECRET: config.auth.jwtSecret,
    DATA_PATH: config.app.dataPath,
  }});

  // Logger
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  });
  
  container.register(DI_TOKENS.Logger, { useValue: logger });

  // Supabase Client
  const supabaseClient = createClient(config.supabase.url, config.supabase.serviceKey);
  container.register(DI_TOKENS.SupabaseClient, { useValue: supabaseClient });

  // Import and register all services
  const { FileService } = await import('../services/file.service.js');
  const { JwtService } = await import('../services/jwt.service.js');
  const { UserRepository } = await import('../repositories/user.repository.js');
  const { RateLimitRepository } = await import('../repositories/rate-limit.repository.js');
  const { DataRepository } = await import('../repositories/data.repository.js');
  const { AuthenticationService } = await import('../../domain/services/authentication.service.js');
  const { RateLimitService } = await import('../../domain/services/rate-limit.service.js');
  const { DataAccessService } = await import('../../domain/services/data-access.service.js');
  const { AuthenticationUseCase } = await import('../../application/use-cases/authentication.use-case.js');
  const { DataRetrievalUseCase } = await import('../../application/use-cases/data-retrieval.use-case.js');
  const { RateLimitUseCase } = await import('../../application/use-cases/rate-limit.use-case.js');

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