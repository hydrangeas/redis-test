import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SupabaseAPILogRepository } from '../supabase-api-log.repository';
import { APILogEntry } from '@/domain/log/entities/api-log-entry';
import { LogId } from '@/domain/log/value-objects/log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { ApiPath } from '@/domain/api/value-objects/api-path';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { RequestInfo } from '@/domain/log/value-objects/request-info';
import { ResponseInfo } from '@/domain/log/value-objects/response-info';
import { TimeRange } from '@/domain/log/value-objects/time-range';
import { Logger } from 'pino';
import { createSupabaseMock } from './mock-setup-helper';

describe('SupabaseAPILogRepository', () => {
  let repository: SupabaseAPILogRepository;
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

    repository = new SupabaseAPILogRepository(mockSupabaseClient, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('should save API log entry successfully', async () => {
      const logEntryResult = APILogEntry.create({
        userId: UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue(),
        endpoint: new Endpoint(HttpMethod.GET, new ApiPath('/api/data/test.json')),
        requestInfo: new RequestInfo({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          headers: { 'accept': 'application/json' },
          body: null,
        }),
        responseInfo: new ResponseInfo({
          statusCode: 200,
          responseTime: 45,
          size: 1024,
          headers: { 'content-type': 'application/json' },
        }),
        timestamp: new Date()
      }, LogId.generate());
      
      if (logEntryResult.isFailure) {
        throw new Error(`Failed to create log entry: ${logEntryResult.getError().message}`);
      }
      const logEntry = logEntryResult.getValue();

      mockChain.insert.mockResolvedValue({ error: null });

      const result = await repository.save(logEntry);

      expect(result.isSuccess).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_logs');
      expect(mockChain.insert).toHaveBeenCalledWith({
        id: logEntry.id.value,
        user_id: logEntry.userId?.value,
        method: 'GET',
        endpoint: '/api/data/test.json',
        status_code: 200,
        response_time: 45,
        response_size: 1024,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        error_message: null,
        metadata: {
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        request_id: logEntry.id.value,
        created_at: logEntry.timestamp.toISOString(),
      });
    });

    it('should save API log with error message', async () => {
      const logEntryResult = APILogEntry.create({
        userId: UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue(),
        endpoint: new Endpoint(HttpMethod.GET, new ApiPath('/api/data/missing.json')),
        requestInfo: new RequestInfo({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          headers: {},
          body: null,
        }),
        responseInfo: new ResponseInfo({
          statusCode: 404,
          responseTime: 10,
          size: 0,
          headers: {},
        }),
        timestamp: new Date(),
        error: 'Resource not found'
      }, LogId.generate());
      
      if (logEntryResult.isFailure) {
        throw new Error(`Failed to create log entry: ${logEntryResult.getError().message}`);
      }
      const logEntry = logEntryResult.getValue();

      mockChain.insert.mockResolvedValue({ error: null });

      const result = await repository.save(logEntry);

      expect(result.isSuccess).toBe(true);
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status_code: 404,
          error_message: 'Resource not found',
        })
      );
    });

    it('should handle save error', async () => {
      const logEntryResult = APILogEntry.create({
        userId: UserId.create('550e8400-e29b-41d4-a716-446655440000').getValue(),
        endpoint: new Endpoint(HttpMethod.GET, new ApiPath('/api/data/test.json')),
        requestInfo: new RequestInfo({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          headers: {},
          body: null,
        }),
        responseInfo: new ResponseInfo({
          statusCode: 200,
          responseTime: 45,
          size: 1024,
          headers: {},
        }),
        timestamp: new Date()
      }, LogId.generate());
      
      if (logEntryResult.isFailure) {
        throw new Error(`Failed to create log entry: ${logEntryResult.getError().message}`);
      }
      const logEntry = logEntryResult.getValue();

      mockChain.insert.mockResolvedValue({ error: { message: 'Database error' } });

      const result = await repository.save(logEntry);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('API_LOG_SAVE_FAILED');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find API log by ID', async () => {
      const logId = LogId.generate();
      const mockRecord = {
        id: logId.value,
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        method: 'GET',
        endpoint: '/api/data/test.json',
        status_code: 200,
        response_time: 45,
        response_size: 1024,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        error_message: null,
        metadata: {},
        request_id: logId.value,
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
          method: 'GET',
          endpoint: '/api/data/test.json',
          status_code: 200,
          response_time: 45,
          response_size: 1024,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          error_message: null,
          metadata: {},
          request_id: LogId.generate().value,
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
      const timeRangeResult = TimeRange.create(
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
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

  describe('findErrors', () => {
    it('should find error logs', async () => {
      const mockRecords = [
        {
          id: LogId.generate().value,
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          method: 'GET',
          endpoint: '/api/data/missing.json',
          status_code: 404,
          response_time: 10,
          response_size: 0,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          error_message: 'Resource not found',
          metadata: {},
          request_id: LogId.generate().value,
          created_at: new Date().toISOString(),
        },
        {
          id: LogId.generate().value,
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          method: 'POST',
          endpoint: '/api/data/create',
          status_code: 500,
          response_time: 100,
          response_size: 0,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          error_message: 'Internal server error',
          metadata: {},
          request_id: LogId.generate().value,
          created_at: new Date().toISOString(),
        },
      ];

      mockChain.limit.mockResolvedValue({ data: mockRecords, error: null });

      const result = await repository.findErrors();

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(2);
      expect(mockChain.gte).toHaveBeenCalledWith('status_code', 400);
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics correctly', async () => {
      const timeRangeResult = TimeRange.create(
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      if (timeRangeResult.isFailure) {
        throw new Error(`Failed to create TimeRange: ${timeRangeResult.error}`);
      }
      const timeRange = timeRangeResult.value;

      const mockRecords = [
        {
          id: LogId.generate().value,
          user_id: 'user1',
          method: 'GET',
          endpoint: '/api/data/test.json',
          status_code: 200,
          response_time: 50,
          response_size: 1024,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: LogId.generate().value,
          user_id: 'user2',
          method: 'GET',
          endpoint: '/api/data/test.json',
          status_code: 200,
          response_time: 100,
          response_size: 2048,
          ip_address: '192.168.1.2',
          user_agent: 'Mozilla/5.0',
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: LogId.generate().value,
          user_id: 'user1',
          method: 'GET',
          endpoint: '/api/health',
          status_code: 200,
          response_time: 10,
          response_size: 256,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: LogId.generate().value,
          user_id: 'user1',
          method: 'GET',
          endpoint: '/api/data/missing.json',
          status_code: 404,
          response_time: 5,
          response_size: 0,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ];

      mockChain.lte.mockResolvedValue({ data: mockRecords, error: null });

      const result = await repository.getStatistics(timeRange);

      expect(result.isSuccess).toBe(true);
      const stats = result.getValue();
      expect(stats.totalRequests).toBe(4);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.errorCount).toBe(1);
      expect(stats.averageResponseTime).toBe(41); // (50 + 100 + 10 + 5) / 4 = 41.25 rounded
      expect(stats.requestsByEndpoint.get('/api/data/test.json')).toBe(2);
      expect(stats.requestsByEndpoint.get('/api/health')).toBe(1);
      expect(stats.requestsByEndpoint.get('/api/data/missing.json')).toBe(1);
      expect(stats.requestsByStatus.get(200)).toBe(3);
      expect(stats.requestsByStatus.get(404)).toBe(1);
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete old logs', async () => {
      const beforeDate = new Date('2025-01-01');
      const mockCount = 500;

      // First we need to reset the from() mock for each separate call
      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        return mockChain;
      });
      
      // Mock count query chain: select() -> lt() -> resolves with count
      mockChain.select.mockReturnValueOnce(mockChain);
      mockChain.lt.mockResolvedValueOnce({ count: mockCount, error: null });
      
      // For the second from() call, need fresh chain behavior
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
        'Old API logs deleted'
      );
    });

    it('should handle delete error', async () => {
      const beforeDate = new Date('2025-01-01');

      // Mock count query chain: select() -> lt() -> resolves with count
      mockChain.select.mockReturnValueOnce(mockChain);
      mockChain.lt.mockResolvedValueOnce({ count: 500, error: null });
      
      // Mock delete query chain with error: delete() -> lt() -> resolves with error
      mockChain.delete.mockReturnValueOnce(mockChain);
      mockChain.lt.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

      const result = await repository.deleteOldLogs(beforeDate);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('API_LOG_DELETE_FAILED');
    });
  });

  describe('findByTimeRange', () => {
    it('should find logs within time range', async () => {
      const timeRangeResult = TimeRange.create(
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      if (timeRangeResult.isFailure) {
        throw new Error(`Failed to create TimeRange: ${timeRangeResult.error}`);
      }
      const timeRange = timeRangeResult.value;

      const mockRecords = [
        {
          id: LogId.generate().value,
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          method: 'GET',
          endpoint: '/api/data/test.json',
          status_code: 200,
          response_time: 45,
          response_size: 1024,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          error_message: null,
          metadata: {},
          request_id: LogId.generate().value,
          created_at: new Date('2025-01-15').toISOString(),
        },
      ];

      mockChain.limit.mockResolvedValue({ data: mockRecords, error: null });

      const result = await repository.findByTimeRange(timeRange);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(1);
      expect(mockChain.gte).toHaveBeenCalledWith('created_at', timeRange.start.toISOString());
      expect(mockChain.lte).toHaveBeenCalledWith('created_at', timeRange.end.toISOString());
    });
  });
});
