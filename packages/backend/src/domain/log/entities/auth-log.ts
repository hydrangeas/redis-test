import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { AuthLogId } from '@/domain/log/value-objects/auth-log-id';
import { AuthResult } from '@/domain/log/value-objects/auth-result';
import { Entity, UniqueEntityId } from '@/domain/shared/entity';

import type { UserId } from '@/domain/auth/value-objects/user-id';
import type { AuthEvent } from '@/domain/log/value-objects/auth-event';

export interface AuthLogProps {
  userId: UserId;
  event: AuthEvent;
  result: AuthResult;
  timestamp: Date;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    [key: string]: unknown;
  };
}

export class AuthLog extends Entity<AuthLogProps> {
  get userId(): UserId {
    return this.props.userId;
  }

  get event(): AuthEvent {
    return this.props.event;
  }

  get result(): AuthResult {
    return this.props.result;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get metadata(): AuthLogProps['metadata'] {
    return this.props.metadata;
  }

  private constructor(props: AuthLogProps, id?: AuthLogId) {
    super(props, id ? new UniqueEntityId(id.value) : undefined);
  }

  public static create(props: AuthLogProps, id?: AuthLogId): Result<AuthLog> {
    // Validate timestamp
    if (!props.timestamp || !(props.timestamp instanceof Date)) {
      return Result.fail(
        new DomainError(
          'INVALID_TIMESTAMP',
          'Timestamp must be a valid Date object',
          ErrorType.VALIDATION,
        ),
      );
    }

    // Ensure timestamp is not in the future
    if (props.timestamp.getTime() > Date.now()) {
      return Result.fail(
        new DomainError(
          'FUTURE_TIMESTAMP',
          'Timestamp cannot be in the future',
          ErrorType.VALIDATION,
        ),
      );
    }

    const authLog = new AuthLog(
      {
        ...props,
        metadata: props.metadata || {},
      },
      id || AuthLogId.generate(),
    );

    return Result.ok(authLog);
  }

  /**
   * Check if this log represents a successful authentication
   */
  isSuccess(): boolean {
    return this.result === AuthResult.SUCCESS;
  }

  /**
   * Check if this log represents a failed authentication
   */
  isFailure(): boolean {
    return this.result === AuthResult.FAILED;
  }

  /**
   * Check if this log represents an expired token
   */
  isExpired(): boolean {
    return this.result === AuthResult.EXPIRED;
  }

  /**
   * Get a summary of the log entry
   */
  getSummary(): string {
    return `${this.userId.value} ${this.event} ${this.result} at ${this.timestamp.toISOString()}`;
  }
}
