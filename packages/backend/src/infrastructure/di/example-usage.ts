/**
 * Example usage of DI container and decorators
 * This file demonstrates how to use the DI container in the application
 */

import { injectable } from 'tsyringe';
import { container } from 'tsyringe';
import { DI_TOKENS } from './tokens.js';
import { InjectLogger, InjectAuthenticationUseCase } from './decorators.js';
import type { Logger } from 'pino';
import type { AuthenticationUseCase } from '../../application/use-cases/authentication.use-case.js';

// Example 1: Using decorators in a service class
@injectable()
export class ExampleService {
  constructor(
    @InjectLogger() private readonly logger: Logger,
    @InjectAuthenticationUseCase() private readonly authUseCase: AuthenticationUseCase,
  ) {}

  async authenticateRequest(token: string): Promise<void> {
    this.logger.info('Authenticating request');
    
    const result = await this.authUseCase.execute({ token });
    
    if (!result.success) {
      this.logger.error({ error: result.error }, 'Authentication failed');
      throw new Error('Unauthorized');
    }
    
    this.logger.info({ userId: result.userId, tier: result.tier }, 'User authenticated');
  }
}

// Example 2: Manual resolution from container
export function getLoggerExample(): Logger {
  return container.resolve<Logger>(DI_TOKENS.Logger);
}

// Example 3: Using in Fastify route handler
export async function routeHandlerExample(request: any, reply: any) {
  // Resolve dependencies
  const authUseCase = container.resolve(DI_TOKENS.AuthenticationUseCase);
  const logger = container.resolve<Logger>(DI_TOKENS.Logger);
  
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return reply.code(401).send({ error: 'No token provided' });
    }
    
    const result = await authUseCase.execute({ token });
    
    if (!result.success) {
      return reply.code(401).send({ error: result.error });
    }
    
    // Continue with authenticated request
    logger.info({ userId: result.userId }, 'Request authenticated');
    
    return { userId: result.userId, tier: result.tier };
  } catch (error) {
    logger.error({ error }, 'Route handler error');
    return reply.code(500).send({ error: 'Internal server error' });
  }
}