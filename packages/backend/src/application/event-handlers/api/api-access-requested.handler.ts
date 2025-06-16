import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { APIAccessRequested } from '@/domain/api/events/api-access-requested.event';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { Logger } from 'pino';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { ApiPath } from '@/domain/api/value-objects/api-path';
import { HttpMethod as ApiHttpMethod } from '@/domain/api/value-objects/http-method';
import { StatusCode } from '@/domain/log/value-objects/status-code';
import { ResponseTime } from '@/domain/log/value-objects/response-time';

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

      // HttpMethodの作成
      const httpMethodResult = ApiHttpMethod.create(event.method);
      if (httpMethodResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: httpMethodResult.error,
          },
          'Invalid method in APIAccessRequested event',
        );
        return;
      }

      // Endpointの作成
      const endpointResult = Endpoint.create({
        path: apiPath,
        method: httpMethodResult.getValue(),
      });
      if (endpointResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: endpointResult.error,
          },
          'Failed to create Endpoint',
        );
        return;
      }

      // ステータスコードとレスポンスタイムは初期値を設定
      // 実際の値は後続のイベントで更新される可能性がある
      const statusCodeResult = StatusCode.create(0); // 処理中
      const responseTimeResult = ResponseTime.create(0);

      if (statusCodeResult.isFailure || responseTimeResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
          },
          'Failed to create initial status code or response time',
        );
        return;
      }

      // APIログエントリの作成
      const logEntryResult = APILogEntry.create({
        userId: userIdResult.getValue(),
        endpoint: endpointResult.getValue(),
        statusCode: statusCodeResult.getValue(),
        responseTime: responseTimeResult.getValue(),
        requestedAt: event.requestTime,
        metadata: {
          endpointId: event.endpointId,
          endpointType: event.endpointType,
          eventId: event.eventId,
          aggregateId: event.aggregateId,
        },
      });

      if (logEntryResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: logEntryResult.error,
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
            error: saveResult.error,
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
