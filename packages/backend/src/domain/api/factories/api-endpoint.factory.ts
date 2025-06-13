import { APIEndpoint } from '../entities/api-endpoint.entity';
import { EndpointPath } from '../value-objects/endpoint-path';
import { HttpMethod } from '../value-objects/http-method';
import { EndpointType } from '../value-objects/endpoint-type';
import { Result } from '@/domain/shared/result';

export class APIEndpointFactory {
  /**
   * データAPIエンドポイントを作成
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
}