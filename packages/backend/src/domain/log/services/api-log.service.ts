import { inject, injectable } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { IEventBus } from '@/domain/shared/interfaces/event-bus.interface';
import { APILog } from '@/domain/log/entities/api-log';
import { Result } from '@/domain/errors';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { APIEndpoint } from '@/domain/api/value-objects/api-endpoint';
import { HTTPMethod } from '@/domain/api/value-objects/http-method';
import { StatusCode } from '@/domain/api/value-objects/status-code';
import { RequestDuration } from '@/domain/api/value-objects/request-duration';
import { RequestId } from '@/domain/api/value-objects/request-id';
import { APIAccessRequested } from '@/domain/api/events/api-access-requested.event';

@injectable()
export class APILogService {
  constructor(
    @inject(DI_TOKENS.APILogRepository) private apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.EventBus) private eventBus: IEventBus
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
      const userIdResult = params.userId === 'anonymous' 
        ? Result.ok(null)
        : UserId.create(params.userId).map(id => id);
      
      const endpointResult = APIEndpoint.create(params.endpoint);
      const methodResult = HTTPMethod.create(params.method);
      const statusCodeResult = StatusCode.create(params.statusCode);
      const durationResult = RequestDuration.create(params.duration);
      const requestIdResult = params.requestId
        ? RequestId.create(params.requestId)
        : Result.ok(RequestId.generate());

      // Check if any value object creation failed
      if (endpointResult.isFailure) {
        return Result.fail(endpointResult.getError());
      }
      if (methodResult.isFailure) {
        return Result.fail(methodResult.getError());
      }
      if (statusCodeResult.isFailure) {
        return Result.fail(statusCodeResult.getError());
      }
      if (durationResult.isFailure) {
        return Result.fail(durationResult.getError());
      }
      if (requestIdResult.isFailure) {
        return Result.fail(requestIdResult.getError());
      }

      // Create APILog entity
      const apiLogResult = APILog.create({
        userId: userIdResult.getValue(),
        endpoint: endpointResult.getValue(),
        method: methodResult.getValue(),
        statusCode: statusCodeResult.getValue(),
        duration: durationResult.getValue(),
        requestId: requestIdResult.getValue(),
        timestamp: new Date(),
        metadata: {
          correlationId: params.correlationId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      if (apiLogResult.isFailure) {
        return Result.fail(apiLogResult.getError());
      }

      const apiLog = apiLogResult.getValue();

      // Save to repository
      await this.apiLogRepository.save(apiLog);

      // Publish event
      const event = new APIAccessRequested(
        params.userId === 'anonymous' ? null : params.userId,
        params.endpoint,
        params.method,
        params.statusCode,
        new Date()
      );
      await this.eventBus.publish(event);

      return Result.ok();
    } catch (error) {
      return Result.fail({
        code: 'API_LOG_FAILED',
        message: `Failed to log API access: ${error.message}`,
      });
    }
  }
}