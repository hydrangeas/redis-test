import { ValueObject } from '@/domain/shared/value-object';
import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { v4 as uuidv4 } from 'uuid';

export interface AuthLogIdProps {
  value: string;
}

export class AuthLogId extends ValueObject<AuthLogIdProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: AuthLogIdProps) {
    super(props);
  }

  public static create(id: string): Result<AuthLogId> {
    if (!id || id.trim().length === 0) {
      return Result.fail(
        new DomainError('INVALID_AUTH_LOG_ID', 'Auth Log ID cannot be empty', ErrorType.VALIDATION),
      );
    }

    return Result.ok(new AuthLogId({ value: id.trim() }));
  }

  public static generate(): AuthLogId {
    return new AuthLogId({ value: uuidv4() });
  }

  toString(): string {
    return this.value;
  }
}
