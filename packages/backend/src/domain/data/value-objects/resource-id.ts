import { UniqueEntityId } from '@/domain/shared/entity';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import * as crypto from 'crypto';

/**
 * リソースID値オブジェクト
 * オープンデータリソースの一意識別子
 */
export class ResourceId extends UniqueEntityId {
  private static readonly ID_PREFIX = 'resource';

  private constructor(id?: string) {
    super(id);
  }

  /**
   * 新しいリソースIDを生成
   */
  static generate(): ResourceId {
    return new ResourceId();
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
    try {
      return Result.ok(new ResourceId(value));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}