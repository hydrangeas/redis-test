# Dependency Injection (DI) Container

This directory contains the TSyringe-based dependency injection container configuration for the backend application.

## Overview

The DI container manages all dependencies in the application, promoting loose coupling and testability. It uses TSyringe, a lightweight dependency injection container for TypeScript/JavaScript.

## Structure

- `tokens.ts` - Defines all DI tokens (symbols) used to identify dependencies
- `container.ts` - Main container setup for production use with Fastify
- `setup.ts` - Alternative setup for standalone usage (backward compatibility)
- `test-container.ts` - Test container with mock implementations
- `decorators.ts` - Convenient decorator shortcuts for common injections
- `index.ts` - Main exports

## Usage

### 1. Basic Setup

```typescript
import 'reflect-metadata';
import { setupDI } from '@/infrastructure/di/container';

// In your main application file
await setupDI();
```

### 2. Using Decorators in Classes

```typescript
import { injectable } from 'tsyringe';
import { InjectLogger, InjectAuthenticationService } from '@/infrastructure/di/decorators';

@injectable()
export class MyService {
  constructor(
    @InjectLogger() private readonly logger: Logger,
    @InjectAuthenticationService() private readonly authService: IAuthenticationService,
  ) {}

  async doSomething(): Promise<void> {
    this.logger.info('Doing something');
    // ... business logic
  }
}
```

### 3. Manual Resolution

```typescript
import { container } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

const logger = container.resolve<Logger>(DI_TOKENS.Logger);
const authService = container.resolve(DI_TOKENS.AuthenticationService);
```

### 4. Testing

```typescript
import { setupTestContainer, registerMock, clearContainer } from '@/infrastructure/di/test-container';

describe('MyService', () => {
  beforeEach(() => {
    clearContainer();
    setupTestContainer();
    
    // Register custom mocks if needed
    registerMock(DI_TOKENS.MyCustomService, {
      myMethod: jest.fn(),
    });
  });

  it('should work with mocked dependencies', () => {
    const service = container.resolve(MyService);
    // ... test logic
  });
});
```

## Available Tokens

### Infrastructure
- `DI_TOKENS.Logger` - Pino logger instance
- `DI_TOKENS.SupabaseClient` - Supabase client
- `DI_TOKENS.FileService` - File system operations
- `DI_TOKENS.JwtService` - JWT token operations

### Repositories
- `DI_TOKENS.UserRepository` - User data access
- `DI_TOKENS.RateLimitRepository` - Rate limit data access
- `DI_TOKENS.DataRepository` - Open data file access

### Domain Services
- `DI_TOKENS.AuthenticationService` - Authentication logic
- `DI_TOKENS.RateLimitService` - Rate limiting logic
- `DI_TOKENS.DataAccessService` - Data access logic

### Application Services (Use Cases)
- `DI_TOKENS.AuthenticationUseCase` - Authentication flow
- `DI_TOKENS.DataRetrievalUseCase` - Data retrieval flow
- `DI_TOKENS.RateLimitUseCase` - Rate limit checking

### Configuration
- `DI_TOKENS.AppConfig` - Application configuration
- `DI_TOKENS.DatabaseConfig` - Database configuration
- `DI_TOKENS.AuthConfig` - Authentication configuration
- `DI_TOKENS.EnvConfig` - Environment variables (backward compatibility)

## Best Practices

1. **Always use interfaces** - Define interfaces for your services and inject the interface, not the concrete implementation
2. **Use decorators** - Prefer decorator shortcuts over manual token injection for better type safety
3. **Singleton vs Transient** - Use `@singleton()` for stateless services, regular `@injectable()` for stateful ones
4. **Test isolation** - Always clear and setup test container in beforeEach to ensure test isolation
5. **Lazy loading** - The container uses lazy loading, so services are only instantiated when first resolved

## Migration from Old DI System

If you're migrating from the old DI system:

1. Replace `import { setupDI } from '@/infrastructure/di'` with `import { setupDI } from '@/infrastructure/di/container'`
2. Replace direct token usage with `DI_TOKENS.TokenName`
3. Update test setup to use `setupTestContainer()` instead of manual mock registration

## Troubleshooting

### "No registration found" error
- Ensure `reflect-metadata` is imported at the very top of your entry file
- Check that the service is decorated with `@injectable()` or `@singleton()`
- Verify the service is registered in `container.ts` or `setup.ts`

### TypeScript decorator errors
- Ensure `experimentalDecorators` and `emitDecoratorMetadata` are enabled in tsconfig.json
- Import `reflect-metadata` before any other imports

### Circular dependency errors
- Review your dependency graph
- Consider using factory patterns or lazy injection
- Break circular dependencies by introducing interfaces or events