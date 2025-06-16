import { APIEndpoint } from '../value-objects/api-endpoint';
import { EndpointPath } from '../value-objects/endpoint-path';
import { HttpMethod } from '../value-objects/http-method';
import { Result } from '@/domain/errors/result';

/**
 * APIエンドポイントリポジトリインターフェース
 * エンドポイント定義の永続化を担当
 */
export interface IAPIEndpointRepository {
  /**
   * エンドポイントを保存
   */
  save(endpoint: APIEndpoint): Promise<Result<void>>;

  /**
   * パスとメソッドでエンドポイントを検索
   */
  findByPathAndMethod(path: EndpointPath, method: HttpMethod): Promise<Result<APIEndpoint | null>>;

  /**
   * すべてのエンドポイントを取得
   */
  listAll(): Promise<Result<APIEndpoint[]>>;

  /**
   * アクティブなエンドポイントのみを取得
   */
  listActive(): Promise<Result<APIEndpoint[]>>;

  /**
   * エンドポイントを削除
   */
  delete(path: EndpointPath, method: HttpMethod): Promise<Result<void>>;
}
