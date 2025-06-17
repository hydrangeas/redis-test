import { ValidationError } from '@/domain/errors/validation-error';
import { Result } from '@/domain/shared/result';

export class EndpointPath {
  private readonly _value: string;
  private readonly _pattern: RegExp;

  private constructor(value: string) {
    if (!value) {
      throw new ValidationError('Endpoint path is required');
    }

    if (!value.startsWith('/')) {
      throw new ValidationError('Endpoint path must start with /');
    }

    // パスの妥当性チェック
    if (!/^\/[a-zA-Z0-9\-_/*:.]+$/.test(value)) {
      throw new ValidationError('Invalid endpoint path format');
    }

    this._value = value;
    this._pattern = this.createPattern(value);
    Object.freeze(this);
  }

  get value(): string {
    return this._value;
  }

  get pattern(): RegExp {
    return this._pattern;
  }

  private createPattern(path: string): RegExp {
    // ワイルドカードをRegExpに変換
    const pattern = path
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // エスケープ
      .replace(/\*/g, '.*') // * を .* に変換
      .replace(/:(\w+)/g, '([^/]+)'); // :param を ([^/]+) に変換

    return new RegExp(`^${pattern}$`);
  }

  public matches(testPath: string): boolean {
    return this._pattern.test(testPath);
  }

  public equals(other: EndpointPath): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }

  public static create(value: string): Result<EndpointPath> {
    try {
      return Result.ok(new EndpointPath(value));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
