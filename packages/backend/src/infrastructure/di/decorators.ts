/**
 * Custom decorators for dependency injection
 * These decorators provide a more convenient way to inject dependencies
 */

import { inject, injectable, singleton, scoped } from 'tsyringe';

import { DI_TOKENS } from './tokens';

/**
 * Decorator to mark a class as injectable with singleton lifecycle
 */
export const Singleton = (): (<T extends new (...args: unknown[]) => unknown>(target: T) => T) => {
  return <T extends new (...args: unknown[]) => unknown>(target: T): T => {
    singleton()(target);
    return target;
  };
};

/**
 * Decorator to mark a class as injectable with scoped lifecycle
 */
export const Scoped = (): (<T extends new (...args: unknown[]) => unknown>(target: T) => T) => {
  return <T extends new (...args: unknown[]) => unknown>(target: T): T => {
    scoped(undefined, undefined)(target as new (...args: unknown[]) => unknown);
    return target;
  };
};

/**
 * Decorator to mark a class as injectable with transient lifecycle (default)
 */
export const Injectable = injectable;

/**
 * Type-safe injection decorators for common dependencies
 */
export const InjectLogger = (): ParameterDecorator => inject(DI_TOKENS.Logger);
export const InjectEnvConfig = (): ParameterDecorator => inject(DI_TOKENS.EnvConfig);
export const InjectEventBus = (): ParameterDecorator => inject(DI_TOKENS.EventBus);
export const InjectSupabaseClient = (): ParameterDecorator => inject(DI_TOKENS.SupabaseClient);

/**
 * Generic type-safe injection decorator
 */
export function Inject(token: symbol): ParameterDecorator {
  return inject(token);
}

/**
 * Repository injection decorators
 */
export const InjectUserRepository = (): ParameterDecorator => inject(DI_TOKENS.UserRepository);
export const InjectAuthLogRepository = (): ParameterDecorator => inject(DI_TOKENS.AuthLogRepository);
export const InjectAPILogRepository = (): ParameterDecorator => inject(DI_TOKENS.APILogRepository);
export const InjectRateLimitRepository = (): ParameterDecorator => inject(DI_TOKENS.RateLimitRepository);
export const InjectOpenDataRepository = (): ParameterDecorator => inject(DI_TOKENS.OpenDataRepository);

/**
 * Service injection decorators
 */
export const InjectAuthenticationService = (): ParameterDecorator => inject(DI_TOKENS.AuthenticationService);
export const InjectRateLimitService = (): ParameterDecorator => inject(DI_TOKENS.RateLimitService);
export const InjectDataAccessService = (): ParameterDecorator => inject(DI_TOKENS.DataAccessService);
export const InjectJWTService = (): ParameterDecorator => inject(DI_TOKENS.JwtService);

/**
 * Use case injection decorators
 */
export const InjectAuthenticationUseCase = (): ParameterDecorator => inject(DI_TOKENS.AuthenticationUseCase);
export const InjectDataAccessUseCase = (): ParameterDecorator => inject(DI_TOKENS.DataAccessUseCase);
export const InjectRateLimitUseCase = (): ParameterDecorator => inject(DI_TOKENS.RateLimitUseCase);

/**
 * Factory pattern for creating injection decorators
 */
export function createInjectionDecorator(token: symbol): () => ParameterDecorator {
  return () => inject(token);
}

/**
 * Batch registration decorator for multiple interfaces
 */
export function RegisterInterfaces(
  interfaces: { token: symbol; useClass?: unknown; useValue?: unknown }[],
): <T extends new (...args: unknown[]) => unknown>(target: T) => T {
  return <T extends new (...args: unknown[]) => unknown>(target: T): T => {
    // This would be used with a custom container setup
    // For now, it serves as documentation
    Reflect.defineMetadata('di:interfaces', interfaces, target);
    return target;
  };
}

/**
 * Metadata helpers for dependency injection
 */
export class DIMetadata {
  /**
   * Get all registered interfaces for a class
   */
  static getInterfaces(target: unknown): { token: symbol; useClass?: unknown; useValue?: unknown }[] {
    return (Reflect.getMetadata('di:interfaces', target) || []) as { token: symbol; useClass?: unknown; useValue?: unknown }[];
  }

  /**
   * Check if a class has a specific interface registered
   */
  static hasInterface(target: unknown, token: symbol): boolean {
    const interfaces = this.getInterfaces(target);
    return interfaces.some((i) => i.token === token);
  }
}

/**
 * Decorator to mark a method as an initializer
 * Methods marked with this decorator will be called after injection
 */
export function PostConstruct(): MethodDecorator {
  return (target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor): void => {
    const existingMethods = (Reflect.getMetadata('di:postconstruct', target.constructor) as Array<string | symbol> | undefined) || [];
    existingMethods.push(propertyKey);
    Reflect.defineMetadata('di:postconstruct', existingMethods, target.constructor);
  };
}

/**
 * Execute post-construction methods
 */
export async function executePostConstruct(instance: object): Promise<void> {
  const methods = (Reflect.getMetadata('di:postconstruct', instance.constructor) as Array<string | symbol> | undefined) || [];
  for (const method of methods) {
    if (typeof (instance as Record<string | symbol, unknown>)[method] === 'function') {
      await (instance as Record<string | symbol, (...args: unknown[]) => unknown>)[method]();
    }
  }
}

/**
 * Decorator for lazy injection
 * The dependency is only resolved when first accessed
 */
export function LazyInject(_token: symbol): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    let instance: unknown;

    const getter = (): unknown => {
      if (!instance) {
        // This would need access to the container
        // For now, it's a placeholder
        throw new Error('LazyInject requires container access');
      }
      return instance;
    };

    const setter = (value: unknown): void => {
      instance = value;
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}
