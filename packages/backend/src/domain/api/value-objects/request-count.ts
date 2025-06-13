import { ValidationError } from '@/domain/errors/validation-error';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';

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
}