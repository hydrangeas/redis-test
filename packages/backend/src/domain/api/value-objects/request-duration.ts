import { ValueObject } from '@/domain/shared/value-object';
import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

export interface RequestDurationProps {
  value: number;
}

export class RequestDuration extends ValueObject<RequestDurationProps> {
  get value(): number {
    return this.props.value;
  }

  private constructor(props: RequestDurationProps) {
    super(props);
  }

  public static create(milliseconds: number): Result<RequestDuration> {
    if (milliseconds < 0) {
      return Result.fail(
        new DomainError(
          'INVALID_REQUEST_DURATION',
          'Request duration cannot be negative',
          ErrorType.VALIDATION
        )
      );
    }

    if (milliseconds > 300000) { // 5 minutes max
      return Result.fail(
        new DomainError(
          'REQUEST_DURATION_TOO_LONG',
          'Request duration exceeds maximum allowed time',
          ErrorType.VALIDATION
        )
      );
    }

    return Result.ok(new RequestDuration({ value: milliseconds }));
  }

  toString(): string {
    return `${this.value}ms`;
  }
}