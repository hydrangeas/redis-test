import { ValueObject } from '@/domain/shared/value-object';
import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { v4 as uuidv4 } from 'uuid';

export interface RequestIdProps {
  value: string;
}

export class RequestId extends ValueObject<RequestIdProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: RequestIdProps) {
    super(props);
  }

  public static create(id: string): Result<RequestId> {
    if (!id || id.trim().length === 0) {
      return Result.fail(
        new DomainError(
          'INVALID_REQUEST_ID',
          'Request ID cannot be empty',
          ErrorType.VALIDATION
        )
      );
    }

    if (id.length > 255) {
      return Result.fail(
        new DomainError(
          'REQUEST_ID_TOO_LONG',
          'Request ID exceeds maximum length',
          ErrorType.VALIDATION
        )
      );
    }

    return Result.ok(new RequestId({ value: id.trim() }));
  }

  public static generate(): RequestId {
    return new RequestId({ value: uuidv4() });
  }

  toString(): string {
    return this.value;
  }
}