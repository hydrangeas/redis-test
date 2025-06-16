import { AggregateRoot } from '@/domain/shared/aggregate-root';
import { OpenDataResource } from '../entities/open-data-resource.entity';
import { ResourceId } from '../value-objects/resource-id';
import { DataPath } from '../value-objects/data-path';
import { ResourceMetadata } from '../value-objects/resource-metadata';
import { Result } from '@/domain/shared/result';
import { Guard } from '@/domain/shared/guard';
import { DomainError } from '@/domain/errors/domain-error';
import { DataAccessRequested } from '../events/data-access-requested.event';
import { DataResourceNotFound } from '../events/data-resource-not-found.event';
import { DataAccessDenied } from '../events/data-access-denied.event';

export interface DataAggregateProps {
  resources: Map<string, OpenDataResource>; // resourceId -> OpenDataResource
  cacheSettings: {
    defaultCacheDurationSeconds: number;
    maxCachedResources: number;
  };
}

/**
 * データ集約
 * オープンデータリソースを管理し、アクセス制御とキャッシュ管理を行う
 */
export class DataAggregate extends AggregateRoot<DataAggregateProps> {
  private constructor(props: DataAggregateProps, id?: string) {
    super(props, id);
  }

  get resources(): Map<string, OpenDataResource> {
    return this.props.resources;
  }

  get cacheSettings(): DataAggregateProps['cacheSettings'] {
    return this.props.cacheSettings;
  }

  /**
   * リソースを追加
   */
  addResource(resource: OpenDataResource): Result<void> {
    const guardResult = Guard.againstNullOrUndefined(resource, 'resource');
    if (!guardResult.succeeded) {
      return Result.fail(DomainError.validation('INVALID_RESOURCE', guardResult.message));
    }

    // 既存のリソースかチェック
    if (this.props.resources.has(resource.id.value)) {
      return Result.fail(
        DomainError.businessRule(
          'RESOURCE_ALREADY_EXISTS',
          `Resource ${resource.id.value} already exists`,
        ),
      );
    }

    // 同じパスのリソースが存在しないかチェック
    const duplicate = Array.from(this.props.resources.values()).find(
      (r) => r.path.value === resource.path.value,
    );
    if (duplicate) {
      return Result.fail(
        DomainError.businessRule(
          'DUPLICATE_RESOURCE_PATH',
          `Resource with path ${resource.path.value} already exists`,
        ),
      );
    }

    // キャッシュサイズの制限チェック
    if (this.props.resources.size >= this.props.cacheSettings.maxCachedResources) {
      // 最も古いアクセスのリソースを削除
      const oldestResource = this.findOldestAccessedResource();
      if (oldestResource) {
        this.props.resources.delete(oldestResource.id.value);
      }
    }

    this.props.resources.set(resource.id.value, resource);
    return Result.ok();
  }

  /**
   * リソースを削除
   */
  removeResource(resourceId: ResourceId): Result<void> {
    if (!this.props.resources.has(resourceId.value)) {
      return Result.fail(
        DomainError.notFound('RESOURCE_NOT_FOUND', `Resource ${resourceId.value} not found`),
      );
    }

    this.props.resources.delete(resourceId.value);
    return Result.ok();
  }

  /**
   * リソースを取得
   */
  getResource(resourceId: ResourceId): Result<OpenDataResource> {
    const resource = this.props.resources.get(resourceId.value);
    if (!resource) {
      return Result.fail(
        DomainError.notFound('RESOURCE_NOT_FOUND', `Resource ${resourceId.value} not found`),
      );
    }

    return Result.ok(resource);
  }

  /**
   * パスからリソースを検索
   */
  findResourceByPath(path: DataPath): Result<OpenDataResource> {
    const resource = Array.from(this.props.resources.values()).find(
      (r) => r.path.value === path.value,
    );

    if (!resource) {
      return Result.fail(
        DomainError.notFound('RESOURCE_NOT_FOUND', `Resource with path ${path.value} not found`),
      );
    }

    return Result.ok(resource);
  }

  /**
   * データアクセスを処理
   */
  async processDataAccess(
    userId: string,
    path: DataPath,
    userTier: string,
    requestTime: Date = new Date(),
  ): Promise<
    Result<{
      resource: OpenDataResource;
      cacheHit: boolean;
      cacheKey: string;
    }>
  > {
    // リソースを検索
    const resourceResult = this.findResourceByPath(path);
    if (resourceResult.isFailure) {
      // リソースが見つからないイベントを発行
      this.addDomainEvent(new DataResourceNotFound(this._id, 1, userId, path.value, requestTime));
      return Result.fail(resourceResult.getError());
    }

    const resource = resourceResult.getValue();

    // アクセス権限チェック
    if (!resource.canAccessByTier(userTier)) {
      this.addDomainEvent(
        new DataAccessDenied(
          this._id,
          1,
          userId,
          resource.id.value,
          path.value,
          userTier,
          'TIER_RESTRICTION',
          requestTime,
        ),
      );
      return Result.fail(
        DomainError.forbidden('ACCESS_DENIED', 'Your tier does not have access to this resource'),
      );
    }

    // アクセスを記録
    resource.recordAccess();

    // データアクセスイベントを発行
    this.addDomainEvent(
      new DataAccessRequested(
        this._id,
        1,
        userId,
        resource.id.value,
        path.value,
        resource.metadata.size,
        resource.metadata.contentType,
        requestTime,
      ),
    );

    // キャッシュ情報を返す
    const cacheHit = resource.isCacheValid(
      requestTime,
      this.props.cacheSettings.defaultCacheDurationSeconds,
    );

    return Result.ok({
      resource,
      cacheHit,
      cacheKey: resource.getCacheKey(),
    });
  }

  /**
   * リソースのメタデータを更新
   */
  updateResourceMetadata(resourceId: ResourceId, metadata: ResourceMetadata): Result<void> {
    const resourceResult = this.getResource(resourceId);
    if (resourceResult.isFailure) {
      return Result.fail(resourceResult.getError());
    }

    const resource = resourceResult.getValue();
    resource.updateMetadata(metadata);
    return Result.ok();
  }

  /**
   * 条件付きリクエストの処理
   */
  processConditionalRequest(
    path: DataPath,
    etag?: string,
    ifModifiedSince?: Date,
  ): Result<{
    shouldSendResource: boolean;
    resource?: OpenDataResource;
  }> {
    const resourceResult = this.findResourceByPath(path);
    if (resourceResult.isFailure) {
      return Result.fail(resourceResult.getError());
    }

    const resource = resourceResult.getValue();

    // ETagチェック
    if (etag && resource.matchesEtag(etag)) {
      return Result.ok({
        shouldSendResource: false,
        resource,
      });
    }

    // If-Modified-Sinceチェック
    if (ifModifiedSince && !resource.isModifiedSince(ifModifiedSince)) {
      return Result.ok({
        shouldSendResource: false,
        resource,
      });
    }

    return Result.ok({
      shouldSendResource: true,
      resource,
    });
  }

  /**
   * キャッシュのクリーンアップ
   */
  cleanupCache(retentionPeriodSeconds: number = 3600): Result<number> {
    const cutoffTime = new Date(Date.now() - retentionPeriodSeconds * 1000);
    let removedCount = 0;

    for (const [resourceId, resource] of this.props.resources.entries()) {
      if (resource.accessedAt < cutoffTime) {
        this.props.resources.delete(resourceId);
        removedCount++;
      }
    }

    return Result.ok(removedCount);
  }

  /**
   * リソース統計情報を取得
   */
  getResourceStatistics(): {
    totalResources: number;
    totalSize: number;
    averageSize: number;
    mimeTypeDistribution: Map<string, number>;
  } {
    let totalSize = 0;
    const mimeTypeCount = new Map<string, number>();

    for (const resource of this.props.resources.values()) {
      totalSize += resource.metadata.size;

      const contentType = resource.metadata.contentType;
      mimeTypeCount.set(contentType, (mimeTypeCount.get(contentType) || 0) + 1);
    }

    return {
      totalResources: this.props.resources.size,
      totalSize,
      averageSize: this.props.resources.size > 0 ? totalSize / this.props.resources.size : 0,
      mimeTypeDistribution: mimeTypeCount,
    };
  }

  /**
   * 最も古いアクセスのリソースを見つける
   */
  private findOldestAccessedResource(): OpenDataResource | undefined {
    let oldest: OpenDataResource | undefined;
    let oldestTime: Date | undefined;

    for (const resource of this.props.resources.values()) {
      if (!oldestTime || resource.accessedAt < oldestTime) {
        oldest = resource;
        oldestTime = resource.accessedAt;
      }
    }

    return oldest;
  }

  /**
   * ファクトリメソッド
   */
  static create(props?: Partial<DataAggregateProps>, id?: string): Result<DataAggregate> {
    const defaultProps: DataAggregateProps = {
      resources: new Map(),
      cacheSettings: {
        defaultCacheDurationSeconds: 3600, // 1時間
        maxCachedResources: 1000,
      },
    };

    const aggregateProps = {
      ...defaultProps,
      ...props,
    };

    return Result.ok(new DataAggregate(aggregateProps, id));
  }

  /**
   * 既存のデータから再構築
   */
  static reconstitute(props: DataAggregateProps, id: string): DataAggregate {
    return new DataAggregate(props, id);
  }
}
