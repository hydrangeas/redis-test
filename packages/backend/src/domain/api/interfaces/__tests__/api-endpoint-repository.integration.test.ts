import { MockAPIEndpointRepository } from './api-endpoint-repository.mock';
import { APIEndpoint } from '../../value-objects/api-endpoint';
import { EndpointPath } from '../../value-objects/endpoint-path';
import { HttpMethod } from '../../value-objects/http-method';
import { EndpointType } from '../../value-objects/endpoint-type';
import { TierLevel } from '../../../auth/value-objects/tier-level';

describe('APIEndpointRepository Integration Tests', () => {
  let repository: MockAPIEndpointRepository;

  beforeEach(() => {
    repository = new MockAPIEndpointRepository();
  });

  afterEach(() => {
    repository.clear();
  });

  describe('save', () => {
    it('新しいエンドポイントを保存できる', async () => {
      const endpoint = createTestEndpoint('/api/data', 'GET');

      const result = await repository.save(endpoint);

      expect(result.isSuccess).toBe(true);
      expect(repository.saveSpy).toHaveBeenCalledWith(endpoint);
      expect(repository.count()).toBe(1);
    });

    it('同じパスとメソッドのエンドポイントを上書きできる', async () => {
      const endpoint1 = createTestEndpoint('/api/data', 'GET');
      const endpoint2 = createTestEndpoint('/api/data', 'GET', EndpointType.INTERNAL);

      await repository.save(endpoint1);
      await repository.save(endpoint2);

      expect(repository.count()).toBe(1);
      
      const found = await repository.findByPathAndMethod(
        endpoint1.path,
        endpoint1.method
      );
      expect(found.getValue()?.type.value).toBe('internal');
    });

    it('異なるメソッドの同じパスは別のエンドポイントとして保存される', async () => {
      const getEndpoint = createTestEndpoint('/api/data', 'GET');
      const postEndpoint = createTestEndpoint('/api/data', 'POST');

      await repository.save(getEndpoint);
      await repository.save(postEndpoint);

      expect(repository.count()).toBe(2);
      
      // Verify both endpoints exist
      const getResult = await repository.findByPathAndMethod(getEndpoint.path, HttpMethod.GET);
      const postResult = await repository.findByPathAndMethod(postEndpoint.path, HttpMethod.POST);
      
      expect(getResult.getValue()).toBeTruthy();
      expect(postResult.getValue()).toBeTruthy();
    });
  });

  describe('findByPathAndMethod', () => {
    it('保存されたエンドポイントを検索できる', async () => {
      const endpoint = createTestEndpoint('/api/users', 'GET');
      await repository.save(endpoint);

      const result = await repository.findByPathAndMethod(
        endpoint.path,
        endpoint.method
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeTruthy();
      expect(result.getValue()?.path.equals(endpoint.path)).toBe(true);
      expect(repository.findByPathAndMethodSpy).toHaveBeenCalled();
    });

    it('存在しないエンドポイントの場合nullを返す', async () => {
      const path = EndpointPath.create('/api/notfound').getValue();
      const method = HttpMethod.GET;

      const result = await repository.findByPathAndMethod(path, method);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });

    it('異なるメソッドでは見つからない', async () => {
      const endpoint = createTestEndpoint('/api/data', 'POST');
      await repository.save(endpoint);

      const result = await repository.findByPathAndMethod(
        endpoint.path,
        HttpMethod.GET
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });
  });

  describe('listAll', () => {
    it('すべてのエンドポイントを取得できる', async () => {
      const endpoints = [
        createTestEndpoint('/api/users', 'GET'),
        createTestEndpoint('/api/users', 'POST'),
        createTestEndpoint('/api/data', 'GET'),
      ];

      for (const endpoint of endpoints) {
        await repository.save(endpoint);
      }

      const result = await repository.listAll();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(3);
      expect(repository.listAllSpy).toHaveBeenCalled();
    });

    it('エンドポイントがない場合空配列を返す', async () => {
      const result = await repository.listAll();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual([]);
    });
  });

  describe('listActive', () => {
    it('アクティブなエンドポイントのみを取得できる', async () => {
      const activeEndpoint = createTestEndpoint('/api/active', 'GET');
      const inactiveEndpoint = createInactiveEndpoint('/api/inactive', 'GET');

      await repository.save(activeEndpoint);
      await repository.save(inactiveEndpoint);

      const result = await repository.listActive();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(1);
      expect(result.getValue()[0].path.value).toBe('/api/active');
      expect(repository.listActiveSpy).toHaveBeenCalled();
    });

    it('すべてアクティブな場合、全エンドポイントを返す', async () => {
      const endpoints = [
        createTestEndpoint('/api/users', 'GET'),
        createTestEndpoint('/api/data', 'GET'),
      ];

      for (const endpoint of endpoints) {
        await repository.save(endpoint);
      }

      const result = await repository.listActive();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('存在するエンドポイントを削除できる', async () => {
      const endpoint = createTestEndpoint('/api/users', 'DELETE');
      await repository.save(endpoint);

      const result = await repository.delete(endpoint.path, endpoint.method);

      expect(result.isSuccess).toBe(true);
      expect(repository.count()).toBe(0);
      expect(repository.deleteSpy).toHaveBeenCalledWith(
        endpoint.path,
        endpoint.method
      );
    });

    it('存在しないエンドポイントの削除はエラーを返す', async () => {
      const path = EndpointPath.create('/api/notfound').getValue();
      const method = HttpMethod.DELETE;

      const result = await repository.delete(path, method);

      expect(result.isFailure).toBe(true);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('特定のメソッドのエンドポイントのみ削除される', async () => {
      const getEndpoint = createTestEndpoint('/api/data', 'GET');
      const postEndpoint = createTestEndpoint('/api/data', 'POST');

      await repository.save(getEndpoint);
      await repository.save(postEndpoint);

      await repository.delete(getEndpoint.path, HttpMethod.GET);

      expect(repository.count()).toBe(1);
      expect(repository.has(postEndpoint.path, HttpMethod.POST)).toBe(true);
    });
  });

  describe('seed', () => {
    it('テストデータを事前に追加できる', async () => {
      const endpoints = [
        createTestEndpoint('/api/v1/users', 'GET'),
        createTestEndpoint('/api/v1/posts', 'GET'),
        createTestEndpoint('/api/v1/comments', 'GET'),
      ];

      repository.seed(endpoints);

      expect(repository.count()).toBe(3);
      
      const result = await repository.listAll();
      expect(result.getValue()).toHaveLength(3);
    });
  });
});

// Helper functions
function createTestEndpoint(
  path: string,
  method: string,
  endpointType: EndpointType = EndpointType.PROTECTED
): APIEndpoint {
  const pathResult = EndpointPath.create(path);
  if (pathResult.isFailure) {
    throw new Error(`Failed to create path: ${pathResult.error?.message}`);
  }
  
  const httpMethod = HttpMethod[method as keyof typeof HttpMethod];
  
  const result = APIEndpoint.create({
    path: pathResult.getValue(),
    method: httpMethod,
    type: endpointType,
    description: `Test endpoint for ${method} ${path}`,
    isActive: true,
  });
  
  if (result.isFailure) {
    throw new Error(`Failed to create endpoint: ${result.error?.message}`);
  }
  
  return result.getValue();
}

function createInactiveEndpoint(path: string, method: string): APIEndpoint {
  const pathResult = EndpointPath.create(path);
  if (pathResult.isFailure) {
    throw new Error(`Failed to create path: ${pathResult.error?.message}`);
  }
  
  const result = APIEndpoint.create({
    path: pathResult.getValue(),
    method: HttpMethod[method as keyof typeof HttpMethod],
    type: EndpointType.PROTECTED,
    description: `Inactive test endpoint`,
    isActive: false,
  });
  
  if (result.isFailure) {
    throw new Error(`Failed to create inactive endpoint: ${result.error?.message}`);
  }
  
  return result.getValue();
}