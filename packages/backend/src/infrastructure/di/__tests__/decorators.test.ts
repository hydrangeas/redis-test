import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { container, injectable, inject, singleton } from 'tsyringe';
import { DI_TOKENS } from '../tokens';

// Test interfaces
interface ITestService {
  getName(): string;
}

interface ITestRepository {
  getData(): string;
}

// Test implementations
@injectable()
class TestService implements ITestService {
  constructor(
    @inject('TestRepository') private readonly repository: ITestRepository
  ) {}

  getName(): string {
    return `Service: ${this.repository.getData()}`;
  }
}

@singleton()
class TestRepository implements ITestRepository {
  private counter = 0;

  getData(): string {
    this.counter++;
    return `Data ${this.counter}`;
  }
}

describe('TSyringe Decorators', () => {
  beforeEach(() => {
    container.reset();
  });

  describe('Injectable decorator', () => {
    it('should allow injection of dependencies', () => {
      container.register<ITestRepository>('TestRepository', {
        useClass: TestRepository,
      });
      container.register<ITestService>('TestService', {
        useClass: TestService,
      });

      const service = container.resolve<ITestService>('TestService');
      
      expect(service.getName()).toBe('Service: Data 1');
    });
  });

  describe('Singleton decorator', () => {
    it('should ensure single instance across resolves', () => {
      // Register as singleton explicitly since @singleton() decorator
      // needs to be registered differently
      container.registerSingleton<ITestRepository>('TestRepository', TestRepository);

      const repo1 = container.resolve<ITestRepository>('TestRepository');
      const repo2 = container.resolve<ITestRepository>('TestRepository');
      
      expect(repo1).toBe(repo2);
      expect(repo1.getData()).toBe('Data 1');
      expect(repo2.getData()).toBe('Data 2'); // Same instance, counter increments
    });
  });

  describe('Token-based injection', () => {
    it('should work with Symbol tokens', () => {
      const TEST_TOKEN = Symbol.for('TestService');
      
      @injectable()
      class SymbolTestService {
        getName(): string {
          return 'Symbol-based service';
        }
      }

      container.register(TEST_TOKEN, {
        useClass: SymbolTestService,
      });

      const service = container.resolve<SymbolTestService>(TEST_TOKEN);
      expect(service.getName()).toBe('Symbol-based service');
    });
  });
});