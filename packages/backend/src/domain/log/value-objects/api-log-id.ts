import { ValueObject } from '@/domain/shared/value-object';
import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { v4 as uuidv4 } from 'uuid';

export interface APILogIdProps {
  value: string;
}

export class APILogId extends ValueObject<APILogIdProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: APILogIdProps) {
    super(props);
  }

  public static create(id: string): Result<APILogId> {
    if (!id || id.trim().length === 0) {
      return Result.fail(
        new DomainError(
          'INVALID_API_LOG_ID',
          'API Log ID cannot be empty',
          ErrorType.VALIDATION
        )
      );
    }

    return Result.ok(new APILogId({ value: id.trim() }));
  }

  public static generate(): APILogId {
    return new APILogId({ value: uuidv4() });
  }

  toString(): string {
    return this.value;
  }
}