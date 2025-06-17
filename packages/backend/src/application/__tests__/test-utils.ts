import { vi } from 'vitest';
import { container } from 'tsyringe';
import { EventEmitter } from 'events';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { User } from '@/domain/auth/entities/user';
import { Email } from '@/domain/auth/value-objects/email';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { AuthResult } from '@/domain/log/value-objects/auth-result';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';

export function setupDependencies() {
  const mockEventBus = new EventEmitter();
  // EventEmitter uses emit, not publish
  (mockEventBus as any).emit = vi.fn((eventType: string, eventData: any) => {
    EventEmitter.prototype.emit.call(mockEventBus, eventType, eventData);
  });

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

  const mockLogger: any = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(() => mockLogger) as any,
  };

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

  container.registerInstance(DI_TOKENS.EventBus, mockEventBus);
  container.registerInstance(DI_TOKENS.AuthenticationService, mockAuthenticationService);
  container.registerInstance(DI_TOKENS.APIAccessControlService, mockAPIAccessControlService);
  container.registerInstance(DI_TOKENS.RateLimitService, mockRateLimitService);
  container.registerInstance(DI_TOKENS.DataAccessService, mockDataAccessService);
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
  };
}

export function createMockUser(tier: TierLevel | string) {
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

export function createMockAuthRepository() {
  return {
    save: vi.fn(),
    update: vi.fn(),
    findByUserId: vi.fn(),
    updateLastActivity: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockAPIEndpointRepository() {
  return {
    save: vi.fn(),
    findByPath: vi.fn(),
    findAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockRateLimitLogRepository() {
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

export function createMockOpenDataRepository() {
  return {
    findByPath: vi.fn(),
    listByDirectory: vi.fn(),
    exists: vi.fn(),
  };
}

export function createMockAuthLogRepository() {
  return {
    save: vi.fn(),
    findByUserId: vi.fn(),
    findByDateRange: vi.fn(),
    countByResult: vi.fn(),
  };
}

export function createMockAPILogRepository() {
  return {
    save: vi.fn(),
    findByUserId: vi.fn(),
    findByEndpoint: vi.fn(),
    findByDateRange: vi.fn(),
    countByStatusCode: vi.fn(),
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
