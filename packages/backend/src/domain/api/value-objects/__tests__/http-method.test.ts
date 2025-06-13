import { describe, it, expect } from 'vitest';
import { 
  HttpMethod, 
  isValidHttpMethod, 
  parseHttpMethod, 
  isSafeMethod, 
  isIdempotentMethod 
} from '../http-method';

describe('HttpMethod', () => {
  describe('isValidHttpMethod', () => {
    it('should return true for valid HTTP methods', () => {
      expect(isValidHttpMethod('GET')).toBe(true);
      expect(isValidHttpMethod('POST')).toBe(true);
      expect(isValidHttpMethod('PUT')).toBe(true);
      expect(isValidHttpMethod('DELETE')).toBe(true);
      expect(isValidHttpMethod('PATCH')).toBe(true);
      expect(isValidHttpMethod('HEAD')).toBe(true);
      expect(isValidHttpMethod('OPTIONS')).toBe(true);
    });

    it('should return false for invalid HTTP methods', () => {
      expect(isValidHttpMethod('INVALID')).toBe(false);
      expect(isValidHttpMethod('get')).toBe(false); // lowercase
      expect(isValidHttpMethod('')).toBe(false);
      expect(isValidHttpMethod('CONNECT')).toBe(false);
      expect(isValidHttpMethod('TRACE')).toBe(false);
    });
  });

  describe('parseHttpMethod', () => {
    it('should parse valid HTTP methods case-insensitively', () => {
      expect(parseHttpMethod('get')).toBe(HttpMethod.GET);
      expect(parseHttpMethod('GET')).toBe(HttpMethod.GET);
      expect(parseHttpMethod('Post')).toBe(HttpMethod.POST);
      expect(parseHttpMethod('PUT')).toBe(HttpMethod.PUT);
      expect(parseHttpMethod('delete')).toBe(HttpMethod.DELETE);
      expect(parseHttpMethod('PATCH')).toBe(HttpMethod.PATCH);
      expect(parseHttpMethod('head')).toBe(HttpMethod.HEAD);
      expect(parseHttpMethod('options')).toBe(HttpMethod.OPTIONS);
    });

    it('should throw error for invalid HTTP methods', () => {
      expect(() => parseHttpMethod('INVALID')).toThrow('Invalid HTTP method: INVALID');
      expect(() => parseHttpMethod('')).toThrow('Invalid HTTP method: ');
      expect(() => parseHttpMethod('CONNECT')).toThrow('Invalid HTTP method: CONNECT');
    });
  });

  describe('isSafeMethod', () => {
    it('should return true for safe methods', () => {
      expect(isSafeMethod(HttpMethod.GET)).toBe(true);
      expect(isSafeMethod(HttpMethod.HEAD)).toBe(true);
      expect(isSafeMethod(HttpMethod.OPTIONS)).toBe(true);
    });

    it('should return false for unsafe methods', () => {
      expect(isSafeMethod(HttpMethod.POST)).toBe(false);
      expect(isSafeMethod(HttpMethod.PUT)).toBe(false);
      expect(isSafeMethod(HttpMethod.DELETE)).toBe(false);
      expect(isSafeMethod(HttpMethod.PATCH)).toBe(false);
    });
  });

  describe('isIdempotentMethod', () => {
    it('should return true for idempotent methods', () => {
      expect(isIdempotentMethod(HttpMethod.GET)).toBe(true);
      expect(isIdempotentMethod(HttpMethod.HEAD)).toBe(true);
      expect(isIdempotentMethod(HttpMethod.OPTIONS)).toBe(true);
      expect(isIdempotentMethod(HttpMethod.PUT)).toBe(true);
      expect(isIdempotentMethod(HttpMethod.DELETE)).toBe(true);
    });

    it('should return false for non-idempotent methods', () => {
      expect(isIdempotentMethod(HttpMethod.POST)).toBe(false);
      expect(isIdempotentMethod(HttpMethod.PATCH)).toBe(false);
    });
  });
});