import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { createFastifyLoggerConfig, setupRequestLogging } from '../fastify-logger';
import type { EnvConfig } from '../../config';

describe('Fastify Logger', () => {
  const mockConfig: EnvConfig = {
    NODE_ENV: 'development',
    PORT: 8080,
    HOST: '0.0.0.0',
    LOG_LEVEL: 'info',
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    JWT_SECRET: 'test-secret-at-least-32-characters-long',
    API_BASE_URL: 'http://localhost:8080',
    FRONTEND_URL: 'http://localhost:3000',
    RATE_LIMIT_TIER1: 60,
    RATE_LIMIT_TIER2: 120,
    RATE_LIMIT_TIER3: 300,
    RATE_LIMIT_WINDOW: 60,
  };

  describe('createFastifyLoggerConfig', () => {
    it('should create fastify logger config', () => {
      const loggerConfig = createFastifyLoggerConfig(mockConfig);

      expect(loggerConfig).toHaveProperty('logger');
      expect(loggerConfig).toHaveProperty('requestIdLogLabel', 'requestId');
      expect(loggerConfig).toHaveProperty('disableRequestLogging', false);
      expect(loggerConfig).toHaveProperty('requestIdHeader', 'x-request-id');
      expect(loggerConfig).toHaveProperty('genReqId');
    });

    it('should generate request id from header if present', () => {
      const loggerConfig = createFastifyLoggerConfig(mockConfig);
      const mockReq = { headers: { 'x-request-id': 'existing-id' } };
      
      const reqId = loggerConfig.genReqId!(mockReq);
      expect(reqId).toBe('existing-id');
    });

    it('should generate new request id if header not present', () => {
      const loggerConfig = createFastifyLoggerConfig(mockConfig);
      const mockReq = { headers: {} };
      
      const reqId = loggerConfig.genReqId!(mockReq);
      expect(reqId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('setupRequestLogging', () => {
    it('should setup request logging hooks', () => {
      const mockServer = {
        addHook: vi.fn(),
      };

      setupRequestLogging(mockServer);

      expect(mockServer.addHook).toHaveBeenCalledTimes(3);
      expect(mockServer.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
      expect(mockServer.addHook).toHaveBeenCalledWith('onResponse', expect.any(Function));
      expect(mockServer.addHook).toHaveBeenCalledWith('onError', expect.any(Function));
    });

    it('should log request start', async () => {
      const mockServer = {
        addHook: vi.fn(),
      };
      const mockRequest = {
        log: {
          info: vi.fn(),
        },
      };
      const mockReply = {};

      setupRequestLogging(mockServer);
      
      // Get the onRequest hook function
      const onRequestHook = mockServer.addHook.mock.calls.find(
        call => call[0] === 'onRequest'
      )[1];

      await onRequestHook(mockRequest);

      expect(mockRequest.log.info).toHaveBeenCalledWith(
        {
          req: mockRequest,
          event: 'request_start',
        },
        'incoming request'
      );
    });

    it('should log request completion', async () => {
      const mockServer = {
        addHook: vi.fn(),
      };
      const mockRequest = {
        log: {
          info: vi.fn(),
        },
      };
      const mockReply = {
        getResponseTime: vi.fn().mockReturnValue(123.45),
      };

      setupRequestLogging(mockServer);
      
      // Get the onResponse hook function
      const onResponseHook = mockServer.addHook.mock.calls.find(
        call => call[0] === 'onResponse'
      )[1];

      await onResponseHook(mockRequest, mockReply);

      expect(mockRequest.log.info).toHaveBeenCalledWith(
        {
          req: mockRequest,
          res: mockReply,
          event: 'request_complete',
          responseTime: 123.45,
        },
        'request completed'
      );
    });

    it('should log request errors', async () => {
      const mockServer = {
        addHook: vi.fn(),
      };
      const mockRequest = {
        log: {
          error: vi.fn(),
        },
      };
      const mockReply = {};
      const mockError = new Error('Test error');

      setupRequestLogging(mockServer);
      
      // Get the onError hook function
      const onErrorHook = mockServer.addHook.mock.calls.find(
        call => call[0] === 'onError'
      )[1];

      await onErrorHook(mockRequest, mockReply, mockError);

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        {
          req: mockRequest,
          res: mockReply,
          err: mockError,
          event: 'request_error',
        },
        'request error'
      );
    });
  });
});