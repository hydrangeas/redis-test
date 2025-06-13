import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import { pino, Logger } from 'pino';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DI_TOKENS } from './tokens';
import { getEnvConfig, type EnvConfig } from '../config';
import path from 'path';

/**
 * DIコンテナのセットアップ
 * アプリケーション起動時に一度だけ実行される
 */
export async function setupDI(): Promise<DependencyContainer> {
  // 環境変数設定の登録
  const envConfig = getEnvConfig();
  container.register<EnvConfig>(DI_TOKENS.EnvConfig, {
    useValue: envConfig,
  });

  // ロガーの登録
  const logger = pino({
    level: envConfig.LOG_LEVEL,
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  });
  container.register<Logger>(DI_TOKENS.Logger, {
    useValue: logger,
  });

  // Supabaseクライアントの登録
  const supabaseClient = createClient(
    envConfig.SUPABASE_URL,
    envConfig.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  container.register<SupabaseClient>(DI_TOKENS.SupabaseClient, {
    useValue: supabaseClient,
  });

  // データディレクトリの登録
  const dataDirectory = path.resolve(process.cwd(), 'data');
  container.register<string>(DI_TOKENS.DataDirectory, {
    useValue: dataDirectory,
  });

  // 後続タスクで実装されるサービスの登録場所
  // registerRepositories(container);
  // registerDomainServices(container);
  // registerApplicationServices(container);
  // registerInfrastructureServices(container);

  logger.info('DI container setup completed');
  
  return container;
}

/**
 * テスト用のDIコンテナセットアップ
 */
export function setupTestDI(): DependencyContainer {
  container.reset();

  // テスト用の環境変数
  const testEnvConfig: EnvConfig = {
    NODE_ENV: 'development',
    PORT: 8080,
    HOST: '0.0.0.0',
    LOG_LEVEL: 'error',
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    JWT_SECRET: 'test-secret-at-least-32-characters-long',
    API_BASE_URL: 'http://localhost:8080',
    FRONTEND_URL: 'http://localhost:3000',
    RATE_LIMIT_TIER1: 60,
    RATE_LIMIT_TIER2: 120,
    RATE_LIMIT_TIER3: 300,
    RATE_LIMIT_WINDOW: 60,
  };
  container.register<EnvConfig>(DI_TOKENS.EnvConfig, {
    useValue: testEnvConfig,
  });

  // テスト用ロガー（出力を抑制）
  const testLogger = pino({
    level: 'error',
  });
  container.register<Logger>(DI_TOKENS.Logger, {
    useValue: testLogger,
  });

  // テスト用データディレクトリ
  container.register<string>(DI_TOKENS.DataDirectory, {
    useValue: path.resolve(process.cwd(), 'test-data'),
  });

  return container;
}

/**
 * リポジトリの登録（後続タスクで実装）
 */
// function registerRepositories(container: DependencyContainer): void {
//   container.register(DI_TOKENS.UserRepository, {
//     useClass: UserRepositoryImpl,
//   });
//   container.register(DI_TOKENS.RateLimitRepository, {
//     useClass: RateLimitRepositoryImpl,
//   });
//   // ... 他のリポジトリ
// }

/**
 * ドメインサービスの登録（後続タスクで実装）
 */
// function registerDomainServices(container: DependencyContainer): void {
//   container.register(DI_TOKENS.AuthenticationService, {
//     useClass: AuthenticationServiceImpl,
//   });
//   container.register(DI_TOKENS.RateLimitService, {
//     useClass: RateLimitServiceImpl,
//   });
//   // ... 他のドメインサービス
// }

/**
 * アプリケーションサービスの登録（後続タスクで実装）
 */
// function registerApplicationServices(container: DependencyContainer): void {
//   container.register(DI_TOKENS.AuthenticationUseCase, {
//     useClass: AuthenticationUseCaseImpl,
//   });
//   container.register(DI_TOKENS.DataRetrievalUseCase, {
//     useClass: DataRetrievalUseCaseImpl,
//   });
//   // ... 他のアプリケーションサービス
// }

/**
 * インフラストラクチャサービスの登録（後続タスクで実装）
 */
// function registerInfrastructureServices(container: DependencyContainer): void {
//   container.register(DI_TOKENS.JwtService, {
//     useClass: JwtServiceImpl,
//   });
//   container.register(DI_TOKENS.FileStorageService, {
//     useClass: FileStorageServiceImpl,
//   });
//   // ... 他のインフラストラクチャサービス
// }