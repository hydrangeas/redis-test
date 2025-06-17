import { ValueObject } from '@/domain/shared/value-object';
import { EndpointPath } from './endpoint-path';
import { HttpMethod } from './http-method';
import { EndpointType } from './endpoint-type';
import { Result } from '@/domain/errors/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

export interface APIEndpointProps {
  path: EndpointPath;
  method: HttpMethod;
  type: EndpointType;
  description?: string;
  isActive: boolean;
}

/**
 * APIエンドポイントを表現するバリューオブジェクト
 * イミュータブルで、エンドポイントの定義情報のみを保持
 */
export class APIEndpoint extends ValueObject<APIEndpointProps> {
  get path(): EndpointPath {
    return this.props.path;
  }

  get method(): HttpMethod {
    return this.props.method;
  }

  get type(): EndpointType {
    return this.props.type;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isPublic(): boolean {
    return this.props.type.isPublic();
  }

  get requiredTier() {
    return this.props.type.requiredTier;
  }

  /**
   * エンドポイントパスがこのエンドポイントにマッチするかチェック
   */
  matchesPath(path: EndpointPath): boolean {
    return this.props.path.matches(path.value);
  }

  /**
   * HTTPメソッドとパスの両方がマッチするかチェック
   */
  matches(method: HttpMethod, path: EndpointPath): boolean {
    return this.props.method === method && this.matchesPath(path);
  }

  /**
   * ファクトリメソッド
   */
  static create(props: APIEndpointProps): Result<APIEndpoint> {
    if (!props.path) {
      return Result.fail(new DomainError('INVALID_PATH', 'Path is required', ErrorType.VALIDATION));
    }

    if (!props.method) {
      return Result.fail(new DomainError('INVALID_METHOD', 'Method is required', ErrorType.VALIDATION));
    }

    if (!props.type) {
      return Result.fail(new DomainError('INVALID_TYPE', 'Type is required', ErrorType.VALIDATION));
    }

    return Result.ok(new APIEndpoint(props));
  }

  /**
   * アクティブなエンドポイントを作成
   */
  static createActive(
    path: EndpointPath,
    method: HttpMethod,
    type: EndpointType,
    description?: string,
  ): Result<APIEndpoint> {
    return APIEndpoint.create({
      path,
      method,
      type,
      description,
      isActive: true,
    });
  }

  /**
   * 非アクティブなエンドポイントを作成
   */
  static createInactive(
    path: EndpointPath,
    method: HttpMethod,
    type: EndpointType,
    description?: string,
  ): Result<APIEndpoint> {
    return APIEndpoint.create({
      path,
      method,
      type,
      description,
      isActive: false,
    });
  }

  /**
   * エンドポイントを有効化した新しいインスタンスを返す
   */
  activate(): APIEndpoint {
    if (this.props.isActive) {
      return this;
    }

    return new APIEndpoint({
      ...this.props,
      isActive: true,
    });
  }

  /**
   * エンドポイントを無効化した新しいインスタンスを返す
   */
  deactivate(): APIEndpoint {
    if (!this.props.isActive) {
      return this;
    }

    return new APIEndpoint({
      ...this.props,
      isActive: false,
    });
  }

  /**
   * 説明を更新した新しいインスタンスを返す
   */
  withDescription(description: string): APIEndpoint {
    return new APIEndpoint({
      ...this.props,
      description,
    });
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return `${this.props.method} ${this.props.path.value} (${this.props.type.value})`;
  }
}
