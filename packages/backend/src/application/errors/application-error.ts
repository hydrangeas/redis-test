export type ApplicationErrorType =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT'
  | 'EXTERNAL_SERVICE'
  | 'INTERNAL';

export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly type: ApplicationErrorType,
    public readonly metadata?: Record<string, any>,
  ) {
    super(message);
    this.name = 'ApplicationError';
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      type: this.type,
      metadata: this.metadata,
    };
  }
}
