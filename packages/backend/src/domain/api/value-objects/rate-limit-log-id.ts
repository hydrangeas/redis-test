import { UniqueEntityId } from '@/domain/shared/entity';
import { Result } from '@/domain/shared/result';

export class RateLimitLogId extends UniqueEntityId {
  private constructor(id?: string) {
    super(id);
  }

  public static create(id?: string): Result<RateLimitLogId> {
    try {
      return Result.ok(new RateLimitLogId(id));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public static generate(): RateLimitLogId {
    return new RateLimitLogId();
  }
}