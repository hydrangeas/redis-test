import { Result, DomainError } from '@/domain/errors';

/**
 * 認証プロバイダーを表すバリューオブジェクト
 */
export class Provider {
  private static readonly VALID_PROVIDERS = [
    'email',
    'google',
    'github',
    'microsoft',
    'apple',
    'jwt',
    'api_key',
    'anonymous',
  ];

  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  /**
   * プロバイダーの値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * プロバイダー名を取得（互換性のため）
   */
  get name(): string {
    return this._value;
  }

  /**
   * プロバイダーを作成
   */
  static create(value: string): Result<Provider> {
    if (!value || value.trim().length === 0) {
      return Result.fail<Provider>(
        DomainError.validation('EMPTY_PROVIDER_NAME', 'プロバイダー名は空にできません'),
      );
    }

    const normalized = value.trim().toLowerCase();

    if (!this.VALID_PROVIDERS.includes(normalized)) {
      return Result.fail<Provider>(
        DomainError.validation('UNKNOWN_PROVIDER', `Unknown provider: ${value}`),
      );
    }

    return Result.ok(new Provider(normalized));
  }

  /**
   * 事前定義されたプロバイダー
   */
  static email(): Provider {
    return new Provider('email');
  }

  static google(): Provider {
    return new Provider('google');
  }

  static github(): Provider {
    return new Provider('github');
  }

  static jwt(): Provider {
    return new Provider('jwt');
  }

  static anonymous(): Provider {
    return new Provider('anonymous');
  }

  /**
   * サポートされているプロバイダーかどうかを判定
   */
  isSupported(): boolean {
    return Provider.VALID_PROVIDERS.includes(this._value);
  }

  /**
   * ソーシャルプロバイダーかどうかを判定
   */
  isSocialProvider(): boolean {
    return ['google', 'github', 'microsoft', 'apple'].includes(this._value);
  }

  /**
   * 等価性の比較
   */
  equals(other: Provider): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  /**
   * 文字列表現を返す
   */
  toString(): string {
    return this._value;
  }

  /**
   * JSON表現を返す
   */
  toJSON(): string {
    return this._value;
  }
}
