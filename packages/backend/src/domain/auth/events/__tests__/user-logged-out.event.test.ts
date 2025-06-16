import { UserLoggedOut } from '../user-logged-out.event';

describe('UserLoggedOut Event', () => {
  describe('constructor', () => {
    it('should create a UserLoggedOut event with all properties', () => {
      const aggregateId = '550e8400-e29b-41d4-a716-446655440001';
      const eventVersion = 1;
      const userId = '550e8400-e29b-41d4-a716-446655440002';
      const reason = 'User initiated logout';
      const sessionId = 'session-123';
      const allSessions = true;

      const event = new UserLoggedOut(
        aggregateId,
        eventVersion,
        userId,
        reason,
        sessionId,
        allSessions,
      );

      expect(event.aggregateId).toBe(aggregateId);
      expect(event.eventVersion).toBe(eventVersion);
      expect(event.userId).toBe(userId);
      expect(event.reason).toBe(reason);
      expect(event.sessionId).toBe(sessionId);
      expect(event.allSessions).toBe(allSessions);
      expect(event.eventId).toBeDefined();
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should create a UserLoggedOut event with default allSessions value', () => {
      const event = new UserLoggedOut('aggregate-id', 1, 'user-id', 'Session expired');

      expect(event.userId).toBe('user-id');
      expect(event.reason).toBe('Session expired');
      expect(event.sessionId).toBeUndefined();
      expect(event.allSessions).toBe(false); // デフォルト値
    });

    it('should be immutable', () => {
      const event = new UserLoggedOut('aggregate-id', 1, 'user-id', 'reason');

      expect(() => {
        (event as any).userId = 'new-user-id';
      }).toThrow();
    });
  });

  describe('getEventName', () => {
    it('should return the correct event name', () => {
      const event = new UserLoggedOut('aggregate-id', 1, 'user-id', 'reason');

      expect(event.getEventName()).toBe('UserLoggedOut');
    });
  });

  describe('getData', () => {
    it('should return all event data', () => {
      const event = new UserLoggedOut(
        'aggregate-id',
        1,
        'user-id',
        'Manual logout',
        'session-456',
        true,
      );

      const data = event.getData();

      expect(data).toEqual({
        userId: 'user-id',
        reason: 'Manual logout',
        sessionId: 'session-456',
        allSessions: true,
      });
    });

    it('should return data with undefined optional fields', () => {
      const event = new UserLoggedOut('aggregate-id', 1, 'user-id', 'Token expired');

      const data = event.getData();

      expect(data).toEqual({
        userId: 'user-id',
        reason: 'Token expired',
        sessionId: undefined,
        allSessions: false,
      });
    });
  });

  describe('getMetadata', () => {
    it('should return event metadata', () => {
      const event = new UserLoggedOut('aggregate-id', 3, 'user-id', 'reason');

      const metadata = event.getMetadata();

      expect(metadata).toMatchObject({
        eventName: 'UserLoggedOut',
        aggregateId: 'aggregate-id',
        eventVersion: 3,
      });
      expect(metadata.eventId).toBeDefined();
      expect(metadata.occurredAt).toBeDefined();
    });
  });

  describe('use cases', () => {
    it('should handle single session logout', () => {
      const event = new UserLoggedOut(
        'user-aggregate-id',
        1,
        'user-123',
        'User clicked logout',
        'session-abc',
        false,
      );

      expect(event.sessionId).toBe('session-abc');
      expect(event.allSessions).toBe(false);
    });

    it('should handle all sessions logout', () => {
      const event = new UserLoggedOut(
        'user-aggregate-id',
        1,
        'user-123',
        'Security breach detected',
        undefined,
        true,
      );

      expect(event.sessionId).toBeUndefined();
      expect(event.allSessions).toBe(true);
      expect(event.reason).toBe('Security breach detected');
    });

    it('should handle session expiration', () => {
      const event = new UserLoggedOut(
        'user-aggregate-id',
        1,
        'user-123',
        'Session timeout',
        'session-xyz',
      );

      expect(event.reason).toBe('Session timeout');
      expect(event.allSessions).toBe(false);
    });
  });
});
