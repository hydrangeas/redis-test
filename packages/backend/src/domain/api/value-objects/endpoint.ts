import { HttpMethod, parseHttpMethod } from './http-method';
import { ApiPath } from './api-path';
import { ValidationError } from '../../errors/validation-error';

/**
 * APIエンドポイントを表すバリューオブジェクト
 * HTTPメソッドとパスの組み合わせ
 */
export class Endpoint {
  /**
   * @param method - HTTPメソッド
   * @param path - APIパス
   */
  constructor(
    public readonly method: HttpMethod,
    public readonly path: ApiPath,
  ) {
    if (!method) {
      throw new ValidationError('HTTP method is required');
    }
    if (!path) {
      throw new ValidationError('API path is required');
    }

    Object.freeze(this);
  }

  /**
   * 文字列からEndpointを作成
   * @param methodAndPath - "GET /api/users" 形式の文字列
   */
  static fromString(methodAndPath: string): Endpoint {
    if (!methodAndPath || methodAndPath.trim().length === 0) {
      throw new ValidationError('Method and path string cannot be empty');
    }

    const parts = methodAndPath.trim().split(/\s+/);
    if (parts.length !== 2) {
      throw new ValidationError('Invalid endpoint format. Expected: "METHOD /path"', {
        value: methodAndPath,
      });
    }

    const [methodStr, pathStr] = parts;
    const method = parseHttpMethod(methodStr);
    const path = new ApiPath(pathStr);

    return new Endpoint(method, path);
  }

  /**
   * 等価性の比較
   */
  equals(other: Endpoint): boolean {
    return this.method === other.method && this.path.equals(other.path);
  }

  /**
   * エンドポイントがパターンにマッチするかチェック
   * @param methodPattern - HTTPメソッドまたは "*" でワイルドカード
   * @param pathPattern - パスパターン（ワイルドカード可）
   */
  matches(methodPattern: string, pathPattern: string): boolean {
    const methodMatches = methodPattern === '*' || this.method === methodPattern.toUpperCase();
    const pathMatches = this.path.matches(pathPattern);
    return methodMatches && pathMatches;
  }

  /**
   * エンドポイントの識別子を生成
   * キャッシュキーなどに使用
   */
  toIdentifier(): string {
    return `${this.method}:${this.path.value}`;
  }

  /**
   * ハッシュコードの生成
   */
  hashCode(): number {
    const str = this.toIdentifier();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return `${this.method} ${this.path.value}`;
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): { method: HttpMethod; path: string } {
    return {
      method: this.method,
      path: this.path.toJSON(),
    };
  }

  /**
   * JSONからの復元
   */
  static fromJSON(json: { method: string; path: string }): Endpoint {
    const method = parseHttpMethod(json.method);
    const path = ApiPath.fromJSON(json.path);
    return new Endpoint(method, path);
  }

  /**
   * よく使用されるエンドポイントのファクトリメソッド
   */
  static healthCheck(): Endpoint {
    return new Endpoint(HttpMethod.GET, new ApiPath('/health'));
  }

  static apiDocs(): Endpoint {
    return new Endpoint(HttpMethod.GET, new ApiPath('/api-docs'));
  }
}
