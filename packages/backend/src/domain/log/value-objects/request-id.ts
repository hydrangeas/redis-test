import { Result } from '@/domain/errors';
import { randomUUID } from 'crypto';

/**
 * リクエストIDを表すバリューオブジェクト
 * HTTPリクエストの追跡に使用される一意識別子
 */
export class RequestId {
  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  /**
   * リクエストIDの値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * 新しいリクエストIDを生成
   */
  static generate(): RequestId {
    return new RequestId(randomUUID());
  }

  /**
   * 既存の値からリクエストIDを作成
   */
  static create(value: string): Result<RequestId> {
    if (!value || value.trim().length === 0) {
      return Result.fail<RequestId>('リクエストIDは空にできません');
    }

    const trimmedValue = value.trim();

    // UUID形式またはカスタム形式（英数字とハイフン）を許可
    const validPattern = /^[a-zA-Z0-9-]+$/;
    if (!validPattern.test(trimmedValue)) {
      return Result.fail<RequestId>('リクエストIDは英数字とハイフンのみ使用できます');
    }

    if (trimmedValue.length > 128) {
      return Result.fail<RequestId>('リクエストIDは128文字以内である必要があります');
    }

    return Result.ok(new RequestId(trimmedValue));
  }

  /**
   * 等価性の比較
   */
  equals(other: RequestId): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  /**
   * ハッシュコードの生成
   */
  hashCode(): number {
    let hash = 0;
    for (let i = 0; i < this._value.length; i++) {
      const char = this._value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
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