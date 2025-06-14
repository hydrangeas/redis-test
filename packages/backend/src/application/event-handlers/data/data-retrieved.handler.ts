import { injectable, inject } from 'tsyringe';
import { IEventHandler } from '@/domain/interfaces/event-bus.interface';
import { DataRetrieved } from '@/domain/data/events/data-retrieved.event';
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
 * データ取得イベントのハンドラー
 * APIアクセスログへの記録を行う
 */
@injectable()
export class DataRetrievedHandler implements IEventHandler<DataRetrieved> {
  constructor(
    @inject(DI_TOKENS.APILogRepository)
    private readonly apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger
  ) {}

  async handle(event: DataRetrieved): Promise<void> {
    try {
      this.logger.info({
        eventId: event.eventId,
        userId: event.userId,
        dataPath: event.dataPath,
        resourceSize: event.resourceSize,
        responseTime: event.responseTime,
        cached: event.cached,
      }, 'Handling DataRetrieved event');

      // UserIdの作成
      const userIdResult = UserId.create(event.userId);
      if (userIdResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
          error: userIdResult.error,
        }, 'Invalid userId in DataRetrieved event');
        return;
      }

      // ApiPathの作成
      const apiPathResult = ApiPath.create(event.dataPath);
      if (apiPathResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
          error: apiPathResult.error,
        }, 'Invalid dataPath in DataRetrieved event');
        return;
      }

      // HttpMethodの作成（データ取得はGETメソッド）
      const httpMethodResult = ApiHttpMethod.create('GET');
      if (httpMethodResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
          error: httpMethodResult.error,
        }, 'Failed to create HttpMethod');
        return;
      }

      // Endpointの作成
      const endpointResult = Endpoint.create({
        path: apiPathResult.getValue(),
        method: httpMethodResult.getValue(),
      });
      if (endpointResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
          error: endpointResult.error,
        }, 'Failed to create Endpoint');
        return;
      }

      // ステータスコードとレスポンスタイムの作成
      const statusCodeResult = StatusCode.create(200); // データ取得成功
      const responseTimeResult = ResponseTime.create(event.responseTime);

      if (statusCodeResult.isFailure || responseTimeResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
        }, 'Failed to create status code or response time');
        return;
      }

      // APIログエントリの作成
      const logEntryResult = APILogEntry.create({
        userId: userIdResult.getValue(),
        endpoint: endpointResult.getValue(),
        statusCode: statusCodeResult.getValue(),
        responseTime: responseTimeResult.getValue(),
        metadata: {
          dataSize: event.resourceSize,
          mimeType: event.mimeType,
          cached: event.cached,
          eventId: event.eventId,
          aggregateId: event.aggregateId,
        },
      });

      if (logEntryResult.isFailure) {
        this.logger.error({
          eventId: event.eventId,
          error: logEntryResult.error,
        }, 'Failed to create APILogEntry for data retrieval');
        return;
      }

      // ログの保存
      const saveResult = await this.apiLogRepository.save(logEntryResult.getValue());
      if (saveResult.isFailure()) {
        this.logger.error({
          eventId: event.eventId,
          error: saveResult.error,
        }, 'Failed to save data retrieval log');
        return;
      }

      // パフォーマンスメトリクスの記録
      if (event.responseTime > 5000) {
        this.logger.warn({
          eventId: event.eventId,
          dataPath: event.dataPath,
          responseTime: event.responseTime,
          resourceSize: event.resourceSize,
        }, 'Slow data retrieval detected');
      }

      this.logger.info({
        eventId: event.eventId,
        logId: logEntryResult.getValue().id.value,
      }, 'DataRetrieved event handled successfully');

    } catch (error) {
      this.logger.error({
        eventId: event.eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error handling DataRetrieved event');
      throw error;
    }
  }
}