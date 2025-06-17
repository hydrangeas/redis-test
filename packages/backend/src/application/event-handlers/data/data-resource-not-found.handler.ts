import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { DataResourceNotFound } from '@/domain/data/events/data-resource-not-found.event';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { Logger } from 'pino';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { ApiPath } from '@/domain/api/value-objects/api-path';
import { HttpMethod as ApiHttpMethod } from '@/domain/api/value-objects/http-method';
import { RequestInfo } from '@/domain/log/value-objects/request-info';
import { ResponseInfo } from '@/domain/log/value-objects/response-info';

/**
 * データリソース未発見イベントのハンドラー
 * APIアクセスログへの記録を行う
 */
@injectable()
export class DataResourceNotFoundHandler implements IEventHandler<DataResourceNotFound> {
  constructor(
    @inject(DI_TOKENS.APILogRepository)
    private readonly apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async handle(event: DataResourceNotFound): Promise<void> {
    try {
      this.logger.info(
        {
          eventId: event.eventId,
          userId: event.userId,
          requestedPath: event.requestedPath,
        },
        'Handling DataResourceNotFound event',
      );

      // UserIdの作成
      const userIdResult = UserId.create(event.userId);
      if (userIdResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: userIdResult.error,
          },
          'Invalid userId in DataResourceNotFound event',
        );
        return;
      }

      // ApiPathの作成
      let apiPath: ApiPath;
      try {
        apiPath = new ApiPath(event.requestedPath);
      } catch (error) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Invalid requestedPath in DataResourceNotFound event',
        );
        return;
      }

      // HttpMethodの設定（データ取得はGETメソッド）
      const httpMethod = ApiHttpMethod.GET;

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
        userAgent: 'Data Access', // TODO: Get from request headers
        headers: {},
        body: null,
        queryParams: undefined,
      });

      // ResponseInfoの作成（404 Not Found）
      const responseInfo = new ResponseInfo({
        statusCode: 404,
        responseTime: 0, // エラーレスポンスは即座に返される
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
        error: 'Resource not found',
      });

      if (logEntryResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: logEntryResult.getError(),
          },
          'Failed to create APILogEntry for resource not found',
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
          'Failed to save resource not found log',
        );
        return;
      }

      // 頻繁な404エラーの検出
      const recentErrorsResult = await this.apiLogRepository.findErrors(undefined, 20);

      if (recentErrorsResult.isSuccess && recentErrorsResult.getValue().length >= 10) {
        this.logger.warn(
          {
            eventId: event.eventId,
            errorCount: recentErrorsResult.getValue().length,
          },
          'High number of 404 errors detected',
        );
      }

      this.logger.info(
        {
          eventId: event.eventId,
          logId: logEntryResult.getValue().id.value,
        },
        'DataResourceNotFound event handled successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          eventId: event.eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error handling DataResourceNotFound event',
      );
      throw error;
    }
  }
}
