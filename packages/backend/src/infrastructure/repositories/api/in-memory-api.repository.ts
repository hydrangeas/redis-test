import { injectable } from 'tsyringe';

import { APIAggregate } from '@/domain/api/aggregates/api.aggregate';
import { APIEndpoint } from '@/domain/api/entities/api-endpoint.entity';
import { IAPIRepository } from '@/domain/api/interfaces/api-repository.interface';
import { EndpointId } from '@/domain/api/value-objects/endpoint-id';
import { EndpointPath } from '@/domain/api/value-objects/endpoint-path';
import { EndpointType } from '@/domain/api/value-objects/endpoint-type';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { DomainError } from '@/domain/errors/domain-error';
import { Result } from '@/domain/errors/result';

/**
 * インメモリAPIリポジトリ実装
 * 開発・テスト用のインメモリ実装
 */
@injectable()
export class InMemoryAPIRepository implements IAPIRepository {
  private aggregate: APIAggregate | null = null;

  constructor() {
    // デフォルトのAPI集約を初期化
    this.initializeDefaultAggregate();
  }

  private initializeDefaultAggregate(): void {
    // デフォルトのレート制限設定
    const defaultRateLimits = new Map<TierLevel, RateLimit>();

    // Tier1: 1分間に60リクエスト
    const tier1Limit = RateLimit.create(60, 60);
    if (tier1Limit.isSuccess) {
      defaultRateLimits.set(TierLevel.TIER1, tier1Limit.getValue());
    }

    // Tier2: 1分間に120リクエスト
    const tier2Limit = RateLimit.create(120, 60);
    if (tier2Limit.isSuccess) {
      defaultRateLimits.set(TierLevel.TIER2, tier2Limit.getValue());
    }

    // Tier3: 1分間に600リクエスト
    const tier3Limit = RateLimit.create(600, 60);
    if (tier3Limit.isSuccess) {
      defaultRateLimits.set(TierLevel.TIER3, tier3Limit.getValue());
    }

    // API集約を作成
    const aggregateResult = APIAggregate.create({ defaultRateLimits });
    if (aggregateResult.isSuccess) {
      this.aggregate = aggregateResult.getValue()!;

      // デフォルトのエンドポイントを追加
      this.addDefaultEndpoints();
    }
  }

  private addDefaultEndpoints(): void {
    if (!this.aggregate) return;

    // データアクセスエンドポイント
    const dataPath = EndpointPath.create('/secure/:path(*)');
    if (dataPath.isSuccess) {
      const publicType = EndpointType.create('public');
      if (publicType.isSuccess) {
        const dataEndpoint = APIEndpoint.create({
          path: dataPath.getValue().toString(),
          method: HttpMethod.GET,
          type: publicType.getValue(),
          description: 'Access open data resources',
          isActive: true,
        });

        if (dataEndpoint.isSuccess && this.aggregate) {
          this.aggregate.addEndpoint(dataEndpoint.getValue());
        }
      }
    }

    // ヘルスチェックエンドポイント（認証不要）
    const healthPath = EndpointPath.create('/health');
    if (healthPath.isSuccess) {
      const internalType = EndpointType.create('internal');
      if (internalType.isSuccess) {
        const healthEndpoint = APIEndpoint.create({
          path: healthPath.getValue().toString(),
          method: HttpMethod.GET,
          type: internalType.getValue(),
          description: 'Health check endpoint',
          isActive: true,
        });

        if (healthEndpoint.isSuccess && this.aggregate) {
          this.aggregate.addEndpoint(healthEndpoint.getValue());
        }
      }
    }
  }

  async save(aggregate: APIAggregate): Promise<Result<void>> {
    try {
      this.aggregate = aggregate;
      return Promise.resolve(Result.ok(undefined));
    } catch (error) {
      return Promise.resolve(Result.fail(
        DomainError.internal(
          'SAVE_FAILED',
          'Failed to save API aggregate',
          error instanceof Error ? error : undefined,
        ),
      ));
    }
  }

  async getAggregate(): Promise<Result<APIAggregate>> {
    if (!this.aggregate) {
      return Promise.resolve(Result.fail(DomainError.notFound('AGGREGATE_NOT_FOUND', 'API aggregate not found')));
    }

    return Promise.resolve(Result.ok(this.aggregate));
  }

  async findByEndpointId(
    _endpointId: EndpointId,
  ): Promise<Result<APIAggregate | null>> {
    // APIEndpointはvalue objectになりidを持たないため、この検索方法は使用できません
    // 常にnullを返します
    return Promise.resolve(Result.ok(null));
  }

  async findByPathAndMethod(
    path: EndpointPath,
    method: HttpMethod,
  ): Promise<Result<APIAggregate | null>> {
    if (!this.aggregate) {
      return Promise.resolve(Result.ok(null));
    }

    const endpoint = this.aggregate.findEndpointByPathAndMethod(path, method);
    if (endpoint.isFailure) {
      return Promise.resolve(Result.ok(null));
    }

    return Promise.resolve(Result.ok(this.aggregate));
  }

  async exists(): Promise<Result<boolean>> {
    return Promise.resolve(Result.ok(this.aggregate !== null));
  }

  /**
   * テスト用：リポジトリをクリア
   */
  clear(): void {
    this.aggregate = null;
  }

  /**
   * テスト用：デフォルトに戻す
   */
  reset(): void {
    this.initializeDefaultAggregate();
  }
}
