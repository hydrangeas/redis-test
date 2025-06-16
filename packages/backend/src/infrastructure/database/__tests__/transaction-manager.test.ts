import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionManager } from '../transaction-manager';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'pino';

describe('TransactionManager', () => {
  let transactionManager: TransactionManager;
  let mockSupabase: SupabaseClient;
  let mockEventBus: IEventBus;
  let mockLogger: Logger;

  beforeEach(() => {
    mockSupabase = {} as SupabaseClient;

    mockEventBus = {
      publish: vi.fn(),
      publishAll: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      dispatchPendingEvents: vi.fn(),
      clearPendingEvents: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;

    transactionManager = new TransactionManager(mockSupabase, mockEventBus, mockLogger);
  });

  describe('executeInTransaction', () => {
    it('should execute work and dispatch events on success', async () => {
      const mockWork = vi.fn().mockResolvedValue('success');

      const result = await transactionManager.executeInTransaction(mockWork);

      expect(result).toBe('success');
      expect(mockWork).toHaveBeenCalled();
      expect(mockEventBus.dispatchPendingEvents).toHaveBeenCalled();
      expect(mockEventBus.clearPendingEvents).not.toHaveBeenCalled();
    });

    it('should clear pending events on work failure', async () => {
      const error = new Error('Work failed');
      const mockWork = vi.fn().mockRejectedValue(error);

      await expect(transactionManager.executeInTransaction(mockWork)).rejects.toThrow(
        'Work failed',
      );

      expect(mockWork).toHaveBeenCalled();
      expect(mockEventBus.clearPendingEvents).toHaveBeenCalled();
      expect(mockEventBus.dispatchPendingEvents).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Work failed',
        }),
        'Transaction failed, clearing pending events',
      );
    });

    it('should propagate non-Error exceptions', async () => {
      const mockWork = vi.fn().mockRejectedValue('string error');

      await expect(transactionManager.executeInTransaction(mockWork)).rejects.toBe('string error');

      expect(mockEventBus.clearPendingEvents).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unknown error',
        }),
        'Transaction failed, clearing pending events',
      );
    });

    it('should clear events even if dispatch fails', async () => {
      const mockWork = vi.fn().mockResolvedValue('success');
      vi.mocked(mockEventBus.dispatchPendingEvents).mockRejectedValue(new Error('Dispatch failed'));

      await expect(transactionManager.executeInTransaction(mockWork)).rejects.toThrow(
        'Dispatch failed',
      );

      expect(mockEventBus.clearPendingEvents).toHaveBeenCalled();
    });
  });

  describe('executeWithEventDispatch', () => {
    it('should execute work and dispatch events without transaction', async () => {
      const mockWork = vi.fn().mockResolvedValue('result');

      const result = await transactionManager.executeWithEventDispatch(mockWork);

      expect(result).toBe('result');
      expect(mockWork).toHaveBeenCalled();
      expect(mockEventBus.dispatchPendingEvents).toHaveBeenCalled();
    });

    it('should not clear events on failure', async () => {
      const mockWork = vi.fn().mockRejectedValue(new Error('Failed'));

      await expect(transactionManager.executeWithEventDispatch(mockWork)).rejects.toThrow('Failed');

      expect(mockEventBus.clearPendingEvents).not.toHaveBeenCalled();
    });
  });
});
