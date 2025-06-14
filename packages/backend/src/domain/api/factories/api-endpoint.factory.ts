import { APIEndpoint } from '../entities/api-endpoint.entity';
import { EndpointPath } from '../value-objects/endpoint-path';
import { HttpMethod } from '../value-objects/http-method';
import { EndpointType } from '../value-objects/endpoint-type';
import { Result } from '@/domain/shared/result';

/**
 * APIエンドポイントのファクトリクラス
 * 特定用途のエンドポイントを簡単に作成するための静的メソッドを提供
 */
export class APIEndpointFactory {
  /**
   * データAPIエンドポイントを作成
   * @param path - エンドポイントのパス
   * @param method - HTTPメソッド（デフォルトはGET）
   * @returns 作成されたAPIエンドポイント
   * @throws エンドポイントの作成に失敗した場合
   */
  static createDataEndpoint(
    path: string,
    method: HttpMethod = HttpMethod.GET
  ): APIEndpoint {
    const pathResult = EndpointPath.create(path);
    const typeResult = EndpointType.create('protected');
    
    if (pathResult.isFailure || typeResult.isFailure) {
      throw new Error('Failed to create data endpoint');
    }
    
    const result = APIEndpoint.create({
      path: pathResult.getValue(),
      method,
      type: typeResult.getValue(),
      description: `Data endpoint: ${path}`,
      isActive: true,
    });
    
    if (result.isFailure) {
      throw new Error('Failed to create API endpoint');
    }
    
    return result.getValue();
  }

  /**
   * ヘルスチェックエンドポイントを作成
   * @returns 作成されたAPIエンドポイント
   * @throws エンドポイントの作成に失敗した場合
   */
  static createHealthCheckEndpoint(): APIEndpoint {
    const pathResult = EndpointPath.create('/health');
    const typeResult = EndpointType.create('public');
    
    if (pathResult.isFailure || typeResult.isFailure) {
      throw new Error('Failed to create health check endpoint');
    }
    
    const result = APIEndpoint.create({
      path: pathResult.getValue(),
      method: HttpMethod.GET,
      type: typeResult.getValue(),
      description: 'Health check endpoint',
      isActive: true,
    });
    
    if (result.isFailure) {
      throw new Error('Failed to create health check endpoint');
    }
    
    return result.getValue();
  }

  /**
   * APIドキュメントエンドポイントを作成
   * @returns 作成されたAPIエンドポイント
   * @throws エンドポイントの作成に失敗した場合
   */
  static createDocumentationEndpoint(): APIEndpoint {
    const pathResult = EndpointPath.create('/api-docs');
    const typeResult = EndpointType.create('public');
    
    if (pathResult.isFailure || typeResult.isFailure) {
      throw new Error('Failed to create documentation endpoint');
    }
    
    const result = APIEndpoint.create({
      path: pathResult.getValue(),
      method: HttpMethod.GET,
      type: typeResult.getValue(),
      description: 'API documentation endpoint',
      isActive: true,
    });
    
    if (result.isFailure) {
      throw new Error('Failed to create documentation endpoint');
    }
    
    return result.getValue();
  }

  /**
   * 認証エンドポイントを作成
   * @param subpath - /auth配下のサブパス
   * @param method - HTTPメソッド
   * @returns 作成されたAPIエンドポイント
   * @throws エンドポイントの作成に失敗した場合
   */
  static createAuthEndpoint(
    subpath: string,
    method: HttpMethod = HttpMethod.POST
  ): APIEndpoint {
    if (!subpath) {
      throw new Error('Failed to create auth endpoint');
    }
    const fullPath = `/auth${subpath.startsWith('/') ? subpath : '/' + subpath}`;
    const pathResult = EndpointPath.create(fullPath);
    const typeResult = EndpointType.create('public');
    
    if (pathResult.isFailure || typeResult.isFailure) {
      throw new Error('Failed to create auth endpoint');
    }
    
    const result = APIEndpoint.create({
      path: pathResult.getValue(),
      method,
      type: typeResult.getValue(),
      description: `Authentication endpoint: ${fullPath}`,
      isActive: true,
    });
    
    if (result.isFailure) {
      throw new Error('Failed to create auth endpoint');
    }
    
    return result.getValue();
  }

  /**
   * 管理者エンドポイントを作成
   * @param path - エンドポイントのパス
   * @param method - HTTPメソッド
   * @returns 作成されたAPIエンドポイント
   * @throws エンドポイントの作成に失敗した場合
   */
  static createAdminEndpoint(
    path: string,
    method: HttpMethod = HttpMethod.GET
  ): APIEndpoint {
    const pathResult = EndpointPath.create(path);
    const typeResult = EndpointType.create('admin');
    
    if (pathResult.isFailure || typeResult.isFailure) {
      throw new Error('Failed to create admin endpoint');
    }
    
    const result = APIEndpoint.create({
      path: pathResult.getValue(),
      method,
      type: typeResult.getValue(),
      description: `Admin endpoint: ${path}`,
      isActive: true,
    });
    
    if (result.isFailure) {
      throw new Error('Failed to create admin endpoint');
    }
    
    return result.getValue();
  }

  /**
   * バッチからパターンマッチングするエンドポイントを作成
   * @param pathPattern - パスパターン（ワイルドカード使用可）
   * @param method - HTTPメソッド
   * @param type - エンドポイントタイプ
   * @returns 作成されたAPIエンドポイント
   * @throws エンドポイントの作成に失敗した場合
   */
  static createPatternEndpoint(
    pathPattern: string,
    method: HttpMethod = HttpMethod.GET,
    type: 'public' | 'protected' | 'admin' = 'protected'
  ): APIEndpoint {
    const pathResult = EndpointPath.create(pathPattern);
    const typeResult = EndpointType.create(type);
    
    if (pathResult.isFailure || typeResult.isFailure) {
      throw new Error('Failed to create pattern endpoint');
    }
    
    const result = APIEndpoint.create({
      path: pathResult.getValue(),
      method,
      type: typeResult.getValue(),
      description: `Pattern endpoint: ${pathPattern}`,
      isActive: true,
    });
    
    if (result.isFailure) {
      throw new Error('Failed to create pattern endpoint');
    }
    
    return result.getValue();
  }
}