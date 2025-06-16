import { Entity } from '@/domain/shared/entity';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import { LogId } from '../value-objects/log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { HttpMethod } from '../value-objects/http-method';
import { StatusCode } from '../value-objects/status-code';
import { IPAddress } from '../value-objects/ip-address';
import { UserAgent } from '../value-objects/user-agent';

interface SimpleApiLogEntryProps {
  userId?: UserId;
  method: HttpMethod;
  endpoint: string;
  statusCode: StatusCode;
  responseTime: number;
  responseSize?: number;
  ipAddress: IPAddress;
  userAgent: UserAgent;
  timestamp: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class SimpleApiLogEntry extends Entity<SimpleApiLogEntryProps> {
  get userId(): UserId | undefined {
    return this.props.userId;
  }

  get method(): HttpMethod {
    return this.props.method;
  }

  get endpoint(): string {
    return this.props.endpoint;
  }

  get statusCode(): StatusCode {
    return this.props.statusCode;
  }

  get responseTime(): number {
    return this.props.responseTime;
  }

  get responseSize(): number | undefined {
    return this.props.responseSize;
  }

  get ipAddress(): IPAddress {
    return this.props.ipAddress;
  }

  get userAgent(): UserAgent {
    return this.props.userAgent;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  private constructor(props: SimpleApiLogEntryProps, id?: LogId) {
    super(props, id);
  }

  public static create(
    id: LogId,
    props: SimpleApiLogEntryProps
  ): Result<SimpleApiLogEntry, DomainError> {
    // Validate response time
    if (props.responseTime < 0) {
      return Result.fail(
        new DomainError(
          'INVALID_RESPONSE_TIME',
          'Response time cannot be negative',
          'VALIDATION'
        )
      );
    }

    // Validate response size
    if (props.responseSize !== undefined && props.responseSize < 0) {
      return Result.fail(
        new DomainError(
          'INVALID_RESPONSE_SIZE',
          'Response size cannot be negative',
          'VALIDATION'
        )
      );
    }

    // Validate endpoint
    if (!props.endpoint || props.endpoint.trim().length === 0) {
      return Result.fail(
        new DomainError(
          'INVALID_ENDPOINT',
          'Endpoint cannot be empty',
          'VALIDATION'
        )
      );
    }

    // Validate error message length
    if (props.errorMessage && props.errorMessage.length > 1000) {
      return Result.fail(
        new DomainError(
          'ERROR_MESSAGE_TOO_LONG',
          'Error message exceeds maximum length',
          'VALIDATION'
        )
      );
    }

    const apiLogEntry = new SimpleApiLogEntry(props, id);
    return Result.ok(apiLogEntry);
  }

  public isError(): boolean {
    return this.props.statusCode.value >= 400;
  }

  public isSlowRequest(thresholdMs: number): boolean {
    return this.props.responseTime > thresholdMs;
  }
}