import { ValueObject } from '@/domain/shared/value-object';
import { Result } from '@/domain/errors';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

export interface StatusCodeProps {
  value: number;
}

export class StatusCode extends ValueObject<StatusCodeProps> {
  private static readonly VALID_STATUS_CODES = [
    // 2xx Success
    200, 201, 202, 204,
    // 3xx Redirection
    301, 302, 303, 304, 307, 308,
    // 4xx Client Error
    400, 401, 403, 404, 405, 406, 408, 409, 410, 415, 422, 429,
    // 5xx Server Error
    500, 501, 502, 503, 504,
  ];

  get value(): number {
    return this.props.value;
  }

  private constructor(props: StatusCodeProps) {
    super(props);
  }

  public static create(code: number): Result<StatusCode> {
    if (!Number.isInteger(code)) {
      return Result.fail(
        new DomainError(
          'INVALID_STATUS_CODE',
          'Status code must be an integer',
          ErrorType.VALIDATION
        )
      );
    }

    if (!this.VALID_STATUS_CODES.includes(code)) {
      return Result.fail(
        new DomainError(
          'UNSUPPORTED_STATUS_CODE',
          `Status code ${code} is not supported`,
          ErrorType.VALIDATION
        )
      );
    }

    return Result.ok(new StatusCode({ value: code }));
  }

  /**
   * Check if this is a success status code (2xx)
   */
  isSuccess(): boolean {
    return this.value >= 200 && this.value < 300;
  }

  /**
   * Check if this is a redirect status code (3xx)
   */
  isRedirect(): boolean {
    return this.value >= 300 && this.value < 400;
  }

  /**
   * Check if this is a client error status code (4xx)
   */
  isClientError(): boolean {
    return this.value >= 400 && this.value < 500;
  }

  /**
   * Check if this is a server error status code (5xx)
   */
  isServerError(): boolean {
    return this.value >= 500 && this.value < 600;
  }

  /**
   * Check if this is any error status code (4xx or 5xx)
   */
  isError(): boolean {
    return this.isClientError() || this.isServerError();
  }

  /**
   * Get a human-readable description of the status code
   */
  getDescription(): string {
    const descriptions: { [key: number]: string } = {
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found',
      303: 'See Other',
      304: 'Not Modified',
      307: 'Temporary Redirect',
      308: 'Permanent Redirect',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      406: 'Not Acceptable',
      408: 'Request Timeout',
      409: 'Conflict',
      410: 'Gone',
      415: 'Unsupported Media Type',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return descriptions[this.value] || 'Unknown Status Code';
  }

  toString(): string {
    return `${this.value} ${this.getDescription()}`;
  }
}