import { ValidationError } from '@/domain/errors/validation-error';
import { Result } from '@/domain/shared/result';

export enum HttpMethodType {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export class HttpMethod {
  private constructor(private readonly _value: HttpMethodType) {
    Object.freeze(this);
  }

  get value(): HttpMethodType {
    return this._value;
  }

  public static create(value: string): Result<HttpMethod> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new ValidationError('HTTP method cannot be empty', { value }));
    }

    const upperValue = value.toUpperCase();
    if (!Object.values(HttpMethodType).includes(upperValue as HttpMethodType)) {
      return Result.fail(new ValidationError(`Invalid HTTP method: ${value}`, { value }));
    }

    return Result.ok(new HttpMethod(upperValue as HttpMethodType));
  }

  /**
   * HTTPメソッドが安全かどうかを判定
   * 安全なメソッドは冪等で副作用がない
   */
  public isSafe(): boolean {
    return [HttpMethodType.GET, HttpMethodType.HEAD, HttpMethodType.OPTIONS].includes(this._value);
  }

  /**
   * HTTPメソッドが冪等かどうかを判定
   * 冪等なメソッドは何度実行しても同じ結果になる
   */
  public isIdempotent(): boolean {
    return this.isSafe() || [HttpMethodType.PUT, HttpMethodType.DELETE].includes(this._value);
  }

  public equals(other: HttpMethod): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
