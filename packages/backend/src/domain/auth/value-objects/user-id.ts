import { DomainError } from '@/domain/errors/domain-error';
import { Guard } from '@/domain/shared/guard';
import { Result } from '@/domain/shared/result';
import { toBrand } from '@/domain/shared/types/brand';

import type { Brand} from '@/domain/shared/types/brand';

/**
 * ブランド型としてのUserId
 * string型と区別可能な専用の型
 */
export type UserIdValue = Brand<string, 'UserId'>;

/**
 * ユーザーIDを表すバリューオブジェクト
 * UUID形式のIDを保持し、型安全性を保証
 */
export class UserId {
  /**
   * UUID v4形式の検証用正規表現
   * 8-4-4-4-12の16進数文字列
   */
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private readonly _value: UserIdValue;

  private constructor(value: string) {
    this._value = toBrand<string, 'UserId'>(value);
    Object.freeze(this);
  }

  /**
   * UserIdを作成する（Resultパターン）
   * @param value - UUID形式の文字列
   * @returns 成功時はUserId、失敗時はDomainError
   */
  static create(value: string): Result<UserId> {
    const guardResult = Guard.againstNullOrUndefined(value, 'UserId');
    if (!guardResult.succeeded || value === null || value === undefined) {
      return Result.fail(
        DomainError.validation('INVALID_USER_ID', 'User ID cannot be null or undefined'),
      );
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return Result.fail(DomainError.validation('INVALID_USER_ID', 'User ID cannot be empty'));
    }

    if (!this.UUID_REGEX.test(trimmedValue)) {
      return Result.fail(
        DomainError.validation(
          'INVALID_USER_ID_FORMAT',
          `User ID must be a valid UUID v4 format. Received: ${value}`,
          { providedValue: value },
        ),
      );
    }

    return Result.ok(new UserId(trimmedValue.toLowerCase()));
  }

  /**
   * UserIdを作成する（例外パターン）
   * 既に検証済みの値に使用
   * @param value - 検証済みのUUID文字列
   * @returns UserId
   * @throws Error 無効な値の場合
   */
  static fromString(value: string): UserId {
    const result = this.create(value);
    if (result.isFailure) {
      throw new Error(result.getError().message);
    }
    return result.getValue();
  }

  /**
   * ランダムなUserIdを生成
   * @returns 新しいUserId
   */
  static generate(): UserId {
    let uuid: string;

    // ブラウザ環境
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      uuid = crypto.randomUUID();
    } else {
      // Node.js環境
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { randomUUID } = require('crypto') as { randomUUID: () => string };
      uuid = randomUUID();
    }

    // generateで作成されるUUIDは常に有効なので、fromStringを使用
    return UserId.fromString(uuid);
  }

  /**
   * 文字列がUserIdとして有効かチェック
   * @param value - チェックする文字列
   * @returns 有効な場合true
   */
  static isValid(value: string): boolean {
    return this.create(value).isSuccess;
  }

  /**
   * IDの値を取得（ブランド型を解除）
   */
  get value(): string {
    return this._value;
  }

  /**
   * 等価性の比較
   * @param other - 比較対象のUserId
   * @returns 等しい場合true
   */
  equals(other: UserId): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  /**
   * ハッシュコードの生成
   * JavaのString.hashCode()と同様のアルゴリズム
   * @returns ハッシュ値
   */
  hashCode(): number {
    let hash = 0;
    for (let i = 0; i < this._value.length; i++) {
      const char = this._value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * 文字列表現を返す
   */
  toString(): string {
    return this._value;
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): string {
    return this._value;
  }

  /**
   * JSONからの復元
   * @param value - JSON文字列
   * @returns 復元されたUserId
   */
  static fromJSON(value: string): UserId {
    return UserId.fromString(value);
  }
}
