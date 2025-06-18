import { EventEmitter } from 'events';

import { container } from 'tsyringe';
import { vi } from 'vitest';

import { User } from '@/domain/auth/entities/user';
import { Email } from '@/domain/auth/value-objects/email';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { AuthResult } from '@/domain/log/value-objects/auth-result';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

import type { TierLevel } from '@/domain/auth/value-objects/tier-level';

interface MockDependencies {
  mockEventBus: EventEmitter;
  mockRepositories: {
    authentication: ReturnType<typeof createMockAuthRepository>;
    apiEndpoint: ReturnType<typeof createMockAPIEndpointRepository>;
    rateLimitLog: ReturnType<typeof createMockRateLimitLogRepository>;
    openData: ReturnType<typeof createMockOpenDataRepository>;
    authLog: ReturnType<typeof createMockAuthLogRepository>;
    apiLog: ReturnType<typeof createMockAPILogRepository>;
  };
  mockFileSystem: {
    readFile: ReturnType<typeof vi.fn>;
    stat: ReturnType<typeof vi.fn>;
    access: ReturnType<typeof vi.fn>;
  };
  mockSupabaseClient: {
    auth: {
      getUser: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
      signOut: ReturnType<typeof vi.fn>;
      refreshSession: ReturnType<typeof vi.fn>;
    };
  };
  mockLogger: {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    fatal: ReturnType<typeof vi.fn>;
    trace: ReturnType<typeof vi.fn>;
    child: ReturnType<typeof vi.fn>;
  };
  mockAuthAdapter: {
    getUserFromToken: ReturnType<typeof vi.fn>;
    verifyToken: ReturnType<typeof vi.fn>;
    refreshToken: ReturnType<typeof vi.fn>;
    refreshAccessToken: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
  mockJWTValidator: {
    validateToken: ReturnType<typeof vi.fn>;
  };
  mockJWTService: {
    decodeToken: ReturnType<typeof vi.fn>;
  };
  mockAuthenticationService: {
    validateToken: ReturnType<typeof vi.fn>;
    validateAccessToken: ReturnType<typeof vi.fn>;
  };
  mockAPIAccessControlService: {
    checkAccess: ReturnType<typeof vi.fn>;
    validateEndpointAccess: ReturnType<typeof vi.fn>;
  };
  mockRateLimitService: {
    checkLimit: ReturnType<typeof vi.fn>;
    recordUsage: ReturnType<typeof vi.fn>;
    getUsageStatus: ReturnType<typeof vi.fn>;
  };
  mockDataAccessService: {
    checkAccess: ReturnType<typeof vi.fn>;
    getResourceMetadata: ReturnType<typeof vi.fn>;
  };
  mockApiLogService: {
    logRequest: ReturnType<typeof vi.fn>;
    getLogsByUserId: ReturnType<typeof vi.fn>;
    getLogsByEndpoint: ReturnType<typeof vi.fn>;
  };
  mockAPIAccessControlUseCase: {
    checkAndRecordAccess: ReturnType<typeof vi.fn>;
    recordPublicAccess: ReturnType<typeof vi.fn>;
  };
}

export function setupDependencies(): MockDependencies {
  const mockEventBus = new EventEmitter();
  // EventEmitter uses emit, not publish
  const eventBusWithPublish = mockEventBus as EventEmitter & { publish: ReturnType<typeof vi.fn> };
  eventBusWithPublish.publish = vi.fn(() => Promise.resolve()) as any;

  const mockRepositories = {
    authentication: createMockAuthRepository(),
    apiEndpoint: createMockAPIEndpointRepository(),
    rateLimitLog: createMockRateLimitLogRepository(),
    openData: createMockOpenDataRepository(),
    authLog: createMockAuthLogRepository(),
    apiLog: createMockAPILogRepository(),
  };

  const mockFileSystem = {
    readFile: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
  };

  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    },
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  };
  
  // Self-reference for child method
  mockLogger.child.mockReturnValue(mockLogger);

  const mockAuthAdapter = {
    getUserFromToken: vi.fn(),
    verifyToken: vi.fn(),
    refreshToken: vi.fn(),
    refreshAccessToken: vi.fn(),
    signOut: vi.fn(),
  };

  const mockJWTValidator = {
    validateToken: vi.fn(),
  };

  const mockJWTService = {
    decodeToken: vi.fn(),
  };

  const mockAuthenticationService = {
    validateToken: vi.fn(),
    validateAccessToken: vi.fn(),
  };

  const mockAPIAccessControlService = {
    checkAccess: vi.fn(),
    validateEndpointAccess: vi.fn(),
  };

  const mockRateLimitService = {
    checkLimit: vi.fn(),
    recordUsage: vi.fn(),
    getUsageStatus: vi.fn(),
  };

  const mockDataAccessService = {
    checkAccess: vi.fn(),
    getResourceMetadata: vi.fn(),
  };

  const mockApiLogService = {
    logRequest: vi.fn(),
    logAPIAccess: vi.fn(),
    getLogsByUserId: vi.fn(),
    getLogsByEndpoint: vi.fn(),
  };

  const mockRateLimitUseCase = {
    checkRateLimit: vi.fn(),
    getUserUsageStatus: vi.fn(),
    incrementUsage: vi.fn(),
    resetUserUsage: vi.fn(),
  };

  const mockAPIAccessControlUseCase = {
    checkAndRecordAccess: vi.fn(),
    recordPublicAccess: vi.fn(),
  };

  container.registerInstance(DI_TOKENS.EventBus, mockEventBus);
  container.registerInstance(DI_TOKENS.AuthenticationService, mockAuthenticationService);
  container.registerInstance(DI_TOKENS.APIAccessControlService, mockAPIAccessControlService);
  container.registerInstance(DI_TOKENS.RateLimitService, mockRateLimitService);
  container.registerInstance(DI_TOKENS.RateLimitUseCase, mockRateLimitUseCase);
  container.registerInstance(DI_TOKENS.APIAccessControlUseCase, mockAPIAccessControlUseCase);
  container.registerInstance(DI_TOKENS.DataAccessService, mockDataAccessService);
  container.registerInstance(DI_TOKENS.ApiLogService, mockApiLogService);
  container.registerInstance(DI_TOKENS.UserRepository, mockRepositories.authentication);
  container.registerInstance(DI_TOKENS.RateLimitLogRepository, mockRepositories.rateLimitLog);
  container.registerInstance(DI_TOKENS.OpenDataRepository, mockRepositories.openData);
  container.registerInstance(DI_TOKENS.AuthLogRepository, mockRepositories.authLog);
  container.registerInstance(DI_TOKENS.APILogRepository, mockRepositories.apiLog);
  container.registerInstance(DI_TOKENS.FileStorage, mockFileSystem);
  container.registerInstance(DI_TOKENS.SupabaseClient, mockSupabaseClient);
  container.registerInstance(DI_TOKENS.Logger, mockLogger);
  container.registerInstance(DI_TOKENS.AuthAdapter, mockAuthAdapter);
  container.registerInstance(DI_TOKENS.JWTValidator, mockJWTValidator);
  container.registerInstance(DI_TOKENS.JwtService, mockJWTService);

  return {
    mockEventBus,
    mockRepositories,
    mockFileSystem,
    mockSupabaseClient,
    mockLogger,
    mockAuthAdapter,
    mockJWTValidator,
    mockAuthenticationService,
    mockAPIAccessControlService,
    mockRateLimitService,
    mockDataAccessService,
    mockApiLogService,
    mockAPIAccessControlUseCase,
    mockJWTService,
  };
}

export function createMockUser(tier: TierLevel | string): User {
  const emailResult = Email.create('test@example.com');
  const userIdResult = UserId.create('550e8400-e29b-41d4-a716-446655440000'); // Valid UUID v4
  const tierLevel = typeof tier === 'string' ? (tier.toUpperCase() as TierLevel) : tier;
  const userTierResult = UserTier.create(tierLevel);

  if (emailResult.isFailure || userIdResult.isFailure || userTierResult.isFailure) {
    throw new Error('Failed to create mock user components');
  }

  const userResult = User.create({
    id: userIdResult.getValue(),
    email: emailResult.getValue(),
    tier: userTierResult.getValue(),
    emailVerified: true,
  });

  if (userResult.isFailure) {
    throw new Error('Failed to create mock user');
  }

  return userResult.getValue();
}

export function createMockAuthRepository(): {
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  findByUserId: ReturnType<typeof vi.fn>;
  updateLastActivity: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
} {
  return {
    save: vi.fn(),
    update: vi.fn(),
    findByUserId: vi.fn(),
    updateLastActivity: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockAPIEndpointRepository(): {
  save: ReturnType<typeof vi.fn>;
  findByPath: ReturnType<typeof vi.fn>;
  findAll: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
} {
  return {
    save: vi.fn(),
    findByPath: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockRateLimitLogRepository(): {
  save: ReturnType<typeof vi.fn>;
  saveMany: ReturnType<typeof vi.fn>;
  findByUserAndEndpoint: ReturnType<typeof vi.fn>;
  findByUser: ReturnType<typeof vi.fn>;
  findByEndpoint: ReturnType<typeof vi.fn>;
  deleteOldLogs: ReturnType<typeof vi.fn>;
  countRequests: ReturnType<typeof vi.fn>;
  countInWindow: ReturnType<typeof vi.fn>;
  findByUserId: ReturnType<typeof vi.fn>;
  cleanupOldLogs: ReturnType<typeof vi.fn>;
} {
  return {
    save: vi.fn(),
    saveMany: vi.fn(),
    findByUserAndEndpoint: vi.fn(),
    findByUser: vi.fn(),
    findByEndpoint: vi.fn(),
    deleteOldLogs: vi.fn(),
    countRequests: vi.fn(),
    countInWindow: vi.fn(), // legacy, keep for backward compatibility
    findByUserId: vi.fn(), // legacy, keep for backward compatibility
    cleanupOldLogs: vi.fn(), // legacy, keep for backward compatibility
  };
}

export function createMockOpenDataRepository(): {
  findByPath: ReturnType<typeof vi.fn>;
  listByDirectory: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  getContent: ReturnType<typeof vi.fn>;
} {
  return {
    findByPath: vi.fn(),
    listByDirectory: vi.fn(),
    exists: vi.fn(),
    getContent: vi.fn(),
  };
}

export function createMockAuthLogRepository(): {
  save: ReturnType<typeof vi.fn>;
  findByUserId: ReturnType<typeof vi.fn>;
  findByDateRange: ReturnType<typeof vi.fn>;
  countByResult: ReturnType<typeof vi.fn>;
} {
  return {
    save: vi.fn(),
    findByUserId: vi.fn(),
    findByDateRange: vi.fn(),
    countByResult: vi.fn(),
  };
}

export function createMockAPILogRepository(): {
  save: ReturnType<typeof vi.fn>;
  findByUserId: ReturnType<typeof vi.fn>;
  findByEndpoint: ReturnType<typeof vi.fn>;
  findByDateRange: ReturnType<typeof vi.fn>;
  findByTimeRange: ReturnType<typeof vi.fn>;
  countByStatusCode: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findErrors: ReturnType<typeof vi.fn>;
  getStatistics: ReturnType<typeof vi.fn>;
  deleteOldLogs: ReturnType<typeof vi.fn>;
} {
  return {
    save: vi.fn(),
    findByUserId: vi.fn(),
    findByEndpoint: vi.fn(),
    findByDateRange: vi.fn(),
    findByTimeRange: vi.fn(),
    countByStatusCode: vi.fn(),
    findById: vi.fn(),
    findErrors: vi.fn(),
    getStatistics: vi.fn(),
    deleteOldLogs: vi.fn(),
  };
}

export function createMockAuthResult(result: string): AuthResult {
  // AuthResult is an enum, so we need to return the correct value
  switch (result.toUpperCase()) {
    case 'SUCCESS':
      return AuthResult.SUCCESS;
    case 'FAILURE':
    case 'FAILED':
      return AuthResult.FAILED;
    case 'EXPIRED':
      return AuthResult.EXPIRED;
    case 'BLOCKED':
      return AuthResult.BLOCKED;
    default:
      return AuthResult.FAILED;
  }
}
