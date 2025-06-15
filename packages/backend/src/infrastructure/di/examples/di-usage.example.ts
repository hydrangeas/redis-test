/**
 * Examples of using the DI container with TSyringe
 * This file demonstrates various patterns for dependency injection
 */

import { 
  Injectable, 
  Singleton,
  Inject,
  InjectLogger,
  InjectEnvConfig,
  InjectAuthenticationService,
  DI_TOKENS,
  PostConstruct
} from '../index';
import { Logger } from 'pino';
import { EnvConfig } from '../../config/env.config';
import { IAuthenticationService } from '@/domain/auth/interfaces/authentication.service.interface';
import { Result } from '@/domain/shared/result';

/**
 * Example 1: Basic service with injected dependencies
 */
@Injectable()
export class UserNotificationService {
  constructor(
    @InjectLogger() private readonly logger: Logger,
    @InjectEnvConfig() private readonly config: EnvConfig
  ) {}

  async sendWelcomeEmail(userId: string): Promise<Result<void>> {
    this.logger.info({ userId }, 'Sending welcome email');
    
    // Implementation here
    return Result.ok();
  }
}

/**
 * Example 2: Singleton service with initialization
 */
@Singleton()
export class CacheService {
  private cache = new Map<string, any>();

  constructor(
    @InjectLogger() private readonly logger: Logger
  ) {}

  @PostConstruct()
  async initialize(): Promise<void> {
    this.logger.info('Initializing cache service');
    // Perform any async initialization here
  }

  get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }
}

/**
 * Example 3: Service with interface injection
 */
interface IEmailProvider {
  send(to: string, subject: string, body: string): Promise<Result<void>>;
}

@Injectable()
export class EmailService {
  constructor(
    @Inject(DI_TOKENS.EmailProvider) private readonly emailProvider: IEmailProvider,
    @InjectLogger() private readonly logger: Logger
  ) {}

  async sendEmail(to: string, subject: string, body: string): Promise<Result<void>> {
    this.logger.info({ to, subject }, 'Sending email');
    return this.emailProvider.send(to, subject, body);
  }
}

/**
 * Example 4: Service with multiple dependencies
 */
@Injectable()
export class UserManagementService {
  constructor(
    @InjectAuthenticationService() private readonly authService: IAuthenticationService,
    @Inject(DI_TOKENS.UserRepository) private readonly userRepo: any,
    @Inject(DI_TOKENS.EventBus) private readonly eventBus: any,
    @InjectLogger() private readonly logger: Logger
  ) {}

  async createUser(email: string, password: string): Promise<Result<string>> {
    this.logger.info({ email }, 'Creating new user');

    // Validate and create user
    const result = await this.authService.register(email, password);
    
    if (result.isSuccess) {
      // Publish user created event
      await this.eventBus.publish({
        type: 'UserCreated',
        data: { userId: result.value }
      });
    }

    return result;
  }
}

/**
 * Example 5: Factory pattern with DI
 */
interface IProcessor {
  process(data: any): Promise<Result<any>>;
}

@Injectable()
export class ProcessorFactory {
  constructor(
    @Inject(DI_TOKENS.JsonProcessor) private readonly jsonProcessor: IProcessor,
    @Inject(DI_TOKENS.XmlProcessor) private readonly xmlProcessor: IProcessor,
    @InjectLogger() private readonly logger: Logger
  ) {}

  getProcessor(type: 'json' | 'xml'): IProcessor {
    this.logger.debug({ type }, 'Getting processor');
    
    switch (type) {
      case 'json':
        return this.jsonProcessor;
      case 'xml':
        return this.xmlProcessor;
      default:
        throw new Error(`Unknown processor type: ${type}`);
    }
  }
}

/**
 * Example 6: Testing with DI
 */
// In your test file
import { createTestContainer, MockFactory, DI_TOKENS } from '../index';

describe('UserNotificationService', () => {
  it('should send welcome email', async () => {
    // Create test container with mocks
    const container = createTestContainer();
    
    // Register the service
    container.register(UserNotificationService, { useClass: UserNotificationService });
    
    // Resolve and test
    const service = container.resolve(UserNotificationService);
    const result = await service.sendWelcomeEmail('user-123');
    
    expect(result.isSuccess).toBe(true);
  });
});

/**
 * Example 7: Manual container usage
 */
import { container, setupDI, getService } from '../index';

async function bootstrapApplication() {
  // Initialize the container
  await setupDI();
  
  // Manually resolve services if needed
  const logger = getService<Logger>(DI_TOKENS.Logger);
  logger.info('Application started');
  
  // Register additional services
  container.register(DI_TOKENS.EmailProvider, {
    useValue: {
      send: async (to: string, subject: string, body: string) => {
        console.log(`Sending email to ${to}: ${subject}`);
        return Result.ok();
      }
    }
  });
}

/**
 * Example 8: Conditional registration based on environment
 */
export function registerEmailProvider(container: any, config: EnvConfig) {
  if (config.NODE_ENV === 'production') {
    // Use real email provider
    container.register(DI_TOKENS.EmailProvider, {
      useClass: RealEmailProvider
    });
  } else {
    // Use mock email provider
    container.register(DI_TOKENS.EmailProvider, {
      useValue: MockFactory.createMockEmailProvider()
    });
  }
}

// Placeholder classes for the example
class RealEmailProvider implements IEmailProvider {
  async send(to: string, subject: string, body: string): Promise<Result<void>> {
    // Real implementation
    return Result.ok();
  }
}

// Add to MockFactory
declare module '../test-container' {
  interface MockFactory {
    createMockEmailProvider(): IEmailProvider;
  }
}

MockFactory.createMockEmailProvider = () => ({
  send: vi.fn().mockResolvedValue(Result.ok())
});