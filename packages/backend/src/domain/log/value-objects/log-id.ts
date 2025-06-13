import { Result } from '@/domain/errors';
import { randomUUID } from 'crypto';

/**
 * ログIDを表すバリューオブジェクト
 * ログエントリの一意識別子として使用される
 */
export class LogId {
  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  /**
   * ログIDの値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * 新しいログIDを生成
   */
  static generate(): LogId {
    return new LogId(randomUUID());
  }

  /**
   * 既存の値からログIDを作成
   */
  static create(value: string): Result<LogId> {
    if (!value || value.trim().length === 0) {
      return Result.fail<LogId>('ログIDは空にできません');
    }

    // UUID形式の検証
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return Result.fail<LogId>('ログIDは有効なUUID形式である必要があります');
    }

    return Result.ok(new LogId(value));
  }

  /**
   * 等価性の比較
   */
  equals(other: LogId): boolean {
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
}