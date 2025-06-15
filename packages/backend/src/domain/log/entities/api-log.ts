import { Entity } from '@/domain/shared/entity';
import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { APIEndpoint } from '@/domain/api/value-objects/api-endpoint';
import { HTTPMethod } from '@/domain/api/value-objects/http-method';
import { StatusCode } from '@/domain/api/value-objects/status-code';
import { RequestDuration } from '@/domain/api/value-objects/request-duration';
import { RequestId } from '@/domain/api/value-objects/request-id';
import { APILogId } from '@/domain/log/value-objects/api-log-id';

export interface APILogProps {
  userId: UserId | null; // null for anonymous requests
  endpoint: APIEndpoint;
  method: HTTPMethod;
  statusCode: StatusCode;
  duration: RequestDuration;
  requestId: RequestId;
  timestamp: Date;
  metadata?: {
    correlationId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export class APILog extends Entity<APILogProps> {
  get userId(): UserId | null {
    return this.props.userId;
  }

  get endpoint(): APIEndpoint {
    return this.props.endpoint;
  }

  get method(): HTTPMethod {
    return this.props.method;
  }

  get statusCode(): StatusCode {
    return this.props.statusCode;
  }

  get duration(): RequestDuration {
    return this.props.duration;
  }

  get requestId(): RequestId {
    return this.props.requestId;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get metadata(): APILogProps['metadata'] {
    return this.props.metadata;
  }

  private constructor(props: APILogProps, id?: APILogId) {
    super(props, id);
  }

  public static create(
    props: APILogProps,
    id?: APILogId
  ): Result<APILog> {
    // Validate timestamp
    if (!props.timestamp || !(props.timestamp instanceof Date)) {
      return Result.fail(
        new DomainError(
          'INVALID_TIMESTAMP',
          'Timestamp must be a valid Date object',
          ErrorType.VALIDATION
        )
      );
    }

    // Ensure timestamp is not in the future
    if (props.timestamp.getTime() > Date.now()) {
      return Result.fail(
        new DomainError(
          'FUTURE_TIMESTAMP',
          'Timestamp cannot be in the future',
          ErrorType.VALIDATION
        )
      );
    }

    const apiLog = new APILog(
      {
        ...props,
        metadata: props.metadata || {},
      },
      id || APILogId.generate()
    );

    return Result.ok(apiLog);
  }

  /**
   * Check if this is an anonymous request
   */
  isAnonymous(): boolean {
    return this.userId === null;
  }

  /**
   * Check if the request was successful
   */
  isSuccessful(): boolean {
    return this.statusCode.isSuccess();
  }

  /**
   * Check if the request resulted in an error
   */
  isError(): boolean {
    return this.statusCode.isError();
  }

  /**
   * Get a summary of the log entry
   */
  getSummary(): string {
    const user = this.isAnonymous() ? 'anonymous' : this.userId!.value;
    return `${user} ${this.method.value} ${this.endpoint.value} ${this.statusCode.value} ${this.duration.value}ms`;
  }
}