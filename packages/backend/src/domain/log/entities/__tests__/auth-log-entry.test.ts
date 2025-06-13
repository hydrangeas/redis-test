import { describe, it, expect, beforeEach } from 'vitest';
import { AuthLogEntry, AuthResult } from '../auth-log-entry';
import { LogId } from '../../value-objects/log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { AuthEvent, EventType } from '../../value-objects/auth-event';
import { Provider } from '../../value-objects/provider';
import { IPAddress } from '../../value-objects/ip-address';
import { UserAgent } from '../../value-objects/user-agent';

describe('AuthLogEntry', () => {
  let validProps: any;

  beforeEach(() => {
    validProps = {
      userId: new UserId('123e4567-e89b-12d3-a456-426614174000'),
      event: AuthEvent.login().getValue(),
      provider: Provider.google(),
      ipAddress: IPAddress.create('192.168.1.1').getValue(),
      userAgent: UserAgent.create('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124').getValue(),
      timestamp: new Date(),
      result: AuthResult.SUCCESS,
    };
  });

  describe('create', () => {
    it('should create AuthLogEntry with valid properties', () => {
      const result = AuthLogEntry.create(validProps);

      expect(result.isSuccess).toBe(true);
      const entry = result.getValue();
      expect(entry.userId).toBe(validProps.userId);
      expect(entry.event).toBe(validProps.event);
      expect(entry.provider).toBe(validProps.provider);
      expect(entry.ipAddress).toBe(validProps.ipAddress);
      expect(entry.userAgent).toBe(validProps.userAgent);
      expect(entry.timestamp).toEqual(validProps.timestamp);
      expect(entry.result).toBe(AuthResult.SUCCESS);
    });

    it('should create AuthLogEntry with custom id', () => {
      const customId = LogId.generate();
      const result = AuthLogEntry.create(validProps, customId);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().id).toBe(customId);
    });

    it('should create AuthLogEntry without userId for failed attempts', () => {
      const props = {
        ...validProps,
        userId: undefined,
        result: AuthResult.FAILED,
        errorMessage: 'Invalid credentials',
      };

      const result = AuthLogEntry.create(props);
      expect(result.isSuccess).toBe(true);
    });

    it('should fail without required properties', () => {
      const requiredProps = ['event', 'provider', 'ipAddress', 'userAgent', 'timestamp', 'result'];

      requiredProps.forEach(prop => {
        const invalidProps = { ...validProps };
        delete invalidProps[prop];

        const result = AuthLogEntry.create(invalidProps);
        expect(result.isFailure).toBe(true);
      });
    });

    it('should fail with future timestamp', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const props = {
        ...validProps,
        timestamp: futureDate,
      };

      const result = AuthLogEntry.create(props);
      expect(result.isFailure).toBe(true);
      expect(result.error?.message).toBe('Timestamp cannot be in the future');
    });

    it('should fail without error message for failed authentication', () => {
      const props = {
        ...validProps,
        result: AuthResult.FAILED,
        errorMessage: undefined,
      };

      const result = AuthLogEntry.create(props);
      expect(result.isFailure).toBe(true);
      expect(result.error?.message).toBe('Error message is required for failed authentication');
    });

    it('should fail without userId for successful authentication', () => {
      const props = {
        ...validProps,
        userId: undefined,
        result: AuthResult.SUCCESS,
      };

      const result = AuthLogEntry.create(props);
      expect(result.isFailure).toBe(true);
      expect(result.error?.message).toBe('User ID is required for successful authentication');
    });
  });

  describe('isAnomalous', () => {
    it('should detect high failure count', () => {
      const props = {
        ...validProps,
        result: AuthResult.FAILED,
        errorMessage: 'Invalid credentials',
        metadata: { failureCount: 10 },
      };

      const entry = AuthLogEntry.create(props).getValue();
      expect(entry.isAnomalous()).toBe(true);
    });

    it('should detect bot user agent', () => {
      const props = {
        ...validProps,
        userAgent: UserAgent.create('bot/1.0').getValue(),
      };

      const entry = AuthLogEntry.create(props).getValue();
      expect(entry.isAnomalous()).toBe(true);
    });

    it('should detect crawler user agent', () => {
      const props = {
        ...validProps,
        userAgent: UserAgent.create('Googlebot/2.1').getValue(),
      };

      const entry = AuthLogEntry.create(props).getValue();
      expect(entry.isAnomalous()).toBe(true);
    });

    it('should return false for normal access', () => {
      const entry = AuthLogEntry.create(validProps).getValue();
      expect(entry.isAnomalous()).toBe(false);
    });
  });

  describe('requiresSecurityAlert', () => {
    it('should require alert for blocked result', () => {
      const props = {
        ...validProps,
        result: AuthResult.BLOCKED,
      };

      const entry = AuthLogEntry.create(props).getValue();
      expect(entry.requiresSecurityAlert()).toBe(true);
    });

    it('should require alert for anomalous activity', () => {
      const props = {
        ...validProps,
        result: AuthResult.FAILED,
        errorMessage: 'Invalid credentials',
        metadata: { failureCount: 10 },
      };

      const entry = AuthLogEntry.create(props).getValue();
      expect(entry.requiresSecurityAlert()).toBe(true);
    });

    it('should not require alert for normal access', () => {
      const entry = AuthLogEntry.create(validProps).getValue();
      expect(entry.requiresSecurityAlert()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const entry = AuthLogEntry.create(validProps).getValue();
      const json = entry.toJSON();

      expect(json).toMatchObject({
        id: expect.any(String),
        userId: validProps.userId.value,
        event: {
          type: EventType.LOGIN,
          description: 'User logged in',
        },
        provider: 'google',
        ipAddress: '192.168.1.1',
        userAgent: expect.any(String),
        timestamp: validProps.timestamp.toISOString(),
        result: AuthResult.SUCCESS,
        errorMessage: undefined,
        metadata: undefined,
      });
    });

    it('should include metadata and error message', () => {
      const props = {
        ...validProps,
        result: AuthResult.FAILED,
        errorMessage: 'Invalid credentials',
        metadata: { failureCount: 3 },
      };

      const entry = AuthLogEntry.create(props).getValue();
      const json = entry.toJSON();

      expect(json.errorMessage).toBe('Invalid credentials');
      expect(json.metadata).toEqual({ failureCount: 3 });
    });
  });

  describe('immutability', () => {
    it('should return new Date instance for timestamp', () => {
      const entry = AuthLogEntry.create(validProps).getValue();
      const timestamp1 = entry.timestamp;
      const timestamp2 = entry.timestamp;

      expect(timestamp1).not.toBe(timestamp2);
      expect(timestamp1).toEqual(timestamp2);
    });

    it('should return copy of metadata', () => {
      const metadata = { failureCount: 3 };
      const props = {
        ...validProps,
        metadata,
      };

      const entry = AuthLogEntry.create(props).getValue();
      const retrievedMetadata = entry.metadata;

      expect(retrievedMetadata).not.toBe(metadata);
      expect(retrievedMetadata).toEqual(metadata);
    });
  });
});