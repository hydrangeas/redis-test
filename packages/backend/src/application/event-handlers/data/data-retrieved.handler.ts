import { Logger } from 'pino';

import { injectable, inject } from 'tsyringe';

import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { ApiPath } from '@/domain/api/value-objects/api-path';
import { DataRetrieved } from '@/domain/data/events/data-retrieved.event';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { HttpMethod as ApiHttpMethod } from '@/domain/api/value-objects/http-method';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { RequestInfo } from '@/domain/log/value-objects/request-info';
import { ResponseInfo } from '@/domain/log/value-objects/response-info';
import { UserId } from '@/domain/auth/value-objects/user-id';

import { DI_TOKENS } from '@/infrastructure/di/tokens';

/**
 * データ取得イベントのハンドラー
 * APIアクセスログへの記録を行う
 */
@injectable()
export class DataRetrievedHandler implements IEventHandler<DataRetrieved> {
  constructor(
    @inject(DI_TOKENS.APILogRepository)
    private readonly apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async handle(event: DataRetrieved): Promise<void> {
    try {
      this.logger.info(
        {
          eventId: event.eventId,
          userId: event.userId,
          dataPath: event.dataPath,
          resourceSize: event.resourceSize,
          responseTime: event.responseTime,
          cached: event.cached,
        },
        'Handling DataRetrieved event',
      );

      // UserIdの作成
      const userIdResult = UserId.create(event.userId);
      if (userIdResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: userIdResult.error,
          },
          'Invalid userId in DataRetrieved event',
        );
        return;
      }

      // ApiPathの作成
      let apiPath: ApiPath;
      try {
        apiPath = new ApiPath(event.dataPath);
      } catch (error) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Invalid dataPath in DataRetrieved event',
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

      // ResponseInfoの作成
      const responseInfo = new ResponseInfo({
        statusCode: 200,
        responseTime: event.responseTime,
        size: event.resourceSize,
        headers: {
          'content-type': event.mimeType,
        },
      });

      // APIログエントリの作成
      const logEntryResult = APILogEntry.create({
        userId: userIdResult.getValue(),
        endpoint: endpoint,
        requestInfo: requestInfo,
        responseInfo: responseInfo,
        timestamp: new Date(),
        error: undefined,
      });

      if (logEntryResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: logEntryResult.getError(),
          },
          'Failed to create APILogEntry for data retrieval',
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
          'Failed to save data retrieval log',
        );
        return;
      }

      // パフォーマンスメトリクスの記録
      if (event.responseTime > 5000) {
        this.logger.warn(
          {
            eventId: event.eventId,
            dataPath: event.dataPath,
            responseTime: event.responseTime,
            resourceSize: event.resourceSize,
          },
          'Slow data retrieval detected',
        );
      }

      this.logger.info(
        {
          eventId: event.eventId,
          logId: logEntryResult.getValue().id.value,
        },
        'DataRetrieved event handled successfully',
      );
    } catch (error) {
      this.logger.error(
        {
          eventId: event.eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error handling DataRetrieved event',
      );
      throw error;
    }
  }
}
