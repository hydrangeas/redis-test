import { Result } from '@/domain/errors/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { UniqueEntityId } from '@/domain/shared/entity';
import * as crypto from 'crypto';

/**
 * リソースID値オブジェクト
 * オープンデータリソースの一意識別子
 */
export class ResourceId extends UniqueEntityId {
  private static readonly ID_PREFIX = 'resource';
  private static readonly ID_FORMAT = /^resource_[a-f0-9]{32}$/;

  private constructor(value: string) {
    super(value);
    Object.freeze(this);
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
        new DomainError('INVALID_RESOURCE_ID', 'Resource ID is required', ErrorType.VALIDATION),
      );
    }

    if (!this.ID_FORMAT.test(value)) {
      return Result.fail(
        new DomainError(
          'INVALID_RESOURCE_ID_FORMAT',
          `Resource ID must match format: ${this.ID_FORMAT}`,
          ErrorType.VALIDATION,
        ),
      );
    }

    return Result.ok(new ResourceId(value));
  }

  /**
   * 等価性の比較
   */
  equals(other: ResourceId): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  /**
   * 文字列表現を返す
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
}
