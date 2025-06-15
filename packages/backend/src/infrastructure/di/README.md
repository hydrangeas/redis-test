# Dependency Injection (DI) Container

This module provides a robust dependency injection system using TSyringe for the OpenData API backend.

## Overview

The DI container manages all service dependencies, making the codebase more maintainable, testable, and following SOLID principles.

## Key Features

- **Type-safe injection** using TypeScript decorators
- **Lifecycle management** (Singleton, Scoped, Transient)
- **Test utilities** for easy mocking and testing
- **Decorator-based API** for clean and readable code
- **Automatic dependency resolution**

## Basic Usage

### 1. Defining Injectable Services

```typescript
import { Injectable, InjectLogger } from '@/infrastructure/di';
import { Logger } from 'pino';

@Injectable()
export class UserService {
  constructor(
    @InjectLogger() private readonly logger: Logger
  ) {}

  async getUser(id: string) {
    this.logger.info({ id }, 'Getting user');
    // Implementation
  }
}
```

### 2. Using Singleton Services

```typescript
import { Singleton } from '@/infrastructure/di';

@Singleton()
export class CacheService {
  private cache = new Map();

  get(key: string) {
    return this.cache.get(key);
  }

  set(key: string, value: any) {
    this.cache.set(key, value);
  }
}
```

### 3. Injecting Services

```typescript
import { Injectable, Inject, DI_TOKENS } from '@/infrastructure/di';

@Injectable()
export class OrderService {
  constructor(
    @Inject(DI_TOKENS.UserRepository) private userRepo: IUserRepository,
    @Inject(DI_TOKENS.EventBus) private eventBus: IEventBus
  ) {}
}
```

## Available Tokens

The following tokens are available for injection:

### Configuration
- `DI_TOKENS.EnvConfig` - Environment configuration
- `DI_TOKENS.DataDirectory` - Data directory path

### Infrastructure Services
- `DI_TOKENS.Logger` - Pino logger instance
- `DI_TOKENS.EventBus` - Event bus for domain events
- `DI_TOKENS.SupabaseService` - Supabase client service

### Repositories
- `DI_TOKENS.UserRepository` - User data access
- `DI_TOKENS.AuthLogRepository` - Authentication logs
- `DI_TOKENS.APILogRepository` - API access logs
- `DI_TOKENS.RateLimitRepository` - Rate limit data

### Domain Services
- `DI_TOKENS.AuthenticationService` - Authentication logic
- `DI_TOKENS.RateLimitService` - Rate limiting logic
- `DI_TOKENS.DataAccessService` - Data access control

## Testing

### Creating Test Containers

```typescript
import { createTestContainer, MockFactory } from '@/infrastructure/di';

describe('MyService', () => {
  it('should work with mocked dependencies', async () => {
    const container = createTestContainer();
    
    // Register your service
    container.register(MyService, { useClass: MyService });
    
    // Resolve and test
    const service = container.resolve(MyService);
    const result = await service.doWork();
    
    expect(result).toBeDefined();
  });
});
```

### Using Mock Factory

```typescript
const mockLogger = MockFactory.createMockLogger();
const mockEventBus = MockFactory.createMockEventBus();
const mockRepo = MockFactory.createMockRepository();
```

### Custom Mocks

```typescript
const customMock = {
  myMethod: vi.fn().mockResolvedValue('mocked result')
};

const container = createTestContainer();
container.register(MY_TOKEN, { useValue: customMock });
```

## Container Lifecycle

1. **Application Startup**: Call `setupDI()` to initialize the container
2. **Request Handling**: Services are resolved as needed
3. **Testing**: Use `setupTestDI()` or `createTestContainer()`

## Best Practices

1. **Use Interfaces**: Define interfaces for your services
2. **Constructor Injection**: Prefer constructor injection over property injection
3. **Avoid Service Locator**: Don't resolve services manually outside of the composition root
4. **Test with Mocks**: Use the provided test utilities for unit testing
5. **Lifecycle Awareness**: Choose appropriate lifecycle (Singleton vs Transient)

## Advanced Features

### Post-Construction Initialization

```typescript
import { Injectable, PostConstruct } from '@/infrastructure/di';

@Injectable()
export class DatabaseService {
  @PostConstruct()
  async initialize() {
    // Async initialization logic
    await this.connect();
  }
}
```

### Conditional Registration

```typescript
if (config.NODE_ENV === 'production') {
  container.register(DI_TOKENS.EmailService, {
    useClass: RealEmailService
  });
} else {
  container.register(DI_TOKENS.EmailService, {
    useClass: MockEmailService
  });
}
```

### Factory Pattern

```typescript
container.register(DI_TOKENS.ServiceFactory, {
  useFactory: (dependencyContainer) => {
    const config = dependencyContainer.resolve(DI_TOKENS.EnvConfig);
    return new ServiceFactory(config);
  }
});
```

## Troubleshooting

### Common Issues

1. **"Cannot find module 'reflect-metadata'"**
   - Ensure `reflect-metadata` is imported at the application entry point

2. **"Attempted to resolve unregistered dependency"**
   - Check that the service is registered in the container
   - Verify the token is correct

3. **"Circular dependency detected"**
   - Review your service dependencies
   - Consider using lazy injection or refactoring

### Debug Mode

Enable debug logging for the container:

```typescript
import { container } from 'tsyringe';

// Log all registrations
container.afterResolution((token, result) => {
  console.log(`Resolved ${token.toString()}`);
});
```

## Migration Guide

### From Manual Instantiation

Before:
```typescript
const logger = createLogger();
const repo = new UserRepository(db);
const service = new UserService(logger, repo);
```

After:
```typescript
const service = container.resolve(UserService);
```

### From Other DI Libraries

The API is similar to other popular DI libraries. Key differences:
- Use `@Injectable()` instead of `@Component()`
- Use `@Inject(token)` for explicit injection
- Tokens are symbols, not strings

## Performance Considerations

- **Singleton services** are created once and reused
- **Transient services** are created on each resolution
- **Lazy injection** delays resolution until first use
- **Avoid deep dependency graphs** for better performance