import { describe, it, expect } from 'vitest';
import { HttpMethod, HttpMethodType } from '../http-method';
import { ValidationError } from '@/domain/errors/validation-error';

describe('HttpMethod', () => {
  describe('create', () => {
    it('should create valid HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      
      methods.forEach(method => {
        const result = HttpMethod.create(method);
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe(method);
      });
    });

    it('should handle case-insensitive input', () => {
      const result1 = HttpMethod.create('get');
      expect(result1.isSuccess).toBe(true);
      expect(result1.getValue().value).toBe(HttpMethodType.GET);

      const result2 = HttpMethod.create('Post');
      expect(result2.isSuccess).toBe(true);
      expect(result2.getValue().value).toBe(HttpMethodType.POST);

      const result3 = HttpMethod.create('DELETE');
      expect(result3.isSuccess).toBe(true);
      expect(result3.getValue().value).toBe(HttpMethodType.DELETE);
    });

    it('should fail for empty or invalid methods', () => {
      const result1 = HttpMethod.create('');
      expect(result1.isFailure).toBe(true);
      expect(result1.getError()).toBeInstanceOf(ValidationError);
      expect(result1.getError().message).toBe('HTTP method cannot be empty');

      const result2 = HttpMethod.create('   ');
      expect(result2.isFailure).toBe(true);
      expect(result2.getError().message).toBe('HTTP method cannot be empty');

      const result3 = HttpMethod.create('INVALID');
      expect(result3.isFailure).toBe(true);
      expect(result3.getError().message).toBe('Invalid HTTP method: INVALID');
    });
  });

  describe('isSafe', () => {
    it('should identify safe methods', () => {
      const safeMethod1 = HttpMethod.create('GET').getValue();
      const safeMethod2 = HttpMethod.create('HEAD').getValue();
      const safeMethod3 = HttpMethod.create('OPTIONS').getValue();
      
      expect(safeMethod1.isSafe()).toBe(true);
      expect(safeMethod2.isSafe()).toBe(true);
      expect(safeMethod3.isSafe()).toBe(true);
    });

    it('should identify unsafe methods', () => {
      const unsafeMethod1 = HttpMethod.create('POST').getValue();
      const unsafeMethod2 = HttpMethod.create('PUT').getValue();
      const unsafeMethod3 = HttpMethod.create('DELETE').getValue();
      const unsafeMethod4 = HttpMethod.create('PATCH').getValue();
      
      expect(unsafeMethod1.isSafe()).toBe(false);
      expect(unsafeMethod2.isSafe()).toBe(false);
      expect(unsafeMethod3.isSafe()).toBe(false);
      expect(unsafeMethod4.isSafe()).toBe(false);
    });
  });

  describe('isIdempotent', () => {
    it('should identify idempotent methods', () => {
      const idempotentMethods = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'];
      
      idempotentMethods.forEach(method => {
        const httpMethod = HttpMethod.create(method).getValue();
        expect(httpMethod.isIdempotent()).toBe(true);
      });
    });

    it('should identify non-idempotent methods', () => {
      const nonIdempotentMethods = ['POST', 'PATCH'];
      
      nonIdempotentMethods.forEach(method => {
        const httpMethod = HttpMethod.create(method).getValue();
        expect(httpMethod.isIdempotent()).toBe(false);
      });
    });
  });

  describe('equals', () => {
    it('should return true for same methods', () => {
      const method1 = HttpMethod.create('GET').getValue();
      const method2 = HttpMethod.create('GET').getValue();
      
      expect(method1.equals(method2)).toBe(true);
    });

    it('should return false for different methods', () => {
      const method1 = HttpMethod.create('GET').getValue();
      const method2 = HttpMethod.create('POST').getValue();
      
      expect(method1.equals(method2)).toBe(false);
    });

    it('should be case-insensitive in comparison', () => {
      const method1 = HttpMethod.create('get').getValue();
      const method2 = HttpMethod.create('GET').getValue();
      
      expect(method1.equals(method2)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return the method string', () => {
      const method = HttpMethod.create('GET').getValue();
      expect(method.toString()).toBe('GET');
    });

    it('should always return uppercase', () => {
      const method = HttpMethod.create('post').getValue();
      expect(method.toString()).toBe('POST');
    });
  });

  describe('value getter', () => {
    it('should return the correct HttpMethodType', () => {
      const method = HttpMethod.create('PUT').getValue();
      expect(method.value).toBe(HttpMethodType.PUT);
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const method = HttpMethod.create('GET').getValue();
      expect(() => {
        (method as any)._value = 'POST';
      }).toThrow();
    });
  });
});