import { describe, it, expect } from 'vitest';
import { AuthEvent, EventType } from '../auth-event';

describe('AuthEvent', () => {
  describe('create', () => {
    it('should create AuthEvent with valid event type', () => {
      const result = AuthEvent.create(EventType.LOGIN);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().type).toBe(EventType.LOGIN);
      expect(result.getValue().description).toBeUndefined();
    });

    it('should create AuthEvent with description', () => {
      const result = AuthEvent.create(EventType.LOGIN_FAILED, 'Invalid credentials');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().type).toBe(EventType.LOGIN_FAILED);
      expect(result.getValue().description).toBe('Invalid credentials');
    });

    it('should fail with invalid event type', () => {
      const result = AuthEvent.create('INVALID' as EventType);

      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('無効な認証イベントタイプです');
    });
  });

  describe('pre-defined events', () => {
    it('should create login event', () => {
      const result = AuthEvent.login();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().type).toBe(EventType.LOGIN);
      expect(result.getValue().description).toBe('User logged in');
    });

    it('should create logout event', () => {
      const result = AuthEvent.logout();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().type).toBe(EventType.LOGOUT);
      expect(result.getValue().description).toBe('User logged out');
    });

    it('should create token refresh event', () => {
      const result = AuthEvent.tokenRefresh();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().type).toBe(EventType.TOKEN_REFRESH);
      expect(result.getValue().description).toBe('Token refreshed');
    });

    it('should create login failed event', () => {
      const reason = 'Invalid password';
      const result = AuthEvent.loginFailed(reason);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().type).toBe(EventType.LOGIN_FAILED);
      expect(result.getValue().description).toBe(reason);
    });

    it('should create token expired event', () => {
      const result = AuthEvent.tokenExpired();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().type).toBe(EventType.TOKEN_EXPIRED);
      expect(result.getValue().description).toBe('Token expired');
    });
  });

  describe('isSuccessful', () => {
    it('should return true for successful events', () => {
      expect(AuthEvent.login().getValue().isSuccessful()).toBe(true);
      expect(AuthEvent.logout().getValue().isSuccessful()).toBe(true);
      expect(AuthEvent.tokenRefresh().getValue().isSuccessful()).toBe(true);
    });

    it('should return false for failure events', () => {
      expect(AuthEvent.loginFailed('test').getValue().isSuccessful()).toBe(false);
      expect(AuthEvent.tokenExpired().getValue().isSuccessful()).toBe(false);
      expect(AuthEvent.create(EventType.ACCOUNT_LOCKED).getValue().isSuccessful()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same event type', () => {
      const event1 = AuthEvent.login().getValue();
      const event2 = AuthEvent.login().getValue();

      expect(event1.equals(event2)).toBe(true);
    });

    it('should return false for different event types', () => {
      const event1 = AuthEvent.login().getValue();
      const event2 = AuthEvent.logout().getValue();

      expect(event1.equals(event2)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      const event = AuthEvent.login().getValue();

      expect(event.equals(null as any)).toBe(false);
      expect(event.equals(undefined as any)).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const event = AuthEvent.loginFailed('Invalid password').getValue();
      const json = event.toJSON();

      expect(json).toEqual({
        type: EventType.LOGIN_FAILED,
        description: 'Invalid password',
      });
    });

    it('should include undefined description', () => {
      const event = AuthEvent.create(EventType.ACCOUNT_LOCKED).getValue();
      const json = event.toJSON();

      expect(json).toEqual({
        type: EventType.ACCOUNT_LOCKED,
        description: undefined,
      });
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const event = AuthEvent.login().getValue();

      expect(() => {
        (event as any).type = EventType.LOGOUT;
      }).toThrow();

      expect(() => {
        (event as any).description = 'new description';
      }).toThrow();
    });
  });
});