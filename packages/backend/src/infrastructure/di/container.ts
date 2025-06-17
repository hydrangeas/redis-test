import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import { Logger } from 'pino';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DI_TOKENS } from './tokens';
import { getEnvConfig, type EnvConfig } from '../config/env.config';
import { createLogger } from '../logging';
import path from 'path';
import { IAuthAdapter } from '../auth/interfaces/auth-adapter.interface';
import { SupabaseAuthAdapter } from '../auth/supabase-auth.adapter';
import { MockSupabaseAuthAdapter } from '../auth/__mocks__/supabase-auth.adapter';
import { AuthenticationService } from '@/domain/auth/services/authentication.service';
import { APIAccessControlService } from '@/domain/api/services/api-access-control.service';
import { DataAccessService } from '@/domain/data/services/data-access.service';
import { InMemoryRateLimitService } from '../services/in-memory-rate-limit.service';
import { AuthenticationUseCase } from '@/application/use-cases/authentication.use-case';
import { DataRetrievalUseCase } from '@/application/use-cases/data-retrieval.use-case';
import { DataAccessUseCase } from '@/application/use-cases/data-access.use-case';
import { RateLimitUseCase } from '@/application/use-cases/rate-limit.use-case';
import { APIAccessControlUseCase } from '@/application/use-cases/api-access-control.use-case';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { EventBus } from '../events/event-bus';
import { IEventStore } from '@/domain/interfaces/event-store.interface';
import { InMemoryEventStore } from '../events/in-memory-event-store';
import { IOpenDataRepository } from '@/domain/data/interfaces/open-data-repository.interface';
import { OpenDataRepository } from '../repositories/open-data.repository';
import { IJWTValidator } from '../auth/interfaces/jwt-validator.interface';
import { JWTValidatorService } from '../auth/services/jwt-validator.service';
import { Result } from '@/domain/errors/result';
import { DomainError } from '@/domain/errors';

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
    envConfig.PUBLIC_SUPABASE_URL || envConfig.SUPABASE_URL!,
    envConfig.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
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

  // イベントハンドラーの登録
  import('@/application/event-handlers').then((module) => {
    module.registerEventHandlers(container);
    logger.info('Event handlers registered');
  });

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
    DATA_DIRECTORY: './test-data',
  };
  container.register<EnvConfig>(DI_TOKENS.EnvConfig, {
    useValue: testEnvConfig,
  });

  // テスト用ロガー（出力を抑制）
  const testLogger = createLogger(testEnvConfig);
  container.register<Logger>(DI_TOKENS.Logger, {
    useValue: testLogger,
  });

  // テスト用Supabaseクライアント
  const mockSupabaseClient = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      admin: {
        getUserById: () => Promise.resolve({ data: { user: null }, error: null }),
      },
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
    }),
  } as any;
  container.register<SupabaseClient>(DI_TOKENS.SupabaseClient, {
    useValue: mockSupabaseClient,
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
  registerTestRepositories(container);
  registerDomainServices(container);
  registerApplicationServices(container);
  registerTestInfrastructureServices(container);

  // テスト用にJwtServiceのモックを登録（auth.plugin.tsで必要）
  // 実際のモックはテストで上書き可能
  container.register(DI_TOKENS.JwtService, {
    useValue: {
      generateAccessToken: () => Promise.resolve(Result.ok('test-access-token')),
      generateRefreshToken: () => Promise.resolve(Result.ok('test-refresh-token')),
      verifyAccessToken: () =>
        Promise.resolve(
          Result.ok({ sub: 'test-user', tier: 'tier1', exp: Math.floor(Date.now() / 1000) + 3600 }),
        ),
      verifyRefreshToken: () => Promise.resolve(Result.ok({ sub: 'test-user' })),
      decodeToken: () => ({ sub: 'test-user' }),
    },
  });

  // テスト用にUserRepositoryのモックを登録
  container.register(DI_TOKENS.UserRepository, {
    useValue: {
      save: () => Promise.resolve(Result.ok(undefined)),
      update: () => Promise.resolve(Result.ok(undefined)),
      findByUserId: () => Promise.resolve(Result.ok(null)),
      updateLastActivity: () => Promise.resolve(Result.ok(undefined)),
      delete: () => Promise.resolve(Result.ok(undefined)),
    },
  });

  // テスト用にRateLimitLogRepositoryのモックを登録（必要な場合）
  container.register(DI_TOKENS.RateLimitLogRepository, {
    useValue: {
      save: () => Promise.resolve(Result.ok(undefined)),
      findByUserId: () => Promise.resolve(Result.ok([])),
      countInWindow: () => Promise.resolve(Result.ok(0)),
      deleteOlderThan: () => Promise.resolve(Result.ok(undefined)),
      deleteByUserId: () => Promise.resolve(Result.ok(undefined)),
    },
  });

  // テスト用にAuthLogRepositoryのモックを登録
  container.register(DI_TOKENS.AuthLogRepository, {
    useValue: {
      save: () => Promise.resolve(Result.ok(undefined)),
      findById: () => Promise.resolve(Result.ok(null)),
      findByUserId: () => Promise.resolve(Result.ok([])),
      findByEventType: () => Promise.resolve(Result.ok([])),
      findByIPAddress: () => Promise.resolve(Result.ok([])),
      findFailures: () => Promise.resolve(Result.ok([])),
      findSuspiciousActivities: () => Promise.resolve(Result.ok([])),
      getStatistics: () =>
        Promise.resolve(
          Result.ok({
            totalAttempts: 0,
            successfulLogins: 0,
            failedLogins: 0,
            uniqueUsers: 0,
            suspiciousActivities: 0,
            loginsByProvider: new Map(),
            tokenRefreshCount: 0,
          }),
        ),
      deleteOldLogs: () => Promise.resolve(Result.ok(0)),
    },
  });

  // テスト用にAPILogRepositoryのモックを登録
  container.register(DI_TOKENS.APILogRepository, {
    useValue: {
      save: () => Promise.resolve(Result.ok(undefined)),
      findById: () => Promise.resolve(Result.ok(null)),
      findByUserId: () => Promise.resolve(Result.ok([])),
      findByTimeRange: () => Promise.resolve(Result.ok([])),
      findErrors: () => Promise.resolve(Result.ok([])),
      getStatistics: () =>
        Promise.resolve(
          Result.ok({
            totalRequests: 0,
            uniqueUsers: 0,
            errorCount: 0,
            averageResponseTime: 0,
            requestsByEndpoint: new Map(),
            requestsByStatus: new Map(),
          }),
        ),
      deleteOldLogs: () => Promise.resolve(Result.ok(0)),
    },
  });

  // テスト用にRateLimitServiceのモックを登録
  container.register(DI_TOKENS.RateLimitService, {
    useValue: {
      checkLimit: () =>
        Promise.resolve({
          allowed: true,
          limit: 60,
          remaining: 59,
          resetAt: new Date(Date.now() + 60000),
          retryAfter: undefined,
        }),
      recordUsage: () => Promise.resolve(),
      getUsageStatus: () =>
        Promise.resolve({
          currentCount: 1,
          limit: 60,
          windowStart: new Date(),
          windowEnd: new Date(Date.now() + 60000),
        }),
      resetLimit: () => Promise.resolve(),
    },
  });

  // テスト用にSecureFileAccessServiceのモックを登録
  container.register(DI_TOKENS.SecureFileAccessService, {
    useValue: {
      validatePath: () => Result.ok({ safe: true, normalized: '/test/path' }),
      checkAccess: () => Promise.resolve(Result.ok(true)),
      readFile: () => Promise.resolve(Result.ok({ content: Buffer.from('test'), metadata: { size: 4, mimeType: 'text/plain' } })),
      listDirectory: () => Promise.resolve(Result.ok([])),
    },
  });

  // テスト用にSecurityAuditServiceのモックを登録
  container.register(DI_TOKENS.SecurityAuditService, {
    useValue: {
      logSecurityEvent: () => Promise.resolve(),
      logAuthEvent: () => Promise.resolve(),
      logAccessEvent: () => Promise.resolve(),
      getAuditLogs: () => Promise.resolve([]),
    },
  });

  return container;
}

/**
 * リポジトリの登録
 */
function registerRepositories(container: DependencyContainer): void {
  // OpenDataRepositoryの登録
  container.register(DI_TOKENS.OpenDataRepository, {
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

  container.register(DI_TOKENS.APIAccessControlService, {
    useClass: APIAccessControlService,
  });

  container.register(DI_TOKENS.DataAccessService, {
    useClass: DataAccessService,
  });

  // RateLimitServiceの実装を登録
  container.register(DI_TOKENS.RateLimitService, {
    useClass: InMemoryRateLimitService,
  });

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

  container.register(DI_TOKENS.DataAccessUseCase, {
    useClass: DataAccessUseCase,
  });

  container.register(DI_TOKENS.RateLimitUseCase, {
    useClass: RateLimitUseCase,
  });

  container.register(DI_TOKENS.APIAccessControlUseCase, {
    useClass: APIAccessControlUseCase,
  });

  // ... 他のアプリケーションサービス
}

/**
 * テスト用リポジトリの登録
 */
function registerTestRepositories(container: DependencyContainer): void {
  // InMemoryOpenDataRepositoryモックの登録
  const mockOpenDataRepository: IOpenDataRepository = {
    findByPath: () => Promise.resolve(Result.fail(DomainError.notFound('FILE_NOT_FOUND', 'File not found'))),
    findById: () => Promise.resolve(Result.fail(DomainError.notFound('FILE_NOT_FOUND', 'File not found'))),
    getContent: () => Promise.resolve(Result.fail(DomainError.notFound('FILE_NOT_FOUND', 'File not found'))),
    listByDirectory: () => Promise.resolve(Result.ok([])),
    exists: () => Promise.resolve(false),
    updateMetadata: () => Promise.resolve(Result.ok(undefined)),
    getCached: () => Promise.resolve(null),
    cache: () => Promise.resolve(),
    clearCache: () => Promise.resolve(),
  };
  
  container.registerInstance(DI_TOKENS.OpenDataRepository, mockOpenDataRepository);
}

/**
 * インフラストラクチャサービスの登録
 */
function registerInfrastructureServices(container: DependencyContainer): void {
  // AuthAdapterの登録
  container.register<IAuthAdapter>(DI_TOKENS.AuthAdapter, {
    useClass: SupabaseAuthAdapter,
  });

  // JWTValidatorの登録
  container.register<IJWTValidator>(DI_TOKENS.JWTValidator, {
    useClass: JWTValidatorService,
  });

  // UserRepositoryの登録
  const { SupabaseUserRepository } = require('../repositories/auth/supabase-user.repository');
  container.register(DI_TOKENS.UserRepository, {
    useClass: SupabaseUserRepository,
  });

  // AuthLogRepositoryの登録
  const { SupabaseAuthLogRepository } = require('../repositories/log/supabase-auth-log.repository');
  container.register(DI_TOKENS.AuthLogRepository, {
    useClass: SupabaseAuthLogRepository,
  });

  // APILogRepositoryの登録
  const { SupabaseAPILogRepository } = require('../repositories/log/supabase-api-log.repository');
  container.register(DI_TOKENS.APILogRepository, {
    useClass: SupabaseAPILogRepository,
  });

  // Factoriesの登録
  const {
    OpenDataResourceFactory,
  } = require('../../domain/data/factories/open-data-resource.factory');
  container.register(DI_TOKENS.OpenDataResourceFactory, {
    useClass: OpenDataResourceFactory,
  });

  // JWTServiceの登録
  const { JWTService } = require('../auth/services/jwt.service');
  container.register(DI_TOKENS.JwtService, {
    useClass: JWTService,
  });

  // FileStorageServiceの登録
  const { FileStorageService } = require('../storage/file-storage.service');
  container.register(DI_TOKENS.FileStorage, {
    useClass: FileStorageService,
  });
  container.register(DI_TOKENS.FileStorageService, {
    useClass: FileStorageService,
  });

  // SupabaseServiceの登録
  const { SupabaseService } = require('../services/supabase.service');
  container.register(DI_TOKENS.SupabaseService, {
    useClass: SupabaseService,
  });

  // SecurityAuditServiceの登録
  const { SecurityAuditService } = require('../services/security-audit.service');
  container.register(DI_TOKENS.SecurityAuditService, {
    useClass: SecurityAuditService,
  });

  // SecureFileAccessServiceの登録
  const { SecureFileAccessService } = require('../services/secure-file-access.service');
  container.register(DI_TOKENS.SecureFileAccessService, {
    useClass: SecureFileAccessService,
  });

  // DatabaseSeederの登録
  const { DatabaseSeeder } = require('../seeders/database-seeder');
  container.register('DatabaseSeeder', {
    useClass: DatabaseSeeder,
  });

  // ApiLogServiceの登録
  const { ApiLogService } = require('../services/api-log.service');
  container.register(DI_TOKENS.ApiLogService, {
    useClass: ApiLogService,
  });

  // 他のインフラストラクチャサービスは後続タスクで実装
  // ... 他のインフラストラクチャサービス
}

/**
 * テスト用インフラストラクチャサービスの登録
 */
function registerTestInfrastructureServices(container: DependencyContainer): void {
  // TransactionManagerのモック登録（必要に応じて後で追加）
  // container.register(DI_TOKENS.TransactionManager, {
  //   useValue: {
  //     transaction: async (fn: () => Promise<unknown>) => {
  //       // テスト環境ではトランザクションなしで直接実行
  //       return fn();
  //     },
  //   },
  // });

  // RateLimitLogRepositoryの登録（InMemoryRateLimitServiceが依存）
  // Use mock for tests to avoid module resolution issues with require
  container.register(DI_TOKENS.RateLimitLogRepository, {
    useValue: {
      save: () => Promise.resolve(Result.ok(undefined)),
      findByUserId: () => Promise.resolve(Result.ok([])),
      countInWindow: () => Promise.resolve(Result.ok(0)),
      deleteOlderThan: () => Promise.resolve(Result.ok(undefined)),
      deleteByUserId: () => Promise.resolve(Result.ok(undefined)),
      saveMany: () => Promise.resolve(Result.ok(undefined)),
      findByUserAndEndpoint: () => Promise.resolve(Result.ok([])),
      findByUser: () => Promise.resolve(Result.ok([])),
      findByEndpoint: () => Promise.resolve(Result.ok([])),
      deleteOldLogs: () => Promise.resolve(Result.ok(0)),
      countRequests: () => Promise.resolve(Result.ok(0)),
    },
  });
}
