import { TokenRefreshed } from '../token-refreshed.event';

describe('TokenRefreshed Event', () => {
  describe('constructor', () => {
    it('should create a TokenRefreshed event with all properties', () => {
      const aggregateId = '550e8400-e29b-41d4-a716-446655440001';
      const eventVersion = 1;
      const userId = '550e8400-e29b-41d4-a716-446655440002';
      const oldTokenId = 'old-token-123';
      const newTokenId = 'new-token-456';
      const refreshCount = 3;
      const sessionId = 'session-789';

      const event = new TokenRefreshed(
        aggregateId,
        eventVersion,
        userId,
        oldTokenId,
        newTokenId,
        refreshCount,
        sessionId
      );

      expect(event.aggregateId).toBe(aggregateId);
      expect(event.eventVersion).toBe(eventVersion);
      expect(event.userId).toBe(userId);
      expect(event.oldTokenId).toBe(oldTokenId);
      expect(event.newTokenId).toBe(newTokenId);
      expect(event.refreshCount).toBe(refreshCount);
      expect(event.sessionId).toBe(sessionId);
      expect(event.eventId).toBeDefined();
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should create a TokenRefreshed event with optional properties undefined', () => {
      const aggregateId = '550e8400-e29b-41d4-a716-446655440001';
      const eventVersion = 1;
      const userId = '550e8400-e29b-41d4-a716-446655440002';

      const event = new TokenRefreshed(
        aggregateId,
        eventVersion,
        userId
      );

      expect(event.userId).toBe(userId);
      expect(event.oldTokenId).toBeUndefined();
      expect(event.newTokenId).toBeUndefined();
      expect(event.refreshCount).toBe(1); // デフォルト値
      expect(event.sessionId).toBeUndefined();
    });

    it('should be immutable', () => {
      const event = new TokenRefreshed(
        'aggregate-id',
        1,
        'user-id'
      );

      expect(() => {
        (event as any).userId = 'new-user-id';
      }).toThrow();
    });
  });

  describe('getEventName', () => {
    it('should return the correct event name', () => {
      const event = new TokenRefreshed(
        'aggregate-id',
        1,
        'user-id'
      );

      expect(event.getEventName()).toBe('TokenRefreshed');
    });
  });

  describe('getData', () => {
    it('should return all event data', () => {
      const event = new TokenRefreshed(
        'aggregate-id',
        1,
        'user-id',
        'old-token',
        'new-token',
        5,
        'session-id'
      );

      const data = event.getData();

      expect(data).toEqual({
        userId: 'user-id',
        oldTokenId: 'old-token',
        newTokenId: 'new-token',
        refreshCount: 5,
        sessionId: 'session-id',
      });
    });

    it('should return data with undefined optional fields', () => {
      const event = new TokenRefreshed(
        'aggregate-id',
        1,
        'user-id'
      );

      const data = event.getData();

      expect(data).toEqual({
        userId: 'user-id',
        oldTokenId: undefined,
        newTokenId: undefined,
        refreshCount: 1,
        sessionId: undefined,
      });
    });
  });

  describe('getMetadata', () => {
    it('should return event metadata', () => {
      const event = new TokenRefreshed(
        'aggregate-id',
        2,
        'user-id'
      );

      const metadata = event.getMetadata();

      expect(metadata).toMatchObject({
        eventName: 'TokenRefreshed',
        aggregateId: 'aggregate-id',
        eventVersion: 2,
      });
      expect(metadata.eventId).toBeDefined();
      expect(metadata.occurredAt).toBeDefined();
    });
  });
});