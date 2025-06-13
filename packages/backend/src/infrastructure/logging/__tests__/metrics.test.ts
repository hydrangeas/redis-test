import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logPerformance, measurePerformance, measureSyncPerformance } from '../metrics';

describe('Performance Metrics', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };
  });

  describe('logPerformance', () => {
    it('should log performance metrics', () => {
      logPerformance(mockLogger, 'test-operation', 123.45, { userId: 'user-123' });

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const [logData, message] = mockLogger.info.mock.calls[0];

      expect(message).toBe('Performance: test-operation completed in 123.45ms');
      expect(logData.performance).toMatchObject({
        operation: 'test-operation',
        duration: 123.45,
        userId: 'user-123',
      });
      expect(logData.context).toBe('performance_metric');
      expect(logData.performance.timestamp).toBeDefined();
    });
  });

  describe('measurePerformance', () => {
    it('should measure and log async operation performance', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result');
      
      const result = await measurePerformance(
        mockLogger,
        'async-operation',
        mockOperation,
        { requestId: 'req-123' }
      );

      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledTimes(1);

      const [logData] = mockLogger.info.mock.calls[0];
      expect(logData.performance.operation).toBe('async-operation');
      expect(logData.performance.duration).toBeGreaterThan(0);
      expect(logData.performance.status).toBe('success');
      expect(logData.performance.requestId).toBe('req-123');
    });

    it('should log errors in async operations', async () => {
      const error = new Error('Test error');
      const mockOperation = vi.fn().mockRejectedValue(error);

      await expect(
        measurePerformance(mockLogger, 'failing-operation', mockOperation)
      ).rejects.toThrow('Test error');

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const [logData] = mockLogger.info.mock.calls[0];
      
      expect(logData.performance.status).toBe('error');
      expect(logData.performance.error).toBe('Test error');
    });

    it('should measure performance with delay', async () => {
      const mockOperation = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'delayed-result';
      });

      const result = await measurePerformance(
        mockLogger,
        'delayed-operation',
        mockOperation
      );

      expect(result).toBe('delayed-result');
      
      const [logData] = mockLogger.info.mock.calls[0];
      expect(logData.performance.duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('measureSyncPerformance', () => {
    it('should measure and log sync operation performance', () => {
      const mockOperation = vi.fn().mockReturnValue('sync-result');
      
      const result = measureSyncPerformance(
        mockLogger,
        'sync-operation',
        mockOperation,
        { userId: 'user-456' }
      );

      expect(result).toBe('sync-result');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledTimes(1);

      const [logData] = mockLogger.info.mock.calls[0];
      expect(logData.performance.operation).toBe('sync-operation');
      expect(logData.performance.duration).toBeGreaterThanOrEqual(0);
      expect(logData.performance.status).toBe('success');
      expect(logData.performance.userId).toBe('user-456');
    });

    it('should log errors in sync operations', () => {
      const error = new Error('Sync error');
      const mockOperation = vi.fn().mockImplementation(() => {
        throw error;
      });

      expect(() => 
        measureSyncPerformance(mockLogger, 'failing-sync-operation', mockOperation)
      ).toThrow('Sync error');

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const [logData] = mockLogger.info.mock.calls[0];
      
      expect(logData.performance.status).toBe('error');
      expect(logData.performance.error).toBe('Sync error');
    });
  });
});