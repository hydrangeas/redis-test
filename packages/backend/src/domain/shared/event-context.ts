import type { CorrelationId } from './value-objects/correlation-id';

export class EventContext {
  constructor(
    public readonly correlationId: CorrelationId,
    public readonly causationId?: string,
    public readonly metadata: Record<string, any> = {},
  ) {}
}
