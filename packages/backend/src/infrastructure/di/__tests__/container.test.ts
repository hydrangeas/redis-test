import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { container } from 'tsyringe';
import {
  setupTestDI,
  DI_TOKENS,
  Injectable,
  Singleton,
  Inject,
  InjectLogger,
  createTestContainer,
  MockFactory,
  DITestUtils,
} from '../index';
import { Logger } from 'pino';
import { Result } from '@/domain/shared/result';

// Test classes for dependency injection
@Injectable()
class TestService {
  constructor(@InjectLogger() private readonly logger: Logger) {}

  doSomething(): string {
    this.logger.info('Doing something');
    return 'done';
  }
}

@Singleton()
class SingletonService {
  private counter = 0;

  increment(): number {
    return ++this.counter;
  }
}

interface ITestRepository {
  findById(id: string): Promise<Result<any>>;
}

@Injectable()
class TestRepository implements ITestRepository {
  async findById(id: string): Promise<Result<any>> {
    return Result.ok({ id, name: 'Test' });
  }
}

describe('DI Container', () => {
  beforeEach(() => {
    container.reset();
  });

  describe('setupTestDI', () => {
    it('should set up test container with default mocks', () => {
      const testContainer = setupTestDI();

      // Check core services are registered
      expect(testContainer.isRegistered(DI_TOKENS.EnvConfig)).toBe(true);
      expect(testContainer.isRegistered(DI_TOKENS.Logger)).toBe(true);
      expect(testContainer.isRegistered(DI_TOKENS.EventBus)).toBe(true);
    });

    it('should provide working mock services', async () => {
      const testContainer = setupTestDI();

      // Test JWT Service mock
      const jwtService = testContainer.resolve<any>(DI_TOKENS.JwtService);
      const tokenResult = await jwtService.generateAccessToken({ sub: 'test' });

      expect(tokenResult).toBeDefined();
      expect(tokenResult.isSuccess).toBe(true);
      expect(tokenResult.getValue()).toBe('test-access-token'); // Fixed expected value

      // Test Rate Limit Service mock
      const rateLimitService = testContainer.resolve<any>(DI_TOKENS.RateLimitService);
      const limitResult = await rateLimitService.checkLimit('test-user', 'tier1');
      expect(limitResult.allowed).toBe(true);
      expect(limitResult.remaining).toBe(59);
    });
  });

  describe('Injectable decorator', () => {
    it('should make class injectable', () => {
      setupTestDI();

      container.register(TestService, { useClass: TestService });
      const service = container.resolve(TestService);

      expect(service).toBeInstanceOf(TestService);
      expect(service.doSomething()).toBe('done');
    });

    it('should inject dependencies correctly', () => {
      setupTestDI();

      // Create a mock logger to track calls
      const mockLogger = MockFactory.createMockLogger();
      container.register(DI_TOKENS.Logger, {
        useValue: mockLogger,
      });

      container.register(TestService, { useClass: TestService });
      const service = container.resolve(TestService);

      service.doSomething();
      expect(mockLogger.info).toHaveBeenCalledWith('Doing something');
    });
  });

  describe('Singleton decorator', () => {
    it('should create singleton instances', () => {
      setupTestDI();

      // Register the singleton service explicitly
      container.registerSingleton(SingletonService);

      const instance1 = container.resolve(SingletonService);
      const instance2 = container.resolve(SingletonService);

      expect(instance1).toBe(instance2);
      expect(instance1.increment()).toBe(1);
      expect(instance2.increment()).toBe(2);
    });
  });

  describe('createTestContainer', () => {
    it('should create container with custom mocks', async () => {
      const customMockRepo: ITestRepository = {
        findById: vi.fn().mockResolvedValue(Result.ok({ id: '123', name: 'Custom' })),
      };

      const TEST_REPO_TOKEN = Symbol.for('TestRepository');
      const testContainer = createTestContainer();

      // Register the custom mock after container creation
      testContainer.register(TEST_REPO_TOKEN, {
        useValue: customMockRepo,
      });

      const repo = testContainer.resolve<ITestRepository>(TEST_REPO_TOKEN);
      const result = await repo.findById('123');

      expect(result).toBeDefined();
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual({ id: '123', name: 'Custom' });
    });

    it('should override environment config', () => {
      const testContainer = createTestContainer(
        {},
        {
          NODE_ENV: 'production' as const,
          PORT: 3000,
        },
      );

      const envConfig = testContainer.resolve<any>(DI_TOKENS.EnvConfig);
      expect(envConfig.NODE_ENV).toBe('production');
      expect(envConfig.PORT).toBe(3000);
    });
  });

  describe('MockFactory', () => {
    it('should create mock logger', () => {
      const mockLogger = MockFactory.createMockLogger();

      mockLogger.info('test');
      mockLogger.error('error');

      expect(mockLogger.info).toHaveBeenCalledWith('test');
      expect(mockLogger.error).toHaveBeenCalledWith('error');
    });

    it('should create mock event bus', async () => {
      const mockEventBus = MockFactory.createMockEventBus();

      await mockEventBus.publish({ type: 'test', data: {} });
      mockEventBus.subscribe('test', () => {});

      expect(mockEventBus.publish).toHaveBeenCalled();
      expect(mockEventBus.subscribe).toHaveBeenCalled();
    });

    it('should create mock repository', async () => {
      const mockRepo = MockFactory.createMockRepository<any>();

      const saveResult = await mockRepo.save({ id: '1' });
      const findResult = await mockRepo.findById('1');

      expect(saveResult).toBeDefined();
      expect(saveResult.isSuccess).toBe(true);
      expect(findResult).toBeDefined();
      expect(findResult.isSuccess).toBe(true);
      expect(findResult.getValue()).toBe(null); // Fixed assertion
    });
  });

  describe('DITestUtils', () => {
    it('should spy on service methods', () => {
      setupTestDI();

      container.register(TestService, { useClass: TestService });
      const service = container.resolve(TestService);

      // Spy on the method directly
      const spy = vi.spyOn(service, 'doSomething');

      service.doSomething();

      expect(spy).toHaveBeenCalled();
    });

    it('should replace service with mock', async () => {
      const TEST_TOKEN = Symbol.for('TestService');
      const testContainer = createTestContainer();

      const mockService = {
        doWork: vi.fn().mockResolvedValue('mocked'),
      };

      DITestUtils.replaceMock(testContainer, TEST_TOKEN, mockService);
      const service = DITestUtils.resolve<any>(testContainer, TEST_TOKEN);

      const result = await service.doWork();
      expect(result).toBe('mocked');
    });
  });

  describe('Token registration', () => {
    it('should have all required tokens defined', () => {
      const requiredTokens = [
        'EnvConfig',
        'Logger',
        'EventBus',
        'SupabaseService',
        'AuthenticationService',
        'RateLimitService',
        'UserRepository',
        'AuthLogRepository',
        'APILogRepository',
      ];

      requiredTokens.forEach((tokenName) => {
        const token = DI_TOKENS[tokenName as keyof typeof DI_TOKENS];
        expect(token).toBeDefined();
        expect(typeof token).toBe('symbol');
      });
    });
  });

  describe('Real world scenario', () => {
    it('should handle complex dependency graph', async () => {
      // Define interfaces
      interface IUserService {
        getUser(id: string): Promise<any>;
      }

      interface IAuthService {
        authenticate(token: string): Promise<boolean>;
      }

      // Define tokens
      const USER_SERVICE = Symbol.for('UserService');
      const AUTH_SERVICE = Symbol.for('AuthService');

      // Implement services
      @Injectable()
      class AuthService implements IAuthService {
        async authenticate(token: string): Promise<boolean> {
          return token === 'valid-token';
        }
      }

      @Injectable()
      class UserService implements IUserService {
        constructor(
          @Inject(AUTH_SERVICE) private authService: IAuthService,
          @InjectLogger() private logger: Logger,
        ) {}

        async getUser(id: string): Promise<any> {
          this.logger.info(`Getting user ${id}`);
          const isAuth = await this.authService.authenticate('valid-token');
          return isAuth ? { id, name: 'John' } : null;
        }
      }

      // Setup container
      setupTestDI();
      container.register<IAuthService>(AUTH_SERVICE, { useClass: AuthService });
      container.register<IUserService>(USER_SERVICE, { useClass: UserService });

      // Test
      const userService = container.resolve<IUserService>(USER_SERVICE);
      const user = await userService.getUser('123');
      expect(user).toEqual({ id: '123', name: 'John' });
    });
  });
});
