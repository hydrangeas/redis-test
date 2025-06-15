import { injectable, inject } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { AuthLog } from '@/domain/log/entities/auth-log';
import { APILog } from '@/domain/log/entities/api-log';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { AuthEvent } from '@/domain/log/value-objects/auth-event';
import { AuthResult } from '@/domain/log/value-objects/auth-result';
import { APIEndpoint } from '@/domain/api/value-objects/api-endpoint';
import { HTTPMethod } from '@/domain/api/value-objects/http-method';
import { StatusCode } from '@/domain/api/value-objects/status-code';
import { RequestDuration } from '@/domain/api/value-objects/request-duration';
import { RequestId } from '@/domain/api/value-objects/request-id';
import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { Logger } from 'pino';

export interface APIAccessLogParams {
  userId: string | null;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  requestId?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  };
}

export interface APILogQuery {
  userId?: string;
  endpoint?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface APIStatistics {
  successCount: number;
  notFoundCount: number;
  rateLimitCount: number;
  errorCount: number;
  totalCount: number;
}

@injectable()
export class LoggingService {
  constructor(
    @inject(DI_TOKENS.AuthLogRepository) private authLogRepository: IAuthLogRepository,
    @inject(DI_TOKENS.APILogRepository) private apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.Logger) private logger: Logger
  ) {}

  /**
   * Log an authentication event
   */
  async logAuthEvent(
    userId: string,
    event: AuthEvent,
    metadata?: any
  ): Promise<Result<void>> {
    try {
      const userIdResult = UserId.create(userId);
      if (userIdResult.isFailure) {
        return Result.fail(userIdResult.getError());
      }

      const authLogResult = AuthLog.create({
        userId: userIdResult.getValue(),
        event,
        result: this.mapEventToResult(event),
        timestamp: new Date(),
        metadata,
      });

      if (authLogResult.isFailure) {
        return Result.fail(authLogResult.getError());
      }

      await this.authLogRepository.save(authLogResult.getValue());
      return Result.ok();
    } catch (error) {
      this.logger.error({ error, userId, event }, 'Failed to log auth event');
      return Result.fail(
        new DomainError(
          'AUTH_LOG_FAILED',
          'Failed to log authentication event',
          ErrorType.INTERNAL
        )
      );
    }
  }

  /**
   * Log API access
   */
  async logAPIAccess(params: APIAccessLogParams): Promise<Result<void>> {
    try {
      // Handle user ID (null for anonymous)
      let userId: UserId | null = null;
      if (params.userId) {
        const userIdResult = UserId.create(params.userId);
        if (userIdResult.isFailure) {
          return Result.fail(userIdResult.getError());
        }
        userId = userIdResult.getValue();
      }

      // Create value objects
      const endpointResult = APIEndpoint.create(params.endpoint);
      const methodResult = HTTPMethod.create(params.method);
      const statusCodeResult = StatusCode.create(params.statusCode);
      const durationResult = RequestDuration.create(params.duration);
      const requestId = params.requestId
        ? RequestId.create(params.requestId).getValue()
        : RequestId.generate();

      // Check for failures
      if (endpointResult.isFailure) return Result.fail(endpointResult.getError());
      if (methodResult.isFailure) return Result.fail(methodResult.getError());
      if (statusCodeResult.isFailure) return Result.fail(statusCodeResult.getError());
      if (durationResult.isFailure) return Result.fail(durationResult.getError());

      // Create API log
      const apiLogResult = APILog.create({
        userId,
        endpoint: endpointResult.getValue(),
        method: methodResult.getValue(),
        statusCode: statusCodeResult.getValue(),
        duration: durationResult.getValue(),
        requestId,
        timestamp: new Date(),
        metadata: params.metadata,
      });

      if (apiLogResult.isFailure) {
        return Result.fail(apiLogResult.getError());
      }

      // Save using the new interface
      const saveResult = await this.apiLogRepository.save(apiLogResult.getValue());
      if (saveResult.isFailure) {
        return Result.fail(saveResult.getError());
      }

      return Result.ok();
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to log API access');
      return Result.fail(
        new DomainError(
          'API_LOG_FAILED',
          'Failed to log API access',
          ErrorType.INTERNAL
        )
      );
    }
  }

  /**
   * Get authentication logs for a user
   */
  async getAuthLogs(userId: string, limit?: number): Promise<Result<AuthLog[]>> {
    try {
      const userIdResult = UserId.create(userId);
      if (userIdResult.isFailure) {
        return Result.fail(userIdResult.getError());
      }

      const logs = await this.authLogRepository.findByUserId(
        userIdResult.getValue(),
        limit
      );
      return Result.ok(logs);
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to retrieve auth logs');
      return Result.fail(
        new DomainError(
          'AUTH_LOGS_RETRIEVAL_FAILED',
          'Failed to retrieve authentication logs',
          ErrorType.INTERNAL
        )
      );
    }
  }

  /**
   * Get API access logs
   */
  async getAPILogs(query: APILogQuery): Promise<Result<APILog[]>> {
    try {
      if (query.userId) {
        const userIdResult = UserId.create(query.userId);
        if (userIdResult.isFailure) {
          return Result.fail(userIdResult.getError());
        }

        const result = await this.apiLogRepository.findByUserId(
          userIdResult.getValue(),
          undefined,
          query.limit
        );
        return result;
      }

      if (query.endpoint) {
        const endpointResult = APIEndpoint.create(query.endpoint);
        if (endpointResult.isFailure) {
          return Result.fail(endpointResult.getError());
        }

        const result = await this.apiLogRepository.findByEndpoint(
          endpointResult.getValue(),
          query.limit
        );
        return result;
      }

      if (query.startDate && query.endDate) {
        const result = await this.apiLogRepository.findByTimeRange(
          { startDate: query.startDate, endDate: query.endDate },
          query.limit
        );
        return result;
      }

      return Result.ok([]);
    } catch (error) {
      this.logger.error({ error, query }, 'Failed to retrieve API logs');
      return Result.fail(
        new DomainError(
          'API_LOGS_RETRIEVAL_FAILED',
          'Failed to retrieve API logs',
          ErrorType.INTERNAL
        )
      );
    }
  }

  /**
   * Get API statistics for a date range
   */
  async getAPIStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<Result<APIStatistics>> {
    try {
      const statsResult = await this.apiLogRepository.getStatistics({
        startDate,
        endDate,
      });

      if (statsResult.isFailure) {
        return Result.fail(statsResult.getError());
      }

      const stats = statsResult.getValue();
      const statusCounts = stats.requestsByStatus;

      const apiStats: APIStatistics = {
        successCount: statusCounts.get(200) || 0,
        notFoundCount: statusCounts.get(404) || 0,
        rateLimitCount: statusCounts.get(429) || 0,
        errorCount: statusCounts.get(500) || 0,
        totalCount: stats.totalRequests,
      };

      return Result.ok(apiStats);
    } catch (error) {
      this.logger.error({ error, startDate, endDate }, 'Failed to retrieve API statistics');
      return Result.fail(
        new DomainError(
          'API_STATS_RETRIEVAL_FAILED',
          'Failed to retrieve API statistics',
          ErrorType.INTERNAL
        )
      );
    }
  }

  /**
   * Map auth event to result
   */
  private mapEventToResult(event: AuthEvent): AuthResult {
    switch (event) {
      case AuthEvent.LOGIN_SUCCESS:
      case AuthEvent.TOKEN_REFRESH_SUCCESS:
      case AuthEvent.LOGOUT_SUCCESS:
        return AuthResult.SUCCESS;
      case AuthEvent.LOGIN_FAILED:
      case AuthEvent.TOKEN_REFRESH_FAILED:
      case AuthEvent.LOGOUT_FAILED:
        return AuthResult.FAILURE;
      case AuthEvent.TOKEN_EXPIRED:
        return AuthResult.EXPIRED;
      default:
        return AuthResult.FAILURE;
    }
  }
}