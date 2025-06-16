import { describe, it, expect } from 'vitest';
import { LogFactory } from '../log.factory';

describe('LogFactory', () => {
  describe('createAuthLog', () => {
    it('should create auth log with default values', () => {
      const log = LogFactory.createAuthLog();

      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('event');
      expect(log).toHaveProperty('provider');
      expect(log).toHaveProperty('ip_address');
      expect(log).toHaveProperty('user_agent');
      expect(['success', 'failed']).toContain(log.result);

      if (log.result === 'success') {
        expect(log.user_id).toBeTruthy();
        expect(log.error_message).toBeNull();
      } else {
        expect(log.user_id).toBeNull();
        expect(log.error_message).toBeTruthy();
      }
    });

    it('should override values when provided', () => {
      const log = LogFactory.createAuthLog({
        event: 'login_success',
        result: 'success',
        provider: 'google',
      });

      expect(log.event).toBe('login_success');
      expect(log.result).toBe('success');
      expect(log.provider).toBe('google');
    });
  });

  describe('createApiLog', () => {
    const userId = 'test-user-id';

    it('should create API log with user ID', () => {
      const log = LogFactory.createApiLog(userId);

      expect(log.user_id).toBe(userId);
      expect(log).toHaveProperty('method');
      expect(log).toHaveProperty('endpoint');
      expect(log).toHaveProperty('status_code');
      expect(log).toHaveProperty('response_time');
      expect(log).toHaveProperty('ip_address');
    });

    it('should set error message for non-200 status codes', () => {
      const log = LogFactory.createApiLog(userId, { status_code: 404 });

      expect(log.status_code).toBe(404);
      expect(log.error_message).toBe('Resource not found');
      expect(log.response_size).toBe(0);
    });

    it('should not set error message for 200 status', () => {
      const log = LogFactory.createApiLog(userId, { status_code: 200 });

      expect(log.status_code).toBe(200);
      expect(log.error_message).toBeNull();
      expect(log.response_size).toBeGreaterThan(0);
    });
  });

  describe('createRateLimitLog', () => {
    const userId = 'test-user-id';

    it('should create rate limit log', () => {
      const log = LogFactory.createRateLimitLog(userId);

      expect(log.user_id).toBe(userId);
      expect(log).toHaveProperty('endpoint');
      expect(log).toHaveProperty('window_start');
      expect(log).toHaveProperty('request_count');
      expect(log.request_count).toBeGreaterThanOrEqual(1);
      expect(log.request_count).toBeLessThanOrEqual(100);
    });

    it('should set window_start and created_at to same value', () => {
      const log = LogFactory.createRateLimitLog(userId);

      expect(log.window_start).toEqual(log.created_at);
    });
  });

  describe('createMany methods', () => {
    it('should create multiple auth logs', () => {
      const logs = LogFactory.createManyAuthLogs(5);

      expect(logs).toHaveLength(5);
      const ids = new Set(logs.map((l) => l.id));
      expect(ids.size).toBe(5);
    });

    it('should create multiple API logs', () => {
      const userId = 'test-user-id';
      const logs = LogFactory.createManyApiLogs(userId, 5);

      expect(logs).toHaveLength(5);
      logs.forEach((log) => {
        expect(log.user_id).toBe(userId);
      });
    });

    it('should create multiple rate limit logs', () => {
      const userId = 'test-user-id';
      const logs = LogFactory.createManyRateLimitLogs(userId, 5);

      expect(logs).toHaveLength(5);
      logs.forEach((log) => {
        expect(log.user_id).toBe(userId);
      });
    });
  });
});
