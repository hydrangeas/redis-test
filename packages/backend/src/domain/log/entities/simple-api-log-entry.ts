import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { Entity } from '@/domain/shared/entity';
import { Result } from '@/domain/shared/result';



import type { HttpMethod } from '../value-objects/http-method';
import type { IPAddress } from '../value-objects/ip-address';
import type { LogId } from '../value-objects/log-id';
import type { StatusCode } from '../value-objects/status-code';
import type { UserAgent } from '../value-objects/user-agent';
import type { UserId } from '@/domain/auth/value-objects/user-id';

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
  metadata?: Record<string, unknown>;
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

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
  }

  private constructor(props: SimpleApiLogEntryProps, id?: LogId) {
    super(props, id);
  }

  public static create(
    id: LogId,
    props: SimpleApiLogEntryProps,
  ): Result<SimpleApiLogEntry> {
    // Validate response time
    if (props.responseTime < 0) {
      return Result.fail(
        new DomainError('INVALID_RESPONSE_TIME', 'Response time cannot be negative', ErrorType.VALIDATION),
      );
    }

    // Validate response size
    if (props.responseSize !== undefined && props.responseSize < 0) {
      return Result.fail(
        new DomainError('INVALID_RESPONSE_SIZE', 'Response size cannot be negative', ErrorType.VALIDATION),
      );
    }

    // Validate endpoint
    if (!props.endpoint || props.endpoint.trim().length === 0) {
      return Result.fail(
        new DomainError('INVALID_ENDPOINT', 'Endpoint cannot be empty', ErrorType.VALIDATION),
      );
    }

    // Validate error message length
    if (props.errorMessage && props.errorMessage.length > 1000) {
      return Result.fail(
        new DomainError(
          'ERROR_MESSAGE_TOO_LONG',
          'Error message exceeds maximum length',
          ErrorType.VALIDATION,
        ),
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
