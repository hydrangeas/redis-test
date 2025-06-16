import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SupabaseAuthLogRepository } from '../supabase-auth-log.repository';
import { AuthLogEntry } from '@/domain/log/entities/auth-log-entry';
import { LogId } from '@/domain/log/value-objects/log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { AuthEvent, EventType } from '@/domain/log/value-objects/auth-event';
import { Provider } from '@/domain/log/value-objects/provider';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import { TimeRange } from '@/domain/log/value-objects/time-range';
import { AuthResult } from '@/domain/log/value-objects';
import { Logger } from 'pino';
import { createSupabaseMock } from './mock-setup-helper';

describe('SupabaseAuthLogRepository', () => {
  let repository: SupabaseAuthLogRepository;
  let mockSupabaseClient: any;
  let mockChain: any;
  let mockLogger: Logger;

  beforeEach(() => {
    const { mockClient, methods } = createSupabaseMock();
    mockSupabaseClient = mockClient;
    mockChain = methods;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as any;

    repository = new SupabaseAuthLogRepository(mockSupabaseClient, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('should save auth log entry successfully', async () => {
      const logEntryResult = AuthLogEntry.create(
        {
          userId: UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue(),
          event: new AuthEvent(EventType.LOGIN, 'User logged in'),
          provider: Provider.google(),
          ipAddress: IPAddress.create('192.168.1.1').getValue(),
          userAgent: UserAgent.create('Mozilla/5.0').getValue(),
          timestamp: new Date(),
          result: AuthResult.SUCCESS,
        },
        LogId.generate(),
      );

      if (logEntryResult.isFailure) {
        throw new Error(`Failed to create log entry: ${logEntryResult.error.message}`);
      }
      const logEntry = logEntryResult.getValue();

      mockChain.insert.mockResolvedValue({ error: null });

      const result = await repository.save(logEntry);

      expect(result.isSuccess).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('auth_logs');
      expect(mockChain.insert).toHaveBeenCalledWith({
        id: logEntry.id.value,
        user_id: logEntry.userId?.value,
        event_type: EventType.LOGIN,
        provider: 'google',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        result: AuthResult.SUCCESS,
        error_message: null,
        metadata: {},
        session_id: null,
        created_at: logEntry.timestamp.toISOString(),
      });
    });

    it('should save auth log with error message for failed authentication', async () => {
      const logEntryResult = AuthLogEntry.create(
        {
          userId: undefined,
          event: new AuthEvent(EventType.LOGIN_FAILED, 'Invalid credentials'),
          provider: Provider.email(),
          ipAddress: IPAddress.create('192.168.1.1').getValue(),
          userAgent: UserAgent.create('Mozilla/5.0').getValue(),
          timestamp: new Date(),
          result: AuthResult.FAILED,
          errorMessage: 'Invalid credentials',
        },
        LogId.generate(),
      );

      if (logEntryResult.isFailure) {
        throw new Error(`Failed to create log entry: ${logEntryResult.error.message}`);
      }
      const logEntry = logEntryResult.getValue();

      mockChain.insert.mockResolvedValue({ error: null });

      const result = await repository.save(logEntry);

      expect(result.isSuccess).toBe(true);
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          event_type: EventType.LOGIN_FAILED,
          result: AuthResult.FAILED,
          error_message: 'Invalid credentials',
        }),
      );
    });

    it('should handle save error', async () => {
      const logEntryResult = AuthLogEntry.create(
        {
          userId: UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue(),
          event: new AuthEvent(EventType.LOGIN, 'User logged in'),
          provider: Provider.google(),
          ipAddress: IPAddress.create('192.168.1.1').getValue(),
          userAgent: UserAgent.create('Mozilla/5.0').getValue(),
          timestamp: new Date(),
          result: AuthResult.SUCCESS,
        },
        LogId.generate(),
      );

      if (logEntryResult.isFailure) {
        throw new Error(`Failed to create log entry: ${logEntryResult.error.message}`);
      }
      const logEntry = logEntryResult.getValue();

      mockChain.insert.mockResolvedValue({ error: { message: 'Database error' } });

      const result = await repository.save(logEntry);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('AUTH_LOG_SAVE_FAILED');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find auth log by ID', async () => {
      const logId = LogId.generate();
      const mockRecord = {
        id: logId.value,
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        event_type: EventType.LOGIN,
        provider: 'google',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        result: AuthResult.SUCCESS,
        error_message: null,
        metadata: {},
        created_at: new Date().toISOString(),
      };

      mockChain.single.mockResolvedValue({ data: mockRecord, error: null });

      const result = await repository.findById(logId);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).not.toBeNull();
      const foundLog = result.getValue();
      expect(foundLog).not.toBeNull();
      expect(foundLog!.id.value).toBe(logId.value);
      expect(mockChain.eq).toHaveBeenCalledWith('id', logId.value);
    });

    it('should return null when log not found', async () => {
      const logId = LogId.generate();
      mockChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const result = await repository.findById(logId);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find logs by user ID', async () => {
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue();
      const mockRecords = [
        {
          id: LogId.generate().value,
          user_id: userId.value,
          event_type: EventType.LOGIN,
          provider: 'google',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          result: AuthResult.SUCCESS,
          error_message: null,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockChain.limit.mockResolvedValue({ data: mockRecords, error: null });

      const result = await repository.findByUserId(userId);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(1);
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', userId.value);
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should filter by time range when provided', async () => {
      const userId = UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue();
      const timeRangeResult = TimeRange.create(new Date('2025-01-01'), new Date('2025-01-31'));
      if (timeRangeResult.isFailure) {
        throw new Error(`Failed to create TimeRange: ${timeRangeResult.error}`);
      }
      const timeRange = timeRangeResult.value;

      // Since we have a timeRange, the final method in the chain is lte()
      mockChain.lte.mockResolvedValue({ data: [], error: null });

      const result = await repository.findByUserId(userId, timeRange);

      expect(result.isSuccess).toBe(true);
      expect(mockChain.gte).toHaveBeenCalledWith('created_at', timeRange.start.toISOString());
      expect(mockChain.lte).toHaveBeenCalledWith('created_at', timeRange.end.toISOString());
    });
  });

  describe('findFailures', () => {
    it('should find failed authentication logs', async () => {
      const mockRecords = [
        {
          id: LogId.generate().value,
          user_id: null,
          event_type: EventType.LOGIN_FAILED,
          provider: 'email',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          result: AuthResult.FAILED,
          error_message: 'Invalid credentials',
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockChain.limit.mockResolvedValue({ data: mockRecords, error: null });

      const result = await repository.findFailures();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(1);
      expect(mockChain.eq).toHaveBeenCalledWith('result', AuthResult.FAILED);
    });
  });

  describe('findSuspiciousActivities', () => {
    it('should find suspicious activity logs', async () => {
      const mockRecords = [
        {
          id: LogId.generate().value,
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          event_type: EventType.SUSPICIOUS_ACTIVITY,
          provider: 'anonymous',
          ip_address: '192.168.1.1',
          user_agent: 'SuspiciousBot/1.0',
          result: AuthResult.BLOCKED,
          error_message: 'Suspicious activity detected',
          metadata: { suspicious: true },
          created_at: new Date().toISOString(),
        },
      ];

      mockChain.limit.mockResolvedValue({ data: mockRecords, error: null });

      const result = await repository.findSuspiciousActivities();

      expect(result.isSuccess).toBe(true);
      if (!result.isSuccess) {
        console.error('Failed to find suspicious activities:', result.getError());
      }
      const activities = result.getValue();
      if (activities.length === 0) {
        console.log('No activities returned. Check if recordToLogEntry is working correctly.');
      }
      expect(activities).toHaveLength(1);
      expect(mockChain.eq).toHaveBeenCalledWith('metadata->>suspicious', 'true');
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics correctly', async () => {
      const timeRangeResult = TimeRange.create(new Date('2025-01-01'), new Date('2025-01-31'));
      if (timeRangeResult.isFailure) {
        throw new Error(`Failed to create TimeRange: ${timeRangeResult.error}`);
      }
      const timeRange = timeRangeResult.value;

      const mockRecords = [
        {
          id: LogId.generate().value,
          user_id: 'user1',
          event_type: EventType.LOGIN,
          provider: 'google',
          result: AuthResult.SUCCESS,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: LogId.generate().value,
          user_id: 'user2',
          event_type: EventType.LOGIN,
          provider: 'github',
          result: AuthResult.SUCCESS,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: LogId.generate().value,
          user_id: 'user1',
          event_type: EventType.LOGIN_FAILED,
          provider: 'email',
          result: AuthResult.FAILED,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: LogId.generate().value,
          user_id: 'user1',
          event_type: EventType.TOKEN_REFRESH,
          provider: 'jwt',
          result: AuthResult.SUCCESS,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockChain.lte.mockResolvedValue({ data: mockRecords, error: null });

      const result = await repository.getStatistics(timeRange);

      expect(result.isSuccess).toBe(true);
      const stats = result.getValue();
      expect(stats.totalAttempts).toBe(4);
      expect(stats.successfulLogins).toBe(3);
      expect(stats.failedLogins).toBe(1);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.tokenRefreshCount).toBe(1);
      expect(stats.loginsByProvider.get('google')).toBe(1);
      expect(stats.loginsByProvider.get('github')).toBe(1);
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete old logs', async () => {
      const beforeDate = new Date('2025-01-01');
      const mockCount = 100;

      // Mock count query chain: select() -> lt() -> resolves with count
      mockChain.select.mockReturnValueOnce(mockChain);
      mockChain.lt.mockResolvedValueOnce({ count: mockCount, error: null });

      // Mock delete query chain: delete() -> lt() -> resolves
      mockChain.delete.mockReturnValueOnce(mockChain);
      mockChain.lt.mockResolvedValueOnce({ error: null });

      const result = await repository.deleteOldLogs(beforeDate);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(mockCount);
      expect(mockChain.lt).toHaveBeenCalledWith('created_at', beforeDate.toISOString());
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedCount: mockCount,
          beforeDate: beforeDate.toISOString(),
        }),
        'Old auth logs deleted',
      );
    });

    it('should handle delete error', async () => {
      const beforeDate = new Date('2025-01-01');

      mockChain.select.mockResolvedValueOnce({ count: 100, error: null });
      mockChain.delete.mockReturnValue(mockChain);
      mockChain.lt.mockResolvedValue({ error: { message: 'Delete failed' } });

      const result = await repository.deleteOldLogs(beforeDate);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('AUTH_LOG_DELETE_ERROR');
    });
  });
});
