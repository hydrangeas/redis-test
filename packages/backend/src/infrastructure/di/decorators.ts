/**
 * Custom decorators for dependency injection
 * These decorators provide a more convenient way to inject dependencies
 */

import { inject, injectable, singleton, scoped } from 'tsyringe';

import { DI_TOKENS } from './tokens';

/**
 * Decorator to mark a class as injectable with singleton lifecycle
 */
export const Singleton = () => {
  return (target: any) => {
    singleton()(target);
    return target;
  };
};

/**
 * Decorator to mark a class as injectable with scoped lifecycle
 */
export const Scoped = () => {
  return (target: any) => {
    scoped(undefined as any, undefined as any)(target);
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
export const InjectLogger = () => inject(DI_TOKENS.Logger);
export const InjectEnvConfig = () => inject(DI_TOKENS.EnvConfig);
export const InjectEventBus = () => inject(DI_TOKENS.EventBus);
export const InjectSupabaseClient = () => inject(DI_TOKENS.SupabaseClient);

/**
 * Generic type-safe injection decorator
 */
export function Inject(token: symbol): ParameterDecorator {
  return inject(token);
}

/**
 * Repository injection decorators
 */
export const InjectUserRepository = () => inject(DI_TOKENS.UserRepository);
export const InjectAuthLogRepository = () => inject(DI_TOKENS.AuthLogRepository);
export const InjectAPILogRepository = () => inject(DI_TOKENS.APILogRepository);
export const InjectRateLimitRepository = () => inject(DI_TOKENS.RateLimitRepository);
export const InjectOpenDataRepository = () => inject(DI_TOKENS.OpenDataRepository);

/**
 * Service injection decorators
 */
export const InjectAuthenticationService = () => inject(DI_TOKENS.AuthenticationService);
export const InjectRateLimitService = () => inject(DI_TOKENS.RateLimitService);
export const InjectDataAccessService = () => inject(DI_TOKENS.DataAccessService);
export const InjectJWTService = () => inject(DI_TOKENS.JwtService);

/**
 * Use case injection decorators
 */
export const InjectAuthenticationUseCase = () => inject(DI_TOKENS.AuthenticationUseCase);
export const InjectDataAccessUseCase = () => inject(DI_TOKENS.DataAccessUseCase);
export const InjectRateLimitUseCase = () => inject(DI_TOKENS.RateLimitUseCase);

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
  interfaces: { token: symbol; useClass?: any; useValue?: any }[],
) {
  return (target: any) => {
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
  static getInterfaces(target: any): { token: symbol; useClass?: any; useValue?: any }[] {
    return Reflect.getMetadata('di:interfaces', target) || [];
  }

  /**
   * Check if a class has a specific interface registered
   */
  static hasInterface(target: any, token: symbol): boolean {
    const interfaces = this.getInterfaces(target);
    return interfaces.some((i) => i.token === token);
  }
}

/**
 * Decorator to mark a method as an initializer
 * Methods marked with this decorator will be called after injection
 */
export function PostConstruct() {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    const existingMethods = Reflect.getMetadata('di:postconstruct', target.constructor) || [];
    existingMethods.push(propertyKey);
    Reflect.defineMetadata('di:postconstruct', existingMethods, target.constructor);
  };
}

/**
 * Execute post-construction methods
 */
export async function executePostConstruct(instance: any): Promise<void> {
  const methods = Reflect.getMetadata('di:postconstruct', instance.constructor) || [];
  for (const method of methods) {
    if (typeof instance[method] === 'function') {
      await instance[method]();
    }
  }
}

/**
 * Decorator for lazy injection
 * The dependency is only resolved when first accessed
 */
export function LazyInject(_token: symbol): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    let instance: any;

    const getter = () => {
      if (!instance) {
        // This would need access to the container
        // For now, it's a placeholder
        throw new Error('LazyInject requires container access');
      }
      return instance;
    };

    const setter = (value: any) => {
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
