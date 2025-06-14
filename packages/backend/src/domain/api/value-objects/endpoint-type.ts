import { ValidationError } from '@/domain/errors/validation-error';
import { Result } from '@/domain/shared/result';

type EndpointTypeValue = 'public' | 'protected' | 'internal';

export class EndpointType {
  private readonly _value: EndpointTypeValue;

  private constructor(value: EndpointTypeValue) {
    if (!value) {
      throw new ValidationError('Endpoint type is required');
    }

    const validTypes: EndpointTypeValue[] = ['public', 'protected', 'internal'];
    if (!validTypes.includes(value)) {
      throw new ValidationError(`Invalid endpoint type: ${value}`);
    }

    this._value = value;
    Object.freeze(this);
  }

  get value(): EndpointTypeValue {
    return this._value;
  }

  public isPublic(): boolean {
    return this._value === 'public';
  }

  public isProtected(): boolean {
    return this._value === 'protected';
  }

  public isInternal(): boolean {
    return this._value === 'internal';
  }

  public equals(other: EndpointType): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }

  public static create(value: EndpointTypeValue): Result<EndpointType> {
    try {
      return Result.ok(new EndpointType(value));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  /**
   * このエンドポイントタイプに必要な最小ティアレベルを取得
   */
  public get requiredTier(): string {
    switch (this._value) {
      case 'public':
        return 'tier0'; // Any tier can access
      case 'protected':
        return 'tier1'; // Tier1 and above
      case 'internal':
        return 'tier3'; // Tier3 only
      default:
        return 'tier1';
    }
  }

  /**
   * 指定されたティアがこのエンドポイントにアクセスできるかチェック
   */
  public canBeAccessedByTier(userTier: any): boolean {
    // For public endpoints, any tier can access
    if (this.isPublic()) {
      return true;
    }
    
    // For protected endpoints, any authenticated user can access
    if (this.isProtected()) {
      return true;
    }
    
    // For internal endpoints, only tier3 can access
    if (this.isInternal() && userTier.level === 'TIER3') {
      return true;
    }
    
    return false;
  }

  // Static instances for common types
  public static readonly PUBLIC = new EndpointType('public');
  public static readonly PROTECTED = new EndpointType('protected');
  public static readonly INTERNAL = new EndpointType('internal');
}