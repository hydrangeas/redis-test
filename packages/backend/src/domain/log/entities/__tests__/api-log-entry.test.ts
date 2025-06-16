import { describe, it, expect, beforeEach } from 'vitest';
import { APILogEntry } from '../api-log-entry';
import { LogId } from '../../value-objects/log-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { Endpoint } from '@/domain/api/value-objects/endpoint';
import { RequestInfo } from '../../value-objects/request-info';
import { ResponseInfo } from '../../value-objects/response-info';

describe('APILogEntry', () => {
  let validProps: any;
  let requestInfo: RequestInfo;
  let responseInfo: ResponseInfo;

  beforeEach(() => {
    requestInfo = new RequestInfo({
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
      headers: { accept: 'application/json' },
      body: null,
    });

    responseInfo = new ResponseInfo({
      statusCode: 200,
      responseTime: 150,
      size: 1024,
      headers: { 'content-type': 'application/json' },
    });

    validProps = {
      userId: new UserId('123e4567-e89b-12d3-a456-426614174000'),
      endpoint: Endpoint.fromString('GET /api/data/test.json'),
      requestInfo,
      responseInfo,
      timestamp: new Date(),
    };
  });

  describe('create', () => {
    it('should create APILogEntry with valid properties', () => {
      const result = APILogEntry.create(validProps);

      expect(result.isSuccess).toBe(true);
      const entry = result.getValue();
      expect(entry.userId).toBe(validProps.userId);
      expect(entry.endpoint).toBe(validProps.endpoint);
      expect(entry.requestInfo).toBe(validProps.requestInfo);
      expect(entry.responseInfo).toBe(validProps.responseInfo);
      expect(entry.timestamp).toEqual(validProps.timestamp);
      expect(entry.error).toBeUndefined();
    });

    it('should create APILogEntry with custom id', () => {
      const customId = LogId.generate();
      const result = APILogEntry.create(validProps, customId);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().id).toBe(customId);
    });

    it('should create APILogEntry without userId', () => {
      const props = {
        ...validProps,
        userId: undefined,
      };

      const result = APILogEntry.create(props);
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().userId).toBeUndefined();
    });

    it('should create APILogEntry with error message', () => {
      const props = {
        ...validProps,
        error: 'Internal server error',
      };

      const result = APILogEntry.create(props);
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().error).toBe('Internal server error');
    });

    it('should fail without required properties', () => {
      const requiredProps = ['endpoint', 'requestInfo', 'responseInfo', 'timestamp'];

      requiredProps.forEach((prop) => {
        const invalidProps = { ...validProps };
        delete invalidProps[prop];

        const result = APILogEntry.create(invalidProps);
        expect(result.isFailure).toBe(true);
      });
    });

    it('should fail with future timestamp', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const props = {
        ...validProps,
        timestamp: futureDate,
      };

      const result = APILogEntry.create(props);
      expect(result.isFailure).toBe(true);
      expect(result.error?.message).toBe('Timestamp cannot be in the future');
    });
  });

  describe('status checks', () => {
    it('should identify success status', () => {
      const entry = APILogEntry.create(validProps).getValue();
      expect(entry.isSuccess).toBe(true);
      expect(entry.isError).toBe(false);
    });

    it('should identify error status', () => {
      const props = {
        ...validProps,
        responseInfo: new ResponseInfo({
          statusCode: 404,
          responseTime: 50,
          size: 100,
          headers: {},
        }),
      };

      const entry = APILogEntry.create(props).getValue();
      expect(entry.isSuccess).toBe(false);
      expect(entry.isError).toBe(true);
    });

    it('should identify rate limit status', () => {
      const props = {
        ...validProps,
        responseInfo: new ResponseInfo({
          statusCode: 429,
          responseTime: 10,
          size: 100,
          headers: {},
        }),
      };

      const entry = APILogEntry.create(props).getValue();
      expect(entry.isRateLimited).toBe(true);
    });

    it('should identify unauthorized status', () => {
      const props = {
        ...validProps,
        responseInfo: new ResponseInfo({
          statusCode: 401,
          responseTime: 20,
          size: 100,
          headers: {},
        }),
      };

      const entry = APILogEntry.create(props).getValue();
      expect(entry.isUnauthorized).toBe(true);
    });

    it('should identify forbidden status', () => {
      const props = {
        ...validProps,
        responseInfo: new ResponseInfo({
          statusCode: 403,
          responseTime: 20,
          size: 100,
          headers: {},
        }),
      };

      const entry = APILogEntry.create(props).getValue();
      expect(entry.isForbidden).toBe(true);
    });

    it('should identify not found status', () => {
      const props = {
        ...validProps,
        responseInfo: new ResponseInfo({
          statusCode: 404,
          responseTime: 20,
          size: 100,
          headers: {},
        }),
      };

      const entry = APILogEntry.create(props).getValue();
      expect(entry.isNotFound).toBe(true);
    });

    it('should identify internal error status', () => {
      const props = {
        ...validProps,
        responseInfo: new ResponseInfo({
          statusCode: 500,
          responseTime: 1000,
          size: 500,
          headers: {},
        }),
      };

      const entry = APILogEntry.create(props).getValue();
      expect(entry.isInternalError).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('should return success summary', () => {
      const entry = APILogEntry.create(validProps).getValue();
      const summary = entry.getSummary();

      expect(summary).toBe('[SUCCESS] GET /api/data/test.json - 200 (150ms)');
    });

    it('should return error summary', () => {
      const props = {
        ...validProps,
        responseInfo: new ResponseInfo({
          statusCode: 404,
          responseTime: 50,
          size: 100,
          headers: {},
        }),
      };

      const entry = APILogEntry.create(props).getValue();
      const summary = entry.getSummary();

      expect(summary).toBe('[ERROR] GET /api/data/test.json - 404 (50ms)');
    });
  });

  describe('getTags', () => {
    it('should generate tags for successful request', () => {
      const entry = APILogEntry.create(validProps).getValue();
      const tags = entry.getTags();

      expect(tags).toContain('success');
      expect(tags).toContain('normal'); // 150ms response time
      expect(tags).toContain('endpoint:/api/data/test.json');
      expect(tags).toContain('method:get');
    });

    it('should generate tags for error request', () => {
      const props = {
        ...validProps,
        responseInfo: new ResponseInfo({
          statusCode: 404,
          responseTime: 50,
          size: 100,
          headers: {},
        }),
      };

      const entry = APILogEntry.create(props).getValue();
      const tags = entry.getTags();

      expect(tags).toContain('error');
      expect(tags).toContain('not_found');
      expect(tags).toContain('fast'); // 50ms response time
    });

    it('should categorize response time correctly', () => {
      const testCases = [
        { time: 50, tag: 'fast' },
        { time: 300, tag: 'normal' },
        { time: 800, tag: 'slow' },
        { time: 1500, tag: 'very_slow' },
      ];

      testCases.forEach(({ time, tag }) => {
        const props = {
          ...validProps,
          responseInfo: new ResponseInfo({
            statusCode: 200,
            responseTime: time,
            size: 100,
            headers: {},
          }),
        };

        const entry = APILogEntry.create(props).getValue();
        const tags = entry.getTags();
        expect(tags).toContain(tag);
      });
    });
  });

  describe('immutability', () => {
    it('should return new Date instance for timestamp', () => {
      const entry = APILogEntry.create(validProps).getValue();
      const timestamp1 = entry.timestamp;
      const timestamp2 = entry.timestamp;

      expect(timestamp1).not.toBe(timestamp2);
      expect(timestamp1).toEqual(timestamp2);
    });
  });
});
