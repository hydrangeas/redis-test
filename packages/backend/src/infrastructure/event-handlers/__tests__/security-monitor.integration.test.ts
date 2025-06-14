import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityMonitorHandler } from '../security-monitor.handler';
import { TokenRefreshed, AuthenticationFailed } from '@/domain/auth/events';
import { ISecurityAlertService, SecurityAlert } from '@/infrastructure/services/security-alert.service';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import { AuthLogEntry, AuthResult } from '@/domain/log/entities/auth-log-entry';
import { EventType, AuthEvent } from '@/domain/log/value-objects/auth-event';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { IPAddress } from '@/domain/log/value-objects/ip-address';
import { LogId } from '@/domain/log/value-objects/log-id';
import { Provider } from '@/domain/log/value-objects/provider';
import { UserAgent } from '@/domain/log/value-objects/user-agent';
import type { Logger } from 'pino';

describe('SecurityMonitorHandler', () => {
  let handler: SecurityMonitorHandler;
  let mockAlertService: any;
  let mockAuthLogRepository: any;
  let mockLogger: any;

  beforeEach(() => {
    // モックの作成
    mockAlertService = {
      sendAlert: vi.fn().mockResolvedValue(undefined),
    };

    mockAuthLogRepository = {
      save: vi.fn().mockResolvedValue(Result.ok()),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findByEventType: vi.fn(),
      findByIPAddress: vi.fn(),
      findFailures: vi.fn(),
      findSuspiciousActivities: vi.fn(),
      getStatistics: vi.fn(),
      deleteOldLogs: vi.fn(),
    };

    mockLogger = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn(),
      level: 'info',
      silent: vi.fn(),
    } as unknown as jest.Mocked<Logger>;

    handler = new SecurityMonitorHandler(
      mockAlertService,
      mockAuthLogRepository,
      mockLogger
    );
  });

  describe('Token Refresh Monitoring', () => {
    it('should detect suspicious token refresh patterns', async () => {
      // 閾値を超えるリフレッシュログを作成
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const userIdObj = UserId.create(userId).getValue();
      
      const logs: AuthLogEntry[] = [];
      for (let i = 0; i < 11; i++) {
        const authEvent = AuthEvent.tokenRefresh().getValue();
        const provider = Provider.create('JWT').getValue();
        const ipAddress = IPAddress.unknown().getValue();
        const userAgent = UserAgent.unknown().getValue();
        
        const logEntry = AuthLogEntry.create({
          userId: userIdObj,
          event: authEvent,
          provider,
          ipAddress,
          userAgent,
          timestamp: new Date(Date.now() - i * 60 * 1000), // 過去1時間以内
          result: AuthResult.SUCCESS,
        }).getValue();
        
        logs.push(logEntry);
      }

      mockAuthLogRepository.findByUserId.mockResolvedValue(Result.ok(logs));

      // イベントを生成
      const event = new TokenRefreshed(
        userId,
        1,
        userId,
        'old-token-id',
        'new-token-id',
        11, // 11回目のリフレッシュ
        'session-123'
      );

      // ハンドラーを実行
      await handler.handle(event);

      // アラートが送信されたことを確認
      expect(mockAlertService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SUSPICIOUS_TOKEN_REFRESH',
          severity: 'HIGH',
          userId: userId,
          details: expect.objectContaining({
            refreshCount: 11,
            threshold: 10,
            sessionId: 'session-123',
          }),
        })
      );

      // ログが記録されたことを確認
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userId,
          refreshCount: 11,
        }),
        'Suspicious token refresh pattern detected'
      );
    });

    it('should not alert for normal token refresh patterns', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';
      
      // 正常な範囲のリフレッシュログ
      mockAuthLogRepository.findByUserId.mockResolvedValue(Result.ok([]));

      const event = new TokenRefreshed(
        userId,
        1,
        userId,
        'old-token-id',
        'new-token-id',
        1,
        'session-123'
      );

      await handler.handle(event);

      // アラートが送信されないことを確認
      expect(mockAlertService.sendAlert).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Failure Monitoring', () => {
    it('should detect brute force attempts', async () => {
      const ipAddress = '192.168.1.100';
      const ipAddressObj = IPAddress.create(ipAddress).getValue();
      
      // 閾値を超える失敗ログを作成
      const logs: AuthLogEntry[] = [];
      for (let i = 0; i < 5; i++) {
        const authEvent = AuthEvent.loginFailed('Invalid credentials').getValue();
        const provider = Provider.create('Google').getValue();
        const userAgent = UserAgent.create('Mozilla/5.0').getValue();
        
        const logEntry = AuthLogEntry.create({
          event: authEvent,
          provider,
          ipAddress: ipAddressObj,
          userAgent,
          timestamp: new Date(Date.now() - i * 60 * 1000), // 過去15分以内
          result: AuthResult.FAILED,
          errorMessage: 'Invalid credentials',
        }).getValue();
        
        logs.push(logEntry);
      }

      mockAuthLogRepository.findByIPAddress.mockResolvedValue(Result.ok(logs));

      // イベントを生成
      const event = new AuthenticationFailed(
        'auth-aggregate-id',
        1,
        'Google',
        'Invalid credentials',
        ipAddress,
        'Mozilla/5.0',
        'attempted-user-id'
      );

      // ハンドラーを実行
      await handler.handle(event);

      // アラートが送信されたことを確認
      expect(mockAlertService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: 'CRITICAL',
          details: expect.objectContaining({
            ipAddress: ipAddress,
            failureCount: 5,
            provider: 'Google',
            userAgent: 'Mozilla/5.0',
          }),
        })
      );

      // IPブロック推奨ログが記録されたことを確認
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: ipAddress,
          action: 'RECOMMEND_IP_BLOCK',
        }),
        'Recommending IP block due to suspicious activity'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440003';
      
      // リポジトリエラーをシミュレート
      mockAuthLogRepository.findByUserId.mockResolvedValue(
        Result.fail(new DomainError('DB_ERROR', 'Database connection failed'))
      );

      const event = new TokenRefreshed(
        userId,
        1,
        userId,
        'old-token-id',
        'new-token-id',
        1,
        'session-123'
      );

      await handler.handle(event);

      // エラーログが記録されたことを確認
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Failed to fetch logs'),
          event: expect.objectContaining({
            eventName: 'TokenRefreshed',
          }),
        }),
        'Failed to monitor token refresh'
      );

      // アラートは送信されないことを確認
      expect(mockAlertService.sendAlert).not.toHaveBeenCalled();
    });

    it('should handle invalid user ID gracefully', async () => {
      const invalidUserId = 'invalid-uuid';

      const event = new TokenRefreshed(
        invalidUserId,
        1,
        invalidUserId,
        'old-token-id',
        'new-token-id',
        1,
        'session-123'
      );

      await handler.handle(event);

      // エラーログが記録されたことを確認
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid user ID'),
        }),
        'Failed to monitor token refresh'
      );
    });
  });
});