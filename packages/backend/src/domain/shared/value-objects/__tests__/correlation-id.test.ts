import { CorrelationId } from '../correlation-id';

describe('CorrelationId', () => {
  describe('constructor', () => {
    it('should create a valid CorrelationId', () => {
      const value = '550e8400-e29b-41d4-a716-446655440000';
      const correlationId = new CorrelationId(value);

      expect(correlationId.value).toBe(value);
    });

    it('should throw error for empty value', () => {
      expect(() => new CorrelationId('')).toThrow('Correlation ID cannot be empty');
    });

    it('should throw error for whitespace-only value', () => {
      expect(() => new CorrelationId('   ')).toThrow('Correlation ID cannot be empty');
    });

    it('should be immutable', () => {
      const correlationId = new CorrelationId('test-id');

      expect(() => {
        (correlationId as any).value = 'new-value';
      }).toThrow();
    });
  });

  describe('generate', () => {
    it('should generate a valid UUID v4', () => {
      const correlationId = CorrelationId.generate();

      expect(correlationId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique IDs', () => {
      const id1 = CorrelationId.generate();
      const id2 = CorrelationId.generate();

      expect(id1.value).not.toBe(id2.value);
    });
  });

  describe('equals', () => {
    it('should return true for equal values', () => {
      const value = 'same-correlation-id';
      const id1 = new CorrelationId(value);
      const id2 = new CorrelationId(value);

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different values', () => {
      const id1 = new CorrelationId('id-1');
      const id2 = new CorrelationId('id-2');

      expect(id1.equals(id2)).toBe(false);
    });

    it('should return false when comparing with null', () => {
      const id = new CorrelationId('test-id');

      expect(id.equals(null as any)).toBe(false);
    });

    it('should return false when comparing with undefined', () => {
      const id = new CorrelationId('test-id');

      expect(id.equals(undefined as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      const value = 'correlation-123';
      const correlationId = new CorrelationId(value);

      expect(correlationId.toString()).toBe(value);
    });
  });

  describe('use cases', () => {
    it('should handle request correlation', () => {
      // HTTPリクエストの相関ID
      const requestId = CorrelationId.generate();
      const apiCall1 = new CorrelationId(requestId.value);
      const apiCall2 = new CorrelationId(requestId.value);

      expect(apiCall1.equals(apiCall2)).toBe(true);
    });

    it('should handle event correlation', () => {
      // イベント駆動アーキテクチャでの相関
      const originalEvent = CorrelationId.generate();
      const causedEvent1 = new CorrelationId(originalEvent.value);
      const causedEvent2 = new CorrelationId(originalEvent.value);

      expect(causedEvent1.equals(originalEvent)).toBe(true);
      expect(causedEvent2.equals(originalEvent)).toBe(true);
    });

    it('should handle distributed tracing', () => {
      // 分散トレーシングでの使用
      const traceId = '550e8400-e29b-41d4-a716-446655440000';
      const service1 = new CorrelationId(traceId);
      const service2 = new CorrelationId(traceId);
      const service3 = new CorrelationId(traceId);

      expect(service1.equals(service2)).toBe(true);
      expect(service2.equals(service3)).toBe(true);
    });
  });
});
