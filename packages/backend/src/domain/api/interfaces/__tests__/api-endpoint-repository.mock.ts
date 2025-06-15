import { IAPIEndpointRepository } from '../api-endpoint-repository.interface';
import { APIEndpoint } from '../../value-objects/api-endpoint';
import { EndpointPath } from '../../value-objects/endpoint-path';
import { HttpMethod } from '../../value-objects/http-method';
import { Result } from '@/domain/errors/result';
import { DomainError } from '@/domain/errors/domain-error';
import { vi } from 'vitest';

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
  async save(endpoint: APIEndpoint): Promise<Result<void>> {
    this.saveSpy(endpoint);
    
    try {
      const key = this.createKey(endpoint.path, endpoint.method);
      this.endpoints.set(key, endpoint);
      return Result.ok();
    } catch (error) {
      return Result.fail(
        new DomainError(
          'SAVE_FAILED',
          'Failed to save endpoint',
          'INTERNAL',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  /**
   * パスとメソッドでエンドポイントを検索
   */
  async findByPathAndMethod(
    path: EndpointPath,
    method: HttpMethod
  ): Promise<Result<APIEndpoint | null>> {
    this.findByPathAndMethodSpy(path, method);
    
    try {
      const key = this.createKey(path, method);
      const endpoint = this.endpoints.get(key) || null;
      return Result.ok(endpoint);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'FIND_FAILED',
          'Failed to find endpoint',
          'INTERNAL',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  /**
   * すべてのエンドポイントを取得
   */
  async listAll(): Promise<Result<APIEndpoint[]>> {
    this.listAllSpy();
    
    try {
      const allEndpoints = Array.from(this.endpoints.values());
      return Result.ok(allEndpoints);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'LIST_FAILED',
          'Failed to list endpoints',
          'INTERNAL',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  /**
   * アクティブなエンドポイントのみを取得
   */
  async listActive(): Promise<Result<APIEndpoint[]>> {
    this.listActiveSpy();
    
    try {
      const activeEndpoints = Array.from(this.endpoints.values())
        .filter(endpoint => endpoint.isActive);
      return Result.ok(activeEndpoints);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'LIST_FAILED',
          'Failed to list active endpoints',
          'INTERNAL',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  /**
   * エンドポイントを削除
   */
  async delete(path: EndpointPath, method: HttpMethod): Promise<Result<void>> {
    this.deleteSpy(path, method);
    
    try {
      const key = this.createKey(path, method);
      const existed = this.endpoints.has(key);
      
      if (!existed) {
        return Result.fail(
          new DomainError(
            'NOT_FOUND',
            'Endpoint not found',
            'NOT_FOUND',
            { path: path.value, method: method.value }
          )
        );
      }
      
      this.endpoints.delete(key);
      return Result.ok();
    } catch (error) {
      return Result.fail(
        new DomainError(
          'DELETE_FAILED',
          'Failed to delete endpoint',
          'INTERNAL',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
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
    endpoints.forEach(endpoint => {
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