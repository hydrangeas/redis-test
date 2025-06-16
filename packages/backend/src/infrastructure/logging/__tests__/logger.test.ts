import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { createLogger, createLoggerConfig } from '../logger';
import type { EnvConfig } from '../../config';

describe('Logger', () => {
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

  describe('createLoggerConfig', () => {
    it('should create logger config with correct level', () => {
      const config = createLoggerConfig(mockConfig);
      expect(config.level).toBe('info');
    });

    it('should include environment in bindings', () => {
      const config = createLoggerConfig(mockConfig);
      const bindings = config.formatters?.bindings?.({ pid: 123, hostname: 'test' });
      expect(bindings).toHaveProperty('environment', 'development');
      expect(bindings).toHaveProperty('node_version', process.version);
    });

    it('should include pretty transport in development', () => {
      const config = createLoggerConfig(mockConfig);
      expect(config.transport).toBeDefined();
      expect(config.transport?.target).toBe('pino-pretty');
    });

    it('should not include pretty transport in production', () => {
      const prodConfig = { ...mockConfig, NODE_ENV: 'production' as const };
      const config = createLoggerConfig(prodConfig);
      expect(config.transport).toBeUndefined();
    });

    it('should redact sensitive paths', () => {
      const config = createLoggerConfig(mockConfig);
      expect(config.redact?.paths).toContain('req.headers.authorization');
      expect(config.redact?.paths).toContain('*.password');
      expect(config.redact?.paths).toContain('*.token');
      expect(config.redact?.remove).toBe(true);
    });

    it('should serialize request correctly', () => {
      const config = createLoggerConfig(mockConfig);
      const mockRequest = {
        method: 'GET',
        url: '/test',
        routerPath: '/test',
        params: { id: '123' },
        user: { id: 'user-123' },
        id: 'req-123',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
      };

      const serialized = config.serializers?.req?.(mockRequest);
      expect(serialized).toEqual({
        method: 'GET',
        url: '/test',
        path: '/test',
        parameters: { id: '123' },
        userId: 'user-123',
        requestId: 'req-123',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });

    it('should serialize response correctly', () => {
      const config = createLoggerConfig(mockConfig);
      const mockReply = {
        statusCode: 200,
        getResponseTime: () => 123.45,
      };

      const serialized = config.serializers?.res?.(mockReply);
      expect(serialized).toEqual({
        statusCode: 200,
        responseTime: 123.45,
      });
    });
  });

  describe('createLogger', () => {
    it('should create a logger instance', () => {
      const logger = createLogger(mockConfig);
      expect(logger).toBeDefined();
      expect(logger.level).toBe('info');
    });

    it('should log messages', () => {
      const logger = createLogger(mockConfig);

      // ロガーが正しく動作することを確認
      expect(() => logger.info('test message')).not.toThrow();
      expect(() => logger.error('error message')).not.toThrow();
      expect(() => logger.debug('debug message')).not.toThrow();
    });

    it('should create child logger with bindings', () => {
      const logger = createLogger(mockConfig);
      const childLogger = logger.child({ service: 'test-service' });

      expect(childLogger).toBeDefined();
      expect(childLogger.bindings()).toHaveProperty('service', 'test-service');
    });
  });
});
