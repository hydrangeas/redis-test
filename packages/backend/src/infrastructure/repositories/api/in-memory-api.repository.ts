import { injectable } from 'tsyringe';
import { IAPIRepository } from '@/domain/api/interfaces/api-repository.interface';
import { APIAggregate } from '@/domain/api/aggregates/api.aggregate';
import { EndpointId } from '@/domain/api/value-objects/endpoint-id';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { EndpointPath } from '@/domain/api/value-objects/endpoint-path';
import { Result } from '@/domain/errors/result';
import { DomainError } from '@/domain/errors/domain-error';
import { APIEndpoint } from '@/domain/api/value-objects/api-endpoint';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { EndpointType } from '@/domain/api/value-objects/endpoint-type';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';

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
    const defaultRateLimits = new Map<string, RateLimit>();

    // Tier1: 1分間に60リクエスト
    const tier1Limit = RateLimit.create(60, 60);
    if (tier1Limit.isSuccess) {
      defaultRateLimits.set(TierLevel.TIER1, tier1Limit.getValue()!);
    }

    // Tier2: 1分間に120リクエスト
    const tier2Limit = RateLimit.create(120, 60);
    if (tier2Limit.isSuccess) {
      defaultRateLimits.set(TierLevel.TIER2, tier2Limit.getValue()!);
    }

    // Tier3: 1分間に600リクエスト
    const tier3Limit = RateLimit.create(600, 60);
    if (tier3Limit.isSuccess) {
      defaultRateLimits.set(TierLevel.TIER3, tier3Limit.getValue()!);
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
          path: dataPath.getValue()!,
          method: HttpMethod.GET,
          type: publicType.getValue()!,
          description: 'Access open data resources',
          isActive: true,
        });

        if (dataEndpoint.isSuccess && this.aggregate) {
          this.aggregate.addEndpoint(dataEndpoint.getValue()!);
        }
      }
    }

    // ヘルスチェックエンドポイント（認証不要）
    const healthPath = EndpointPath.create('/health');
    if (healthPath.isSuccess) {
      const internalType = EndpointType.create('internal');
      if (internalType.isSuccess) {
        const healthEndpoint = APIEndpoint.create({
          path: healthPath.getValue()!,
          method: HttpMethod.GET,
          type: internalType.getValue()!,
          description: 'Health check endpoint',
          isActive: true,
        });

        if (healthEndpoint.isSuccess && this.aggregate) {
          this.aggregate.addEndpoint(healthEndpoint.getValue()!);
        }
      }
    }
  }

  async save(aggregate: APIAggregate): Promise<Result<void, DomainError>> {
    try {
      this.aggregate = aggregate;
      return Result.ok();
    } catch (error) {
      return Result.fail(
        DomainError.unexpected(
          'SAVE_FAILED',
          'Failed to save API aggregate',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async getAggregate(): Promise<Result<APIAggregate, DomainError>> {
    if (!this.aggregate) {
      return Result.fail(DomainError.notFound('AGGREGATE_NOT_FOUND', 'API aggregate not found'));
    }

    return Result.ok(this.aggregate);
  }

  async findByEndpointId(
    endpointId: EndpointId,
  ): Promise<Result<APIAggregate | null, DomainError>> {
    // APIEndpointはvalue objectになりidを持たないため、この検索方法は使用できません
    // 常にnullを返します
    return Result.ok(null);
  }

  async findByPathAndMethod(
    path: EndpointPath,
    method: HttpMethod,
  ): Promise<Result<APIAggregate | null, DomainError>> {
    if (!this.aggregate) {
      return Result.ok(null);
    }

    const endpoint = this.aggregate.findMatchingEndpoint(path, method);
    if (endpoint.isFailure) {
      return Result.ok(null);
    }

    return Result.ok(this.aggregate);
  }

  async exists(): Promise<Result<boolean, DomainError>> {
    return Result.ok(this.aggregate !== null);
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
