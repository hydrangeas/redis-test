import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { APIAccessRequested } from '@/domain/api/events/api-access-requested.event';
import { ApiPath } from '@/domain/api/value-objects/api-path';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { HttpMethod as ApiHttpMethod } from '@/domain/api/value-objects/http-method';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { RequestInfo } from '@/domain/log/value-objects/request-info';
import { ResponseInfo } from '@/domain/log/value-objects/response-info';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

/**
 * APIアクセス要求イベントのハンドラー
 * APIアクセスログへの記録を行う
 */
@injectable()
export class APIAccessRequestedHandler implements IEventHandler<APIAccessRequested> {
  constructor(
    @inject(DI_TOKENS.APILogRepository)
    private readonly apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async handle(event: APIAccessRequested): Promise<void> {
    try {
      this.logger.info(
        {
          eventId: event.eventId,
          userId: event.userId,
          path: event.path,
          method: event.method,
        },
        'Handling APIAccessRequested event',
      );

      // UserIdの作成
      const userIdResult = UserId.create(event.userId);
      if (userIdResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: userIdResult.error,
          },
          'Invalid userId in APIAccessRequested event',
        );
        return;
      }

      // ApiPathの作成
      let apiPath: ApiPath;
      try {
        apiPath = new ApiPath(event.path);
      } catch (error) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Invalid path in APIAccessRequested event',
        );
        return;
      }

      // HttpMethodの検証
      let httpMethod: ApiHttpMethod;
      try {
        // event.method is already an HttpMethod enum value
        httpMethod = event.method as ApiHttpMethod;
      } catch (error) {
        this.logger.error(
          {
            eventId: event.eventId,
            method: event.method,
            error: error instanceof Error ? error.message : 'Invalid HTTP method',
          },
          'Invalid method in APIAccessRequested event',
        );
        return;
      }

      // Endpointの作成
      let endpoint: Endpoint;
      try {
        endpoint = new Endpoint(httpMethod, apiPath);
      } catch (error) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: error instanceof Error ? error.message : 'Failed to create endpoint',
          },
          'Failed to create Endpoint',
        );
        return;
      }

      // RequestInfoの作成
      const requestInfo = new RequestInfo({
        ipAddress: '0.0.0.0', // TODO: Get from request context
        userAgent: 'API Access', // TODO: Get from request headers
        headers: {}, // TODO: Get from request
        body: null,
        queryParams: undefined,
      });

      // ResponseInfoの作成（初期値）
      const responseInfo = new ResponseInfo({
        statusCode: 0, // 処理中
        responseTime: 0,
        size: 0,
        headers: {},
      });

      // APIログエントリの作成
      const logEntryResult = APILogEntry.create({
        userId: userIdResult.getValue(),
        endpoint: endpoint,
        requestInfo: requestInfo,
        responseInfo: responseInfo,
        timestamp: event.requestTime,
        error: undefined,
      });

      if (logEntryResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: logEntryResult.getError(),
          },
          'Failed to create APILogEntry',
        );
        return;
      }

      // ログの保存
      const saveResult = await this.apiLogRepository.save(logEntryResult.getValue());
      if (saveResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: saveResult.getError(),
          },
          'Failed to save API access log',
        );
        return;
      }

      this.logger.info(
        {
          eventId: event.eventId,
          logId: logEntryResult.getValue().id.value,
        },
        'APIAccessRequested event handled successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          eventId: event.eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error handling APIAccessRequested event',
      );
      throw error;
    }
  }
}
