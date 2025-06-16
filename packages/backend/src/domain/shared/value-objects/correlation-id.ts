import { v4 as uuidv4 } from 'uuid';

export class CorrelationId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Correlation ID cannot be empty');
    }
    Object.freeze(this);
  }

  static generate(): CorrelationId {
    return new CorrelationId(uuidv4());
  }

  equals(other: CorrelationId): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
