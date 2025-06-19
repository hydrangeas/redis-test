import { vi } from 'vitest';

import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { Result } from '@/domain/errors/result';

import type { APIEndpoint } from '../../value-objects/api-endpoint';
import type { EndpointPath } from '../../value-objects/endpoint-path';
import type { HttpMethod } from '../../value-objects/http-method';
import type { IAPIEndpointRepository } from '../api-endpoint-repository.interface';



/**
 * APIエンドポイントリポジトリのモック実装
 * テスト用のインメモリ実装
 */
export class MockAPIEndpointRepository implements IAPIEndpointRepository {
  private endpoints: Map<string, APIEndpoint> = new Map();

  // Spy functions for testing
  public saveSpy = vi.fn();
  public findByPathAndMethodSpy = vi.fn();
  public listAllSpy = vi.fn();
  public listActiveSpy = vi.fn();
  public deleteSpy = vi.fn();

  constructor() {
    // Initialize with some default endpoints if needed
  }

  /**
   * エンドポイントを保存
   */
  save(endpoint: APIEndpoint): Promise<Result<void>> {
    this.saveSpy(endpoint);

    try {
      const key = this.createKey(endpoint.path, endpoint.method);
      this.endpoints.set(key, endpoint);
      return Promise.resolve(Result.ok(undefined));
    } catch (error) {
      return Promise.resolve(Result.fail(
        new DomainError('SAVE_FAILED', 'Failed to save endpoint', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      ));
    }
  }

  /**
   * パスとメソッドでエンドポイントを検索
   */
  findByPathAndMethod(
    path: EndpointPath,
    method: HttpMethod,
  ): Promise<Result<APIEndpoint | null>> {
    this.findByPathAndMethodSpy(path, method);

    try {
      const key = this.createKey(path, method);
      const endpoint = this.endpoints.get(key) || null;
      return Promise.resolve(Result.ok(endpoint));
    } catch (error) {
      return Promise.resolve(Result.fail(
        new DomainError('FIND_FAILED', 'Failed to find endpoint', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      ));
    }
  }

  /**
   * すべてのエンドポイントを取得
   */
  listAll(): Promise<Result<APIEndpoint[]>> {
    this.listAllSpy();

    try {
      const allEndpoints = Array.from(this.endpoints.values());
      return Promise.resolve(Result.ok(allEndpoints));
    } catch (error) {
      return Promise.resolve(Result.fail(
        new DomainError('LIST_FAILED', 'Failed to list endpoints', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      ));
    }
  }

  /**
   * アクティブなエンドポイントのみを取得
   */
  listActive(): Promise<Result<APIEndpoint[]>> {
    this.listActiveSpy();

    try {
      const activeEndpoints = Array.from(this.endpoints.values()).filter(
        (endpoint) => endpoint.isActive,
      );
      return Promise.resolve(Result.ok(activeEndpoints));
    } catch (error) {
      return Promise.resolve(Result.fail(
        new DomainError('LIST_FAILED', 'Failed to list active endpoints', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      ));
    }
  }

  /**
   * エンドポイントを削除
   */
  delete(path: EndpointPath, method: HttpMethod): Promise<Result<void>> {
    this.deleteSpy(path, method);

    try {
      const key = this.createKey(path, method);
      const existed = this.endpoints.has(key);

      if (!existed) {
        return Promise.resolve(Result.fail(
          new DomainError('NOT_FOUND', 'Endpoint not found', ErrorType.NOT_FOUND, {
            path: path.value,
            method: method,
          }),
        ));
      }

      this.endpoints.delete(key);
      return Promise.resolve(Result.ok(undefined));
    } catch (error) {
      return Promise.resolve(Result.fail(
        new DomainError('DELETE_FAILED', 'Failed to delete endpoint', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      ));
    }
  }

  /**
   * テスト用: エンドポイントをクリア
   */
  clear(): void {
    this.endpoints.clear();
  }

  /**
   * テスト用: エンドポイント数を取得
   */
  count(): number {
    return this.endpoints.size;
  }

  /**
   * テスト用: 特定のエンドポイントが存在するか確認
   */
  has(path: EndpointPath, method: HttpMethod): boolean {
    const key = this.createKey(path, method);
    return this.endpoints.has(key);
  }

  /**
   * テスト用: エンドポイントを事前に追加
   */
  seed(endpoints: APIEndpoint[]): void {
    endpoints.forEach((endpoint) => {
      const key = this.createKey(endpoint.path, endpoint.method);
      this.endpoints.set(key, endpoint);
    });
  }

  /**
   * エンドポイントのキーを作成
   */
  private createKey(path: EndpointPath, method: HttpMethod): string {
    const key = `${method}:${path.value}`;
    return key;
  }
}
