import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import { Logger } from 'pino';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DI_TOKENS } from './tokens';
import { getEnvConfig, type EnvConfig } from '../config';
import { createLogger } from '../logging';
import path from 'path';
import { IAuthAdapter } from '../auth/interfaces/auth-adapter.interface';
import { SupabaseAuthAdapter } from '../auth/supabase-auth.adapter';
import { MockSupabaseAuthAdapter } from '../auth/__mocks__/supabase-auth.adapter';
import { AuthenticationService } from '@/domain/auth/services/authentication.service';
import { AuthenticationUseCase } from '@/application/use-cases/authentication.use-case';
import { DataRetrievalUseCase } from '@/application/use-cases/data-retrieval.use-case';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { EventBus } from '../events/event-bus';
import { IEventStore } from '@/domain/interfaces/event-store.interface';
import { InMemoryEventStore } from '../events/in-memory-event-store';
import { IOpenDataRepository } from '@/domain/data/interfaces/open-data-repository.interface';
import { OpenDataRepository } from '../repositories/open-data.repository';

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
  const logger = createLogger(envConfig);
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

  // サービスの登録
  registerEventServices(container);
  registerRepositories(container);
  registerDomainServices(container);
  registerApplicationServices(container);
  registerInfrastructureServices(container);

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
  const testLogger = createLogger(testEnvConfig);
  container.register<Logger>(DI_TOKENS.Logger, {
    useValue: testLogger,
  });

  // テスト用データディレクトリ
  container.register<string>(DI_TOKENS.DataDirectory, {
    useValue: path.resolve(process.cwd(), 'test-data'),
  });

  // テスト用AuthAdapter
  container.register<IAuthAdapter>(DI_TOKENS.AuthAdapter, {
    useClass: MockSupabaseAuthAdapter,
  });

  // テスト用のサービス登録
  registerEventServices(container);
  registerDomainServices(container);
  registerApplicationServices(container);

  return container;
}

/**
 * リポジトリの登録
 */
function registerRepositories(container: DependencyContainer): void {
  // OpenDataRepositoryの登録
  container.register<IOpenDataRepository>(DI_TOKENS.OpenDataRepository, {
    useClass: OpenDataRepository,
  });
  
  // 他のリポジトリは後続タスクで実装
  // container.register(DI_TOKENS.UserRepository, {
  //   useClass: UserRepositoryImpl,
  // });
  // container.register(DI_TOKENS.RateLimitRepository, {
  //   useClass: RateLimitRepositoryImpl,
  // });
  // container.register(DI_TOKENS.AuthLogRepository, {
  //   useClass: AuthLogRepositoryImpl,
  // });
  // container.register(DI_TOKENS.ApiLogRepository, {
  //   useClass: ApiLogRepositoryImpl,
  // });
}

/**
 * イベント関連サービスの登録
 */
function registerEventServices(container: DependencyContainer): void {
  // EventStoreの登録（シングルトン）
  container.registerSingleton<IEventStore>(DI_TOKENS.EventStore, InMemoryEventStore);
  
  // EventBusの登録（シングルトン）
  container.registerSingleton<IEventBus>(DI_TOKENS.EventBus, EventBus);
}

/**
 * ドメインサービスの登録
 */
function registerDomainServices(container: DependencyContainer): void {
  container.register(DI_TOKENS.AuthenticationService, {
    useClass: AuthenticationService,
  });
  
  // Import and register new domain services
  import('@/domain/api/services/api-access-control.service').then(module => {
    container.register(DI_TOKENS.APIAccessControlService, {
      useClass: module.APIAccessControlService,
    });
  });
  
  import('@/domain/data/services/data-access.service').then(module => {
    container.register(DI_TOKENS.DataAccessService, {
      useClass: module.DataAccessService,
    });
  });
  
  // container.register(DI_TOKENS.RateLimitService, {
  //   useClass: RateLimitServiceImpl,
  // });
  // ... 他のドメインサービス
}

/**
 * アプリケーションサービスの登録
 */
function registerApplicationServices(container: DependencyContainer): void {
  container.register(DI_TOKENS.AuthenticationUseCase, {
    useClass: AuthenticationUseCase,
  });
  container.register(DI_TOKENS.DataRetrievalUseCase, {
    useClass: DataRetrievalUseCase,
  });
  // ... 他のアプリケーションサービス
}

/**
 * インフラストラクチャサービスの登録
 */
function registerInfrastructureServices(container: DependencyContainer): void {
  // AuthAdapterの登録
  container.register<IAuthAdapter>(DI_TOKENS.AuthAdapter, {
    useClass: SupabaseAuthAdapter,
  });
  
  // Factoriesの登録
  import('@/domain/data/factories/open-data-resource.factory').then(module => {
    container.register(DI_TOKENS.OpenDataResourceFactory, {
      useClass: module.OpenDataResourceFactory,
    });
  });
  
  // 他のインフラストラクチャサービスは後続タスクで実装
  // container.register(DI_TOKENS.JwtService, {
  //   useClass: JwtServiceImpl,
  // });
  // container.register(DI_TOKENS.FileStorageService, {
  //   useClass: FileStorageServiceImpl,
  // });
  // ... 他のインフラストラクチャサービス
}