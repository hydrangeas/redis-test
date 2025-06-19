

import type { APIAggregate } from '../aggregates/api.aggregate';
import type { EndpointId } from '../value-objects/endpoint-id';
import type { EndpointPath } from '../value-objects/endpoint-path';
import type { HttpMethod } from '../value-objects/http-method';
import type { Result } from '@/domain/errors/result';

/**
 * APIリポジトリインターフェース
 * API集約の永続化を担当
 */
export interface IAPIRepository {
  /**
   * API集約を保存
   */
  save(aggregate: APIAggregate): Promise<Result<void>>;

  /**
   * API集約を取得（単一のインスタンスのみ存在）
   */
  getAggregate(): Promise<Result<APIAggregate>>;

  /**
   * エンドポイントIDで特定のエンドポイントを持つ集約を取得
   */
  findByEndpointId(endpointId: EndpointId): Promise<Result<APIAggregate | null>>;

  /**
   * パスとメソッドでエンドポイントを検索
   */
  findByPathAndMethod(
    path: EndpointPath,
    method: HttpMethod,
  ): Promise<Result<APIAggregate | null>>;

  /**
   * API集約が存在するか確認
   */
  exists(): Promise<Result<boolean>>;
}
