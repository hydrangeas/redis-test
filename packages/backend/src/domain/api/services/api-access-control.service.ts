import { injectable } from 'tsyringe';
import { AuthenticatedUser } from '../../auth/value-objects/authenticated-user';
import { EndpointPath } from '../value-objects/endpoint-path';
import { EndpointType } from '../value-objects/endpoint-type';
import { RateLimitWindow } from '../value-objects/rate-limit-window';
import { RequestCount } from '../value-objects/request-count';
import { DomainError, ErrorType } from '../../shared/errors/domain-error';
import { Result } from '../../shared/result';
import { ValidationError } from '../../shared/errors/validation-error';
import { RateLimitException } from '../../shared/errors/exceptions';

export interface RateLimitStatus {
  allowed: boolean;
  currentCount: number;
  limit: number;
  resetTime: Date;
  remainingRequests: number;
}

export interface IAPIAccessControlService {
  /**
   * Checks if a user can access an endpoint based on tier requirements
   */
  canAccessEndpoint(
    user: AuthenticatedUser,
    endpoint: EndpointPath,
    endpointType: EndpointType
  ): Result<boolean>;

  /**
   * Checks rate limit for a user
   */
  checkRateLimit(
    user: AuthenticatedUser,
    currentRequestCount: RequestCount,
    window: RateLimitWindow
  ): Result<RateLimitStatus>;

  /**
   * Calculates when the rate limit window will reset
   */
  calculateResetTime(window: RateLimitWindow): Date;
}

@injectable()
export class APIAccessControlService implements IAPIAccessControlService {
  
  canAccessEndpoint(
    user: AuthenticatedUser,
    endpoint: EndpointPath,
    endpointType: EndpointType
  ): Result<boolean> {
    try {
      if (!user) {
        return Result.fail(new ValidationError('User is required'));
      }
      
      if (!endpoint) {
        return Result.fail(new ValidationError('Endpoint is required'));
      }
      
      if (!endpointType) {
        return Result.fail(new ValidationError('Endpoint type is required'));
      }

      // Check if user's tier meets the endpoint requirements
      const canAccess = user.canAccessEndpoint(endpointType.requiredTier);
      
      if (!canAccess) {
        return Result.fail(
          new DomainError(
            'INSUFFICIENT_TIER',
            `User tier ${user.tier.level} cannot access endpoint requiring ${endpointType.requiredTier}`,
            ErrorType.FORBIDDEN,
            {
              userTier: user.tier.level,
              requiredTier: endpointType.requiredTier,
              endpoint: endpoint.value
            }
          )
        );
      }

      return Result.ok(true);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'ACCESS_CHECK_ERROR',
          'Failed to check endpoint access',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  checkRateLimit(
    user: AuthenticatedUser,
    currentRequestCount: RequestCount,
    window: RateLimitWindow
  ): Result<RateLimitStatus> {
    try {
      if (!user) {
        return Result.fail(new ValidationError('User is required'));
      }
      
      if (!currentRequestCount) {
        return Result.fail(new ValidationError('Current request count is required'));
      }
      
      if (!window) {
        return Result.fail(new ValidationError('Rate limit window is required'));
      }

      const userRateLimit = user.getRateLimit();
      const resetTime = this.calculateResetTime(window);
      const remainingRequests = Math.max(0, userRateLimit.maxRequests - currentRequestCount.value);
      
      const status: RateLimitStatus = {
        allowed: currentRequestCount.value < userRateLimit.maxRequests,
        currentCount: currentRequestCount.value,
        limit: userRateLimit.maxRequests,
        resetTime,
        remainingRequests
      };

      if (!status.allowed) {
        return Result.fail(
          new RateLimitException(
            userRateLimit.maxRequests,
            resetTime,
            Math.ceil((resetTime.getTime() - Date.now()) / 1000)
          )
        );
      }

      return Result.ok(status);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'RATE_LIMIT_CHECK_ERROR',
          'Failed to check rate limit',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  calculateResetTime(window: RateLimitWindow): Date {
    const now = new Date();
    const windowStart = window.startTime;
    const windowDurationMs = window.windowSizeSeconds * 1000;
    const windowEndTime = new Date(windowStart.getTime() + windowDurationMs);
    
    // If current time is past window end, the next window starts now
    if (now >= windowEndTime) {
      return new Date(now.getTime() + windowDurationMs);
    }
    
    // Otherwise, return when current window ends
    return windowEndTime;
  }
}