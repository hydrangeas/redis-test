import { inject, injectable } from 'tsyringe';

import { APIAccessRequested } from '@/domain/api/events/api-access-requested.event';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { SimpleApiLogEntry } from '@/domain/log/entities/simple-api-log-entry';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { HttpMethod } from '@/domain/log/value-objects/http-method';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import { LogId } from '@/domain/log/value-objects/log-id';
import { ResponseTime } from '@/domain/log/value-objects/response-time';
import { StatusCode } from '@/domain/log/value-objects/status-code';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

@injectable()
export class APILogService {
  private toDomainError(error: Error | DomainError, code: string): DomainError {
    return error instanceof DomainError
      ? error
      : new DomainError(code, error.message, ErrorType.INTERNAL);
  }
  constructor(
    @inject(DI_TOKENS.APILogRepository) private apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.EventBus) private eventBus: IEventBus,
  ) {}

  async logAPIAccess(params: {
    userId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    duration: number;
    requestId?: string;
    correlationId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Result<void>> {
    try {
      // Create value objects
      const userIdResult = params.userId === 'anonymous' ? undefined : UserId.create(params.userId);
      const httpMethodResult = HttpMethod.create(params.method);
      const statusCodeResult = StatusCode.create(params.statusCode);
      const responseTimeResult = ResponseTime.create(params.duration);
      const ipAddressResult = params.ipAddress ? IPAddress.create(params.ipAddress) : IPAddress.create('0.0.0.0');
      const userAgentResult = params.userAgent ? UserAgent.create(params.userAgent) : UserAgent.unknown();

      // Check if any value object creation failed
      if (userIdResult && userIdResult.isFailure) {
        return Result.fail(this.toDomainError(userIdResult.getError(), 'USER_ID_ERROR'));
      }
      if (httpMethodResult.isFailure) {
        return Result.fail(this.toDomainError(httpMethodResult.getError(), 'HTTP_METHOD_ERROR'));
      }
      if (statusCodeResult.isFailure) {
        return Result.fail(this.toDomainError(statusCodeResult.getError(), 'STATUS_CODE_ERROR'));
      }
      if (responseTimeResult.isFailure) {
        return Result.fail(this.toDomainError(responseTimeResult.getError(), 'RESPONSE_TIME_ERROR'));
      }
      if (ipAddressResult.isFailure) {
        return Result.fail(this.toDomainError(ipAddressResult.getError(), 'IP_ADDRESS_ERROR'));
      }
      if (userAgentResult.isFailure) {
        return Result.fail(this.toDomainError(userAgentResult.getError(), 'USER_AGENT_ERROR'));
      }

      // Create SimpleApiLogEntry
      const logEntryResult = SimpleApiLogEntry.create(
        LogId.generate(),
        {
          userId: userIdResult && !userIdResult.isFailure ? userIdResult.getValue() : undefined,
          endpoint: params.endpoint,
          method: httpMethodResult.getValue(),
          statusCode: statusCodeResult.getValue(),
          responseTime: responseTimeResult.getValue().milliseconds,
          ipAddress: ipAddressResult.getValue(),
          userAgent: userAgentResult.getValue(),
          timestamp: new Date(),
          errorMessage: undefined,
          responseSize: undefined,
        },
      );

      if (logEntryResult.isFailure) {
        return Result.fail(this.toDomainError(logEntryResult.getError(), 'LOG_ENTRY_ERROR'));
      }

      const logEntry = logEntryResult.getValue();

      // Save to repository - cast to APILogEntry as SimpleApiLogEntry implements the interface
      await this.apiLogRepository.save(logEntry as unknown as APILogEntry);

      // Publish event
      // Generate a unique aggregate ID for the event
      const aggregateId = LogId.generate().value;
      const event = new APIAccessRequested(
        aggregateId,
        params.userId === 'anonymous' ? 'anonymous' : params.userId,
        params.endpoint, // endpointId
        params.endpoint, // path
        params.method,
        'API', // endpointType
        new Date(),
      );
      this.eventBus.publish(event);

      return Result.ok<void>(undefined);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'API_LOG_FAILED',
          `Failed to log API access: ${(error as Error).message}`,
          ErrorType.INTERNAL,
        ),
      );
    }
  }
}