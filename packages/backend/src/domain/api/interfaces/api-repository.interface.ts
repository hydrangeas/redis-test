import { APIAggregate } from '../aggregates/api.aggregate';
import { EndpointId } from '../value-objects/endpoint-id';
import { HttpMethod } from '../value-objects/http-method';
import { EndpointPath } from '../value-objects/endpoint-path';
import { Result } from '@/domain/errors/result';
import { DomainError } from '@/domain/errors/domain-error';

/**
 * APIリポジトリインターフェース
 * API集約の永続化を担当
 */
export interface IAPIRepository {
  /**
   * API集約を保存
   */
  save(aggregate: APIAggregate): Promise<Result<void, DomainError>>;

  /**
   * API集約を取得（単一のインスタンスのみ存在）
   */
  getAggregate(): Promise<Result<APIAggregate, DomainError>>;

  /**
   * エンドポイントIDで特定のエンドポイントを持つ集約を取得
   */
  findByEndpointId(endpointId: EndpointId): Promise<Result<APIAggregate | null, DomainError>>;

  /**
   * パスとメソッドでエンドポイントを検索
   */
  findByPathAndMethod(
    path: EndpointPath,
    method: HttpMethod
  ): Promise<Result<APIAggregate | null, DomainError>>;

  /**
   * API集約が存在するか確認
   */
  exists(): Promise<Result<boolean, DomainError>>;
}