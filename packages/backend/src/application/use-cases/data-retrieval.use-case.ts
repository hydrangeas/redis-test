import { injectable, inject } from 'tsyringe';
import { IDataRetrievalUseCase } from '@/application/interfaces/data-retrieval-use-case.interface';
import { IOpenDataRepository } from '@/domain/data/interfaces/open-data-repository.interface';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { DataPath } from '@/domain/data/value-objects/data-path';
import { Result } from '@/domain/shared/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { DataAccessRequested } from '@/domain/data/events/data-access-requested.event';
import { DataRetrieved } from '@/domain/data/events/data-retrieved.event';
import { DataResourceNotFound } from '@/domain/data/events/data-resource-not-found.event';
import { DataAccessDenied } from '@/domain/data/events/data-access-denied.event';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Logger } from 'pino';

/**
 * データ取得ユースケースの実装
 * オープンデータAPIのデータ取得機能を提供
 */
@injectable()
export class DataRetrievalUseCase implements IDataRetrievalUseCase {
  constructor(
    @inject(DI_TOKENS.OpenDataRepository)
    private readonly dataRepository: IOpenDataRepository,
    @inject(DI_TOKENS.EventBus)
    private readonly eventBus: IEventBus,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger
  ) {}

  /**
   * 指定されたパスのデータを取得
   */
  async retrieveData(path: string): Promise<Result<any, DomainError>> {
    try {
      // DataPath値オブジェクトの作成
      const dataPathResult = DataPath.create(path);
      if (dataPathResult.isFailure) {
        this.logger.warn({ path }, 'Invalid data path');
        
        // データアクセス拒否イベントを発行
        await this.eventBus.publish(new DataAccessDenied(
          'system',
          1,
          path,
          'INVALID_PATH',
          new Date()
        ));
        
        return Result.fail(dataPathResult.error!);
      }

      const dataPath = dataPathResult.getValue();

      // データアクセス要求イベントを発行
      await this.eventBus.publish(new DataAccessRequested(
        dataPath.value,
        1,
        dataPath.value,
        new Date()
      ));

      // リポジトリからリソースを検索
      const resourceResult = await this.dataRepository.findByPath(dataPath);
      if (resourceResult.isFailure) {
        this.logger.error(
          { path: dataPath.value, error: resourceResult.error },
          'Failed to find resource'
        );

        // リソースが見つからない場合のイベント発行
        if (resourceResult.error!.type === ErrorType.NOT_FOUND) {
          await this.eventBus.publish(new DataResourceNotFound(
            dataPath.value,
            1,
            dataPath.value,
            new Date()
          ));
        }

        return Result.fail(resourceResult.error!);
      }

      const resource = resourceResult.getValue();

      // リソースのコンテンツを取得
      const contentResult = await this.dataRepository.getContent(resource);
      if (contentResult.isFailure) {
        this.logger.error(
          { path: dataPath.value, error: contentResult.error },
          'Failed to get resource content'
        );
        return Result.fail(contentResult.error!);
      }

      // アクセス記録を更新
      resource.recordAccess();

      // データ取得成功イベントを発行
      await this.eventBus.publish(new DataRetrieved(
        resource.id.value,
        1,
        resource.path.value,
        resource.metadata.size,
        resource.metadata.contentType,
        new Date()
      ));

      this.logger.info(
        { 
          path: dataPath.value, 
          size: resource.metadata.size,
          contentType: resource.metadata.contentType 
        },
        'Data retrieved successfully'
      );

      return Result.ok(contentResult.getValue());
    } catch (error) {
      this.logger.error(
        { path, error: error instanceof Error ? error.message : 'Unknown error' },
        'Unexpected error in data retrieval'
      );
      
      return Result.fail(
        new DomainError(
          'DATA_RETRIEVAL_ERROR',
          'Failed to retrieve data',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  /**
   * 指定されたパスのデータメタデータを取得
   */
  async retrieveMetadata(path: string): Promise<Result<{
    size: number;
    lastModified: Date;
    etag: string;
    contentType: string;
  }, DomainError>> {
    try {
      // DataPath値オブジェクトの作成
      const dataPathResult = DataPath.create(path);
      if (dataPathResult.isFailure) {
        return Result.fail(dataPathResult.error!);
      }

      const dataPath = dataPathResult.getValue();

      // リポジトリからリソースを検索
      const resourceResult = await this.dataRepository.findByPath(dataPath);
      if (resourceResult.isFailure) {
        return Result.fail(resourceResult.error!);
      }

      const resource = resourceResult.getValue();

      return Result.ok({
        size: resource.metadata.size,
        lastModified: resource.metadata.lastModified,
        etag: resource.metadata.etag,
        contentType: resource.metadata.contentType,
      });
    } catch (error) {
      return Result.fail(
        new DomainError(
          'METADATA_RETRIEVAL_ERROR',
          'Failed to retrieve metadata',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  /**
   * 条件付きデータ取得（ETagベース）
   */
  async retrieveDataWithETag(path: string, etag: string): Promise<Result<{
    data?: any;
    notModified: boolean;
    newEtag?: string;
  }, DomainError>> {
    try {
      // DataPath値オブジェクトの作成
      const dataPathResult = DataPath.create(path);
      if (dataPathResult.isFailure) {
        return Result.fail(dataPathResult.error!);
      }

      const dataPath = dataPathResult.getValue();

      // リポジトリからリソースを検索
      const resourceResult = await this.dataRepository.findByPath(dataPath);
      if (resourceResult.isFailure) {
        return Result.fail(resourceResult.error!);
      }

      const resource = resourceResult.getValue();

      // ETagが一致する場合は304 Not Modified
      if (resource.matchesEtag(etag)) {
        this.logger.debug(
          { path: dataPath.value, etag },
          'Resource not modified (ETag match)'
        );
        
        return Result.ok({
          notModified: true,
          newEtag: resource.metadata.etag,
        });
      }

      // ETagが一致しない場合は新しいデータを返す
      const contentResult = await this.dataRepository.getContent(resource);
      if (contentResult.isFailure) {
        return Result.fail(contentResult.error!);
      }

      // アクセス記録を更新
      resource.recordAccess();

      // データ取得成功イベントを発行
      await this.eventBus.publish(new DataRetrieved(
        resource.id.value,
        1,
        resource.path.value,
        resource.metadata.size,
        resource.metadata.contentType,
        new Date()
      ));

      return Result.ok({
        data: contentResult.getValue(),
        notModified: false,
        newEtag: resource.metadata.etag,
      });
    } catch (error) {
      return Result.fail(
        new DomainError(
          'CONDITIONAL_RETRIEVAL_ERROR',
          'Failed to retrieve data with ETag',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  /**
   * 条件付きデータ取得（Last-Modifiedベース）
   */
  async retrieveDataIfModified(path: string, ifModifiedSince: Date): Promise<Result<{
    data?: any;
    notModified: boolean;
    lastModified?: Date;
  }, DomainError>> {
    try {
      // DataPath値オブジェクトの作成
      const dataPathResult = DataPath.create(path);
      if (dataPathResult.isFailure) {
        return Result.fail(dataPathResult.error!);
      }

      const dataPath = dataPathResult.getValue();

      // リポジトリからリソースを検索
      const resourceResult = await this.dataRepository.findByPath(dataPath);
      if (resourceResult.isFailure) {
        return Result.fail(resourceResult.error!);
      }

      const resource = resourceResult.getValue();

      // Last-Modifiedが指定日時以降でない場合は304 Not Modified
      if (!resource.isModifiedSince(ifModifiedSince)) {
        this.logger.debug(
          { path: dataPath.value, ifModifiedSince },
          'Resource not modified (Last-Modified check)'
        );
        
        return Result.ok({
          notModified: true,
          lastModified: resource.metadata.lastModified,
        });
      }

      // 更新されている場合は新しいデータを返す
      const contentResult = await this.dataRepository.getContent(resource);
      if (contentResult.isFailure) {
        return Result.fail(contentResult.error!);
      }

      // アクセス記録を更新
      resource.recordAccess();

      // データ取得成功イベントを発行
      await this.eventBus.publish(new DataRetrieved(
        resource.id.value,
        1,
        resource.path.value,
        resource.metadata.size,
        resource.metadata.contentType,
        new Date()
      ));

      return Result.ok({
        data: contentResult.getValue(),
        notModified: false,
        lastModified: resource.metadata.lastModified,
      });
    } catch (error) {
      return Result.fail(
        new DomainError(
          'CONDITIONAL_RETRIEVAL_ERROR',
          'Failed to retrieve data with If-Modified-Since',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }
}