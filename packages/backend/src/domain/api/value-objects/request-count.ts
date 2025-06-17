import { ValidationError } from '@/domain/errors/validation-error';
import { Result } from '@/domain/errors/result';
import { DomainError } from '@/domain/errors/domain-error';

export class RequestCount {
  private readonly _count: number;

  constructor(count: number) {
    if (count < 0) {
      throw new ValidationError('Request count cannot be negative');
    }

    if (!Number.isInteger(count)) {
      throw new ValidationError('Request count must be an integer');
    }

    this._count = count;
    Object.freeze(this);
  }

  get count(): number {
    return this._count;
  }

  get value(): number {
    return this._count;
  }

  public exceeds(limit: number): boolean {
    return this._count >= limit;
  }

  public add(count: number): RequestCount {
    return new RequestCount(this._count + count);
  }

  public equals(other: RequestCount): boolean {
    if (!other) return false;
    return this._count === other._count;
  }

  public toString(): string {
    return this._count.toString();
  }

  /**
   * ファクトリメソッド
   */
  static create(count: number): Result<RequestCount> {
    try {
      return Result.ok(new RequestCount(count));
    } catch (error) {
      return Result.fail(
        DomainError.validation(
          'INVALID_REQUEST_COUNT',
          error instanceof Error ? error.message : 'Invalid request count',
        ),
      );
    }
  }
}
