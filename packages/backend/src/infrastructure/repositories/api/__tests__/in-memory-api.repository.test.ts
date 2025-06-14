import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryAPIRepository } from '../in-memory-api.repository';
import { APIAggregate } from '@/domain/api/aggregates/api.aggregate';
import { APIEndpoint } from '@/domain/api/entities/api-endpoint.entity';
import { EndpointPath } from '@/domain/api/value-objects/endpoint-path';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { EndpointType } from '@/domain/api/value-objects/endpoint-type';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';

describe('InMemoryAPIRepository', () => {
  let repository: InMemoryAPIRepository;

  beforeEach(() => {
    repository = new InMemoryAPIRepository();
  });

  describe('getAggregate', () => {
    it('should return the default aggregate', async () => {
      const result = await repository.getAggregate();

      expect(result.isSuccess).toBe(true);
      const aggregate = result.getValue()!;
      
      // デフォルトのレート制限が設定されている
      expect(aggregate.defaultRateLimits.size).toBe(3);
      expect(aggregate.defaultRateLimits.has(TierLevel.TIER1)).toBe(true);
      expect(aggregate.defaultRateLimits.has(TierLevel.TIER2)).toBe(true);
      expect(aggregate.defaultRateLimits.has(TierLevel.TIER3)).toBe(true);

      // デフォルトのエンドポイントが存在する
      expect(aggregate.endpoints.size).toBeGreaterThan(0);
    });
  });

  describe('save', () => {
    it('should save and retrieve an aggregate', async () => {
      // カスタム集約を作成
      const customRateLimits = new Map<string, RateLimit>();
      const customLimit = RateLimit.create(100, 60);
      if (customLimit.isSuccess) {
        customRateLimits.set(TierLevel.TIER1, customLimit.getValue()!);
      }

      const aggregateResult = APIAggregate.create({ defaultRateLimits: customRateLimits });
      expect(aggregateResult.isSuccess).toBe(true);
      const aggregate = aggregateResult.getValue()!;

      // カスタムエンドポイントを追加
      const pathResult = EndpointPath.create('/test/endpoint');
      
      if (pathResult.isSuccess) {
        const endpointResult = APIEndpoint.create({
          path: pathResult.getValue()!,
          method: HttpMethod.POST,
          type: EndpointType.PUBLIC,
          description: 'Test endpoint',
          requiresAuth: true,
        });

        if (endpointResult.isSuccess) {
          aggregate.addEndpoint(endpointResult.getValue()!);
        }
      }

      // 保存
      const saveResult = await repository.save(aggregate);
      expect(saveResult.isSuccess).toBe(true);

      // 取得して確認
      const getResult = await repository.getAggregate();
      expect(getResult.isSuccess).toBe(true);
      
      const retrieved = getResult.getValue()!;
      expect(retrieved.endpoints.size).toBe(1);
      expect(retrieved.defaultRateLimits.get(TierLevel.TIER1)?.maxRequests).toBe(100);
    });
  });

  describe('findByPathAndMethod', () => {
    it('should find aggregate when endpoint exists', async () => {
      const aggregateResult = await repository.getAggregate();
      const aggregate = aggregateResult.getValue()!;

      // デフォルトのヘルスチェックエンドポイントを検索
      const pathResult = EndpointPath.create('/health');
      expect(pathResult.isSuccess).toBe(true);

      const findResult = await repository.findByPathAndMethod(
        pathResult.getValue()!,
        HttpMethod.GET
      );

      expect(findResult.isSuccess).toBe(true);
      expect(findResult.getValue()).toBeTruthy();
      expect(findResult.getValue()?.endpoints.size).toBeGreaterThan(0);
    });

    it('should return null when endpoint does not exist', async () => {
      const pathResult = EndpointPath.create('/non-existent');
      expect(pathResult.isSuccess).toBe(true);

      const findResult = await repository.findByPathAndMethod(
        pathResult.getValue()!,
        HttpMethod.DELETE
      );

      expect(findResult.isSuccess).toBe(true);
      expect(findResult.getValue()).toBeNull();
    });
  });

  describe('findByEndpointId', () => {
    it('should always return null as APIEndpoint is now a value object without id', async () => {
      // APIEndpointがvalue objectになりidを持たないため、このメソッドは常にnullを返します
      const dummyEndpointId = { value: 'dummy-id' } as any;
      const findResult = await repository.findByEndpointId(dummyEndpointId);

      expect(findResult.isSuccess).toBe(true);
      expect(findResult.getValue()).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true by default', async () => {
      const result = await repository.exists();
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(true);
    });

    it('should return false after clear', async () => {
      repository.clear();
      
      const result = await repository.exists();
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(false);
    });
  });

  describe('test helpers', () => {
    it('should clear repository', async () => {
      repository.clear();
      
      const result = await repository.getAggregate();
      expect(result.isFailure).toBe(true);
      expect(result.error?.code).toBe('AGGREGATE_NOT_FOUND');
    });

    it('should reset to defaults', async () => {
      repository.clear();
      
      const clearedResult = await repository.exists();
      expect(clearedResult.getValue()).toBe(false);
      
      repository.reset();
      
      const resetResult = await repository.exists();
      expect(resetResult.getValue()).toBe(true);
      
      const aggregateResult = await repository.getAggregate();
      expect(aggregateResult.isSuccess).toBe(true);
    });
  });
});