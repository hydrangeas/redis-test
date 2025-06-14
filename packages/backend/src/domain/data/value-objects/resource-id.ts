import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import * as crypto from 'crypto';

/**
 * リソースID値オブジェクト
 * オープンデータリソースの一意識別子
 */
export class ResourceId {
  private static readonly ID_PREFIX = 'resource';
  private static readonly ID_FORMAT = /^resource_[a-f0-9]{32}$/;
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
    Object.freeze(this);
  }

  get value(): string {
    return this._value;
  }

  /**
   * 新しいリソースIDを生成
   */
  static generate(): ResourceId {
    const randomBytes = crypto.randomBytes(16);
    const hash = crypto.createHash('md5').update(randomBytes).digest('hex');
    return new ResourceId(`${this.ID_PREFIX}_${hash}`);
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
  static create(value?: string): Result<ResourceId> {
    if (!value || value === null || value === undefined) {
      return Result.fail(
        new DomainError(
          'INVALID_RESOURCE_ID',
          'Resource ID is required',
          'VALIDATION'
        )
      );
    }

    if (!this.ID_FORMAT.test(value)) {
      return Result.fail(
        new DomainError(
          'INVALID_RESOURCE_ID_FORMAT',
          `Resource ID must match format: ${this.ID_FORMAT}`,
          'VALIDATION'
        )
      );
    }

    return Result.ok(new ResourceId(value));
  }

  /**
   * 等価性の比較
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