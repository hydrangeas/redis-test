import { ValidationError } from '@/domain/errors/validation-error';
import { UniqueEntityId } from '@/domain/shared/entity';
import { Result } from '@/domain/shared/result';

export class EndpointId extends UniqueEntityId {
  private constructor(id?: string) {
    super(id);
  }

  public static create(id?: string): Result<EndpointId> {
    try {
      return Result.ok(new EndpointId(id));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public static generate(): EndpointId {
    return new EndpointId();
  }
}
