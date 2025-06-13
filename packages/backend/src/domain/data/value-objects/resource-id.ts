import { Guard } from '@/domain/shared/guard';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import * as crypto from 'crypto';

/**
 * リソースID値オブジェクト
 * オープンデータリソースの一意識別子
 */
export class ResourceId {
  private static readonly ID_PREFIX = 'resource';
  private static readonly ID_PATTERN = /^resource_[a-f0-9]{32}$/;

  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  /**
   * IDの値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * 新しいリソースIDを生成
   */
  static generate(): ResourceId {
    const uuid = crypto.randomBytes(16).toString('hex');
    return new ResourceId(`${this.ID_PREFIX}_${uuid}`);
  }

  /**
   * パスからリソースIDを生成（決定論的）
   * 同じパスからは常に同じIDが生成される
   * @param path リソースのパス
   */
  static fromPath(path: string): ResourceId {
    const hash = crypto.createHash('md5').update(path).digest('hex');
    return new ResourceId(`${this.ID_PREFIX}_${hash}`);
  }

  /**
   * 既存の値からリソースIDを作成
   * @param value ID文字列
   */
  static create(value: string): Result<ResourceId, DomainError> {
    const guardResult = Guard.againstNullOrUndefined(value, 'ResourceId');
    if (guardResult.isFailure) {
      return Result.fail(
        new DomainError(
          'INVALID_RESOURCE_ID',
          'Resource ID cannot be null or undefined',
          'VALIDATION'
        )
      );
    }

    if (!this.isValidFormat(value)) {
      return Result.fail(
        new DomainError(
          'INVALID_RESOURCE_ID_FORMAT',
          `Resource ID must match pattern: ${this.ID_PATTERN}`,
          'VALIDATION'
        )
      );
    }

    return Result.ok(new ResourceId(value));
  }

  /**
   * IDフォーマットの検証
   * @param value 検証する値
   */
  private static isValidFormat(value: string): boolean {
    return this.ID_PATTERN.test(value);
  }

  /**
   * 等価性の比較
   * @param other 比較対象
   */
  equals(other: ResourceId): boolean {
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
   * JSONシリアライズ用
   */
  toJSON(): string {
    return this._value;
  }
}