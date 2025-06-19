import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InMemoryRateLimitLogRepository } from '../in-memory-rate-limit-log.repository';
import { RateLimitLog } from '@/domain/api/entities/rate-limit-log.entity';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { EndpointId } from '@/domain/api/value-objects/endpoint-id';
import { RateLimitWindow } from '@/domain/api/value-objects/rate-limit-window';
import { v4 as uuidv4 } from 'uuid';

describe('InMemoryRateLimitLogRepository', () => {
  let repository: InMemoryRateLimitLogRepository;

  // Test用の固定UUID
  const testUserIds = {
    user1: '550e8400-e29b-41d4-a716-446655440001',
    user2: '550e8400-e29b-41d4-a716-446655440002',
    user3: '550e8400-e29b-41d4-a716-446655440003',
    user123: '550e8400-e29b-41d4-a716-446655440123',
    user999: '550e8400-e29b-41d4-a716-446655440999',
  };

  const createTestLog = (
    userId?: string,
    endpointId: string = 'endpoint-456',
    requestedAt: Date = new Date(),
    exceeded: boolean = false,
  ): RateLimitLog => {
    const logResult = RateLimitLog.create({
      userId: userId || uuidv4(),
      endpointId: endpointId,
      requestId: uuidv4(),
      timestamp: requestedAt,
      exceeded: exceeded,
    });

    if (logResult.isFailure) {
      throw new Error(`Failed to create RateLimitLog: ${logResult.getError().message}`);
    }

    return logResult.getValue()!;
  };

  beforeEach(() => {
    repository = new InMemoryRateLimitLogRepository();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('save', () => {
    it('should save a rate limit log', async () => {
      const log = createTestLog();

      const result = await repository.save(log);

      expect(result.isSuccess).toBe(true);
      expect(repository.getAll()).toHaveLength(1);
      expect(repository.getAll()[0]).toBe(log);
    });
  });

  describe('saveMany', () => {
    it('should save multiple logs', async () => {
      const logs = [
        createTestLog(testUserIds.user1, 'endpoint-1'),
        createTestLog(testUserIds.user2, 'endpoint-2'),
        createTestLog(testUserIds.user3, 'endpoint-3'),
      ];

      const result = await repository.saveMany(logs);

      expect(result.isSuccess).toBe(true);
      expect(repository.getAll()).toHaveLength(3);
    });

    it('should handle empty array', async () => {
      const result = await repository.saveMany([]);

      expect(result.isSuccess).toBe(true);
      expect(repository.getAll()).toHaveLength(0);
    });
  });

  describe('findByUserAndEndpoint', () => {
    it('should find logs within the time window', async () => {
      const userId = UserId.create(testUserIds.user123).getValue()!;
      const endpointId = EndpointId.create('endpoint-456').getValue()!;
      const window = new RateLimitWindow(60); // 60 seconds

      // 現在時刻のログ
      const currentLog = createTestLog(testUserIds.user123, 'endpoint-456', new Date());
      await repository.save(currentLog);

      // 30秒前のログ（ウィンドウ内）
      const recentLog = createTestLog(
        testUserIds.user123,
        'endpoint-456',
        new Date(Date.now() - 30 * 1000),
      );
      await repository.save(recentLog);

      // 90秒前のログ（ウィンドウ外）
      const oldLog = createTestLog(
        testUserIds.user123,
        'endpoint-456',
        new Date(Date.now() - 90 * 1000),
      );
      await repository.save(oldLog);

      // 他のユーザーのログ
      const otherUserLog = createTestLog(testUserIds.user999, 'endpoint-456');
      await repository.save(otherUserLog);

      const result = await repository.findByUserAndEndpoint(userId, endpointId, window);

      expect(result.isSuccess).toBe(true);
      const logs = result.getValue()!;
      expect(logs).toHaveLength(2); // ウィンドウ内の2つのログのみ
      // ログの存在を確認（requestCountプロパティは存在しないため、タイムスタンプで確認）
      const timestamps = logs.map(log => log.timestamp.getTime());
      expect(timestamps).toContain(currentLog.timestamp.getTime());
      expect(timestamps).toContain(recentLog.timestamp.getTime());
      expect(timestamps).not.toContain(oldLog.timestamp.getTime());
    });
  });

  describe('findByUser', () => {
    it('should find all logs for a user', async () => {
      const userId = UserId.create(testUserIds.user123).getValue()!;

      await repository.save(createTestLog(testUserIds.user123, 'endpoint-1'));
      await repository.save(createTestLog(testUserIds.user123, 'endpoint-2'));
      await repository.save(createTestLog(testUserIds.user999, 'endpoint-1'));

      const result = await repository.findByUser(userId);

      expect(result.isSuccess).toBe(true);
      const logs = result.getValue()!;
      expect(logs).toHaveLength(2);
      logs.forEach((log) => {
        expect(log.userId).toBe(userId.value);
      });
    });

    it('should filter by time window when provided', async () => {
      const userId = UserId.create(testUserIds.user123).getValue()!;
      const window = new RateLimitWindow(60);

      await repository.save(createTestLog(testUserIds.user123, 'endpoint-1', new Date()));
      await repository.save(
        createTestLog(testUserIds.user123, 'endpoint-2', new Date(Date.now() - 30 * 1000)),
      );
      await repository.save(
        createTestLog(testUserIds.user123, 'endpoint-3', new Date(Date.now() - 90 * 1000)),
      );

      const result = await repository.findByUser(userId, window);

      expect(result.isSuccess).toBe(true);
      const logs = result.getValue()!;
      expect(logs).toHaveLength(2); // ウィンドウ内の2つのみ
    });
  });

  describe('findByEndpoint', () => {
    it('should find all logs for an endpoint', async () => {
      const endpointId = EndpointId.create('endpoint-456').getValue()!;

      await repository.save(createTestLog(testUserIds.user1, 'endpoint-456'));
      await repository.save(createTestLog(testUserIds.user2, 'endpoint-456'));
      await repository.save(createTestLog(testUserIds.user1, 'endpoint-999'));

      const result = await repository.findByEndpoint(endpointId);

      expect(result.isSuccess).toBe(true);
      const logs = result.getValue()!;
      expect(logs).toHaveLength(2);
      logs.forEach((log) => {
        expect(log.endpointId).toBe('endpoint-456');
      });
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete logs older than specified date', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      await repository.save(createTestLog(testUserIds.user1, 'endpoint-1', now));
      await repository.save(createTestLog(testUserIds.user2, 'endpoint-2', oneHourAgo));
      await repository.save(createTestLog(testUserIds.user3, 'endpoint-3', twoHoursAgo));

      // 1.5時間前より古いログを削除
      const cutoffDate = new Date(now.getTime() - 1.5 * 60 * 60 * 1000);
      const result = await repository.deleteOldLogs(cutoffDate);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(1); // 2時間前のログ1件が削除
      expect(repository.getAll()).toHaveLength(2);
    });
  });

  describe('countRequests', () => {
    it('should count total requests within window', async () => {
      const userId = UserId.create(testUserIds.user123).getValue()!;
      const endpointId = EndpointId.create('endpoint-456').getValue()!;
      const window = new RateLimitWindow(60);

      // ウィンドウ内のログ（各ログは1リクエストを表す）
      await repository.save(createTestLog(testUserIds.user123, 'endpoint-456', new Date()));
      await repository.save(
        createTestLog(testUserIds.user123, 'endpoint-456', new Date(Date.now() - 30 * 1000)),
      );

      // ウィンドウ外のログ
      await repository.save(
        createTestLog(testUserIds.user123, 'endpoint-456', new Date(Date.now() - 90 * 1000)),
      );

      const result = await repository.countRequests(userId, endpointId, window);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(2); // ウィンドウ内の2つのログ
    });

    it('should return 0 when no logs exist', async () => {
      const userId = UserId.create(testUserIds.user123).getValue()!;
      const endpointId = EndpointId.create('endpoint-456').getValue()!;
      const window = new RateLimitWindow(60);

      const result = await repository.countRequests(userId, endpointId, window);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(0);
    });
  });

  describe('test helpers', () => {
    it('should clear all logs', async () => {
      await repository.save(createTestLog(testUserIds.user1));
      await repository.save(createTestLog(testUserIds.user2));

      expect(repository.getAll()).toHaveLength(2);

      repository.clear();

      expect(repository.getAll()).toHaveLength(0);
    });
  });
});
