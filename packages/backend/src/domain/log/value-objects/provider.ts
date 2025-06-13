import { Result } from '@/domain/errors';

/**
 * 認証プロバイダーを表すバリューオブジェクト
 */
export class Provider {
  private static readonly SUPPORTED_PROVIDERS = new Set([
    'google',
    'github',
    'email',
    'anonymous',
  ]);

  private constructor(private readonly _name: string) {
    Object.freeze(this);
  }

  /**
   * プロバイダー名を取得
   */
  get name(): string {
    return this._name;
  }

  /**
   * プロバイダーを作成
   */
  static create(name: string): Result<Provider> {
    if (!name || name.trim().length === 0) {
      return Result.fail<Provider>('プロバイダー名は空にできません');
    }

    const normalizedName = name.trim().toLowerCase();
    
    if (normalizedName.length > 50) {
      return Result.fail<Provider>('プロバイダー名は50文字以内である必要があります');
    }

    return Result.ok(new Provider(normalizedName));
  }

  /**
   * サポートされているプロバイダーかどうかを判定
   */
  isSupported(): boolean {
    return Provider.SUPPORTED_PROVIDERS.has(this._name);
  }

  /**
   * 事前定義されたプロバイダー
   */
  static google(): Provider {
    return new Provider('google');
  }

  static github(): Provider {
    return new Provider('github');
  }

  static email(): Provider {
    return new Provider('email');
  }

  static anonymous(): Provider {
    return new Provider('anonymous');
  }

  /**
   * 等価性の比較
   */
  equals(other: Provider): boolean {
    if (!other) return false;
    return this._name === other._name;
  }

  /**
   * 文字列表現を返す
   */
  toString(): string {
    return this._name;
  }

  /**
   * JSON表現を返す
   */
  toJSON(): string {
    return this._name;
  }
}