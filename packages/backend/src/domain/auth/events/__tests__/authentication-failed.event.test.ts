import { AuthenticationFailed } from '../authentication-failed.event';

describe('AuthenticationFailed Event', () => {
  describe('constructor', () => {
    it('should create an AuthenticationFailed event with all properties', () => {
      const aggregateId = '550e8400-e29b-41d4-a716-446655440001';
      const eventVersion = 1;
      const provider = 'Google';
      const reason = 'Invalid credentials';
      const ipAddress = '192.168.1.100';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const attemptedUserId = 'user-123';

      const event = new AuthenticationFailed(
        aggregateId,
        eventVersion,
        provider,
        reason,
        ipAddress,
        userAgent,
        attemptedUserId,
      );

      expect(event.aggregateId).toBe(aggregateId);
      expect(event.eventVersion).toBe(eventVersion);
      expect(event.provider).toBe(provider);
      expect(event.reason).toBe(reason);
      expect(event.ipAddress).toBe(ipAddress);
      expect(event.userAgent).toBe(userAgent);
      expect(event.attemptedUserId).toBe(attemptedUserId);
      expect(event.eventId).toBeDefined();
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should create an AuthenticationFailed event with optional properties undefined', () => {
      const event = new AuthenticationFailed(
        'aggregate-id',
        1,
        'GitHub',
        'Account locked',
        '10.0.0.1',
      );

      expect(event.provider).toBe('GitHub');
      expect(event.reason).toBe('Account locked');
      expect(event.ipAddress).toBe('10.0.0.1');
      expect(event.userAgent).toBeUndefined();
      expect(event.attemptedUserId).toBeUndefined();
    });

    it('should be immutable', () => {
      const event = new AuthenticationFailed(
        'aggregate-id',
        1,
        'JWT',
        'Token expired',
        '127.0.0.1',
      );

      expect(() => {
        (event as any).provider = 'OAuth';
      }).toThrow();
    });
  });

  describe('getEventName', () => {
    it('should return the correct event name', () => {
      const event = new AuthenticationFailed(
        'aggregate-id',
        1,
        'SAML',
        'Invalid signature',
        '192.168.0.1',
      );

      expect(event.getEventName()).toBe('AuthenticationFailed');
    });
  });

  describe('getData', () => {
    it('should return all event data', () => {
      const event = new AuthenticationFailed(
        'aggregate-id',
        1,
        'OAuth2',
        'Invalid token',
        '172.16.0.1',
        'Chrome/96.0',
        'attempted-user-456',
      );

      const data = event.getData();

      expect(data).toEqual({
        provider: 'OAuth2',
        reason: 'Invalid token',
        ipAddress: '172.16.0.1',
        userAgent: 'Chrome/96.0',
        attemptedUserId: 'attempted-user-456',
      });
    });

    it('should return data with undefined optional fields', () => {
      const event = new AuthenticationFailed('aggregate-id', 1, 'Basic', 'Wrong password', '::1');

      const data = event.getData();

      expect(data).toEqual({
        provider: 'Basic',
        reason: 'Wrong password',
        ipAddress: '::1',
        userAgent: undefined,
        attemptedUserId: undefined,
      });
    });
  });

  describe('getMetadata', () => {
    it('should return event metadata', () => {
      const event = new AuthenticationFailed(
        'aggregate-id',
        5,
        'LDAP',
        'User not found',
        '10.10.10.10',
      );

      const metadata = event.getMetadata();

      expect(metadata).toMatchObject({
        eventName: 'AuthenticationFailed',
        aggregateId: 'aggregate-id',
        eventVersion: 5,
      });
      expect(metadata.eventId).toBeDefined();
      expect(metadata.occurredAt).toBeDefined();
    });
  });

  describe('use cases', () => {
    it('should handle invalid credentials', () => {
      const event = new AuthenticationFailed(
        'auth-aggregate',
        1,
        'Google',
        'Invalid credentials',
        '192.168.1.50',
        'Mozilla/5.0',
        'john.doe@example.com',
      );

      expect(event.reason).toBe('Invalid credentials');
      expect(event.attemptedUserId).toBe('john.doe@example.com');
    });

    it('should handle account lockout', () => {
      const event = new AuthenticationFailed(
        'auth-aggregate',
        1,
        'GitHub',
        'Account locked due to multiple failed attempts',
        '10.0.0.100',
        'Safari/15.0',
        'github-user-123',
      );

      expect(event.reason).toContain('Account locked');
      expect(event.provider).toBe('GitHub');
    });

    it('should handle token expiration', () => {
      const event = new AuthenticationFailed(
        'auth-aggregate',
        1,
        'JWT',
        'Token has expired',
        '172.16.0.50',
      );

      expect(event.reason).toBe('Token has expired');
      expect(event.provider).toBe('JWT');
      expect(event.attemptedUserId).toBeUndefined();
    });

    it('should handle suspicious activity', () => {
      const event = new AuthenticationFailed(
        'auth-aggregate',
        1,
        'OAuth2',
        'Suspicious activity detected',
        '203.0.113.0',
        'curl/7.68.0',
      );

      expect(event.reason).toBe('Suspicious activity detected');
      expect(event.userAgent).toContain('curl');
    });
  });
});
