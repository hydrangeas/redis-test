import { ValidationError } from '../../errors/exceptions';

/**
 * ユーザーIDを表すバリューオブジェクト
 * UUID形式のIDを保持
 */
export class UserId {
  /**
   * UUID形式の検証用正規表現
   */
  private static readonly UUID_REGEX = 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /**
   * @param value - UUID形式のユーザーID
   */
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('User ID cannot be empty');
    }
    
    const trimmedValue = value.trim().toLowerCase();
    
    if (!UserId.UUID_REGEX.test(trimmedValue)) {
      throw new ValidationError('User ID must be a valid UUID', {
        value,
        pattern: 'UUID v4 format',
      });
    }
    
    // 正規化された値を保存
    this.value = trimmedValue;
    Object.freeze(this);
  }

  /**
   * 等価性の比較
   */
  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  /**
   * ハッシュコードの生成
   * JavaのString.hashCode()と同様のアルゴリズム
   */
  hashCode(): number {
    let hash = 0;
    for (let i = 0; i < this.value.length; i++) {
      const char = this.value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return this.value;
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): string {
    return this.value;
  }

  /**
   * JSONからの復元
   */
  static fromJSON(value: string): UserId {
    return new UserId(value);
  }

  /**
   * ランダムなUserIdを生成（テスト用）
   * crypto.randomUUID()を使用
   */
  static generate(): UserId {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return new UserId(crypto.randomUUID());
    }
    
    // Node.js環境用のフォールバック
    const { randomUUID } = require('crypto');
    return new UserId(randomUUID());
  }

  /**
   * 文字列がUserIdとして有効かチェック
   */
  static isValid(value: string): boolean {
    try {
      new UserId(value);
      return true;
    } catch {
      return false;
    }
  }
}