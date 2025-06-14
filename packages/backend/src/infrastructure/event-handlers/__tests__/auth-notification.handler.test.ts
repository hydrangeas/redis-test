import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { AuthNotificationHandler } from '../auth-notification.handler';
import { UserAuthenticated } from '@/domain/auth/events/user-authenticated.event';
import { INotificationService } from '@/infrastructure/services/notification.service.interface';
import { Logger } from 'pino';

describe('AuthNotificationHandler', () => {
  let handler: AuthNotificationHandler;
  let mockNotificationService: INotificationService;
  let mockLogger: Logger;

  beforeEach(() => {
    // モックの初期化
    mockNotificationService = {
      sendNewDeviceAlert: vi.fn(),
      sendSecurityAlert: vi.fn(),
      sendRateLimitAlert: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
    } as any;

    handler = new AuthNotificationHandler(mockNotificationService, mockLogger);
  });

  it('should handle user authenticated event without sending notifications by default', async () => {
    // Arrange
    const event = new UserAuthenticated(
      'user-123',
      1,
      'user-123',
      'google',
      'tier2',
      'session-456',
      '192.168.1.1',
      'Mozilla/5.0...'
    );

    // Act
    await handler.handle(event);

    // Assert
    expect(mockNotificationService.sendNewDeviceAlert).not.toHaveBeenCalled();
    expect(mockNotificationService.sendSecurityAlert).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should send new device alert when new device is detected', async () => {
    // Arrange
    const event = new UserAuthenticated(
      'user-123',
      1,
      'user-123',
      'google',
      'tier2',
      'session-456',
      '192.168.1.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    );

    // Mock isNewDevice to return true
    const isNewDeviceSpy = vi
      .spyOn(handler as any, 'isNewDevice')
      .mockResolvedValue(true);

    // Act
    await handler.handle(event);

    // Assert
    expect(mockNotificationService.sendNewDeviceAlert).toHaveBeenCalledWith({
      userId: 'user-123',
      device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      location: 'Unknown location',
      timestamp: event.occurredAt,
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      {
        userId: 'user-123',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      'New device login alert sent'
    );

    isNewDeviceSpy.mockRestore();
  });

  it('should send security alert when suspicious login is detected', async () => {
    // Arrange
    const event = new UserAuthenticated(
      'user-456',
      1,
      'user-456',
      'github',
      'tier1',
      'session-789',
      '1.2.3.4',
      'curl/7.68.0'
    );

    // Mock isSuspiciousLogin to return true
    const isSuspiciousLoginSpy = vi
      .spyOn(handler as any, 'isSuspiciousLogin')
      .mockResolvedValue(true);

    // Act
    await handler.handle(event);

    // Assert
    expect(mockNotificationService.sendSecurityAlert).toHaveBeenCalledWith({
      userId: 'user-456',
      reason: 'Suspicious login pattern detected',
      details: event.getData(),
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      {
        userId: 'user-456',
        eventData: event.getData(),
      },
      'Suspicious login alert sent'
    );

    isSuspiciousLoginSpy.mockRestore();
  });

  it('should handle events without optional fields', async () => {
    // Arrange
    const event = new UserAuthenticated(
      'user-789',
      1,
      'user-789',
      'google',
      'tier3'
    );

    // Mock isNewDevice to return true
    const isNewDeviceSpy = vi
      .spyOn(handler as any, 'isNewDevice')
      .mockResolvedValue(true);

    // Act
    await handler.handle(event);

    // Assert
    expect(mockNotificationService.sendNewDeviceAlert).toHaveBeenCalledWith({
      userId: 'user-789',
      device: 'Unknown device',
      location: 'Unknown location',
      timestamp: event.occurredAt,
    });

    isNewDeviceSpy.mockRestore();
  });

  it('should not throw error when notification service fails', async () => {
    // Arrange
    const event = new UserAuthenticated(
      'user-123',
      1,
      'user-123',
      'google',
      'tier2'
    );

    // Mock isNewDevice to return true
    const isNewDeviceSpy = vi
      .spyOn(handler as any, 'isNewDevice')
      .mockResolvedValue(true);

    // Mock notification service to throw error
    const error = new Error('Network error');
    (mockNotificationService.sendNewDeviceAlert as MockedFunction<any>)
      .mockRejectedValue(error);

    // Act & Assert
    await expect(handler.handle(event)).resolves.not.toThrow();

    expect(mockLogger.error).toHaveBeenCalledWith(
      {
        error: 'Network error',
        event: event.getMetadata(),
      },
      'Failed to send authentication notification'
    );

    isNewDeviceSpy.mockRestore();
  });

  it('should send both new device and security alerts when both conditions are met', async () => {
    // Arrange
    const event = new UserAuthenticated(
      'user-123',
      1,
      'user-123',
      'google',
      'tier2',
      'session-456',
      '192.168.1.1',
      'bot/1.0'
    );

    // Mock both methods to return true
    const isNewDeviceSpy = vi
      .spyOn(handler as any, 'isNewDevice')
      .mockResolvedValue(true);
    const isSuspiciousLoginSpy = vi
      .spyOn(handler as any, 'isSuspiciousLogin')
      .mockResolvedValue(true);

    // Act
    await handler.handle(event);

    // Assert
    expect(mockNotificationService.sendNewDeviceAlert).toHaveBeenCalledOnce();
    expect(mockNotificationService.sendSecurityAlert).toHaveBeenCalledOnce();
    expect(mockLogger.info).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();

    isNewDeviceSpy.mockRestore();
    isSuspiciousLoginSpy.mockRestore();
  });

  it('should handle unknown error types gracefully', async () => {
    // Arrange
    const event = new UserAuthenticated(
      'user-123',
      1,
      'user-123',
      'google',
      'tier2'
    );

    // Mock isNewDevice to return true
    const isNewDeviceSpy = vi
      .spyOn(handler as any, 'isNewDevice')
      .mockResolvedValue(true);

    // Mock notification service to throw non-Error object
    (mockNotificationService.sendNewDeviceAlert as MockedFunction<any>)
      .mockRejectedValue('Unknown error');

    // Act & Assert
    await expect(handler.handle(event)).resolves.not.toThrow();

    expect(mockLogger.error).toHaveBeenCalledWith(
      {
        error: 'Unknown error',
        event: event.getMetadata(),
      },
      'Failed to send authentication notification'
    );

    isNewDeviceSpy.mockRestore();
  });
});