import { UniqueEntityId } from '@/domain/shared/entity';
import { Result } from '@/domain/shared/result';

export class LogId extends UniqueEntityId {
  private constructor(id?: string) {
    super(id);
  }

  public static create(id?: string): Result<LogId> {
    try {
      return Result.ok(new LogId(id));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public static generate(): LogId {
    return new LogId();
  }
}