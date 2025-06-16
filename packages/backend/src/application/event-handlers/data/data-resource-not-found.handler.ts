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
import { StatusCode } from '@/domain/log/value-objects/status-code';
import { ResponseTime } from '@/domain/log/value-objects/response-time';

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
      const apiPathResult = ApiPath.create(event.requestedPath);
      if (apiPathResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: apiPathResult.error,
          },
          'Invalid requestedPath in DataResourceNotFound event',
        );
        return;
      }

      // HttpMethodの作成（データ取得はGETメソッド）
      const httpMethodResult = ApiHttpMethod.create('GET');
      if (httpMethodResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: httpMethodResult.error,
          },
          'Failed to create HttpMethod',
        );
        return;
      }

      // Endpointの作成
      const endpointResult = Endpoint.create({
        path: apiPathResult.getValue(),
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

      // ステータスコードとレスポンスタイムの作成
      const statusCodeResult = StatusCode.create(404); // Not Found
      const responseTimeResult = ResponseTime.create(0); // エラーレスポンスは即座に返される

      if (statusCodeResult.isFailure || responseTimeResult.isFailure) {
        this.logger.error(
          {
            eventId: event.eventId,
          },
          'Failed to create status code or response time',
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
        error: 'Resource not found',
        metadata: {
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
          'Failed to create APILogEntry for resource not found',
        );
        return;
      }

      // ログの保存
      const saveResult = await this.apiLogRepository.save(logEntryResult.getValue());
      if (saveResult.isFailure()) {
        this.logger.error(
          {
            eventId: event.eventId,
            error: saveResult.error,
          },
          'Failed to save resource not found log',
        );
        return;
      }

      // 頻繁な404エラーの検出
      const recentErrorsResult = await this.apiLogRepository.findErrors({
        statusCode: statusCodeResult.getValue(),
        limit: 20,
      });

      if (recentErrorsResult.isSuccess() && recentErrorsResult.getValue().length >= 10) {
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
