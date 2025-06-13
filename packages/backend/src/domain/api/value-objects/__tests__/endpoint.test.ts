import { describe, it, expect } from 'vitest';
import { Endpoint } from '../endpoint';
import { HttpMethod } from '../http-method';
import { ApiPath } from '../api-path';
import { ValidationError } from '../../../errors/validation-error';

describe('Endpoint', () => {
  describe('constructor', () => {
    it('should create valid endpoint', () => {
      const endpoint = new Endpoint(HttpMethod.GET, new ApiPath('/api/users'));
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.path.value).toBe('/api/users');
      expect(Object.isFrozen(endpoint)).toBe(true);
    });

    it('should reject missing method', () => {
      expect(() => new Endpoint(null as any, new ApiPath('/api/users')))
        .toThrow('HTTP method is required');
    });

    it('should reject missing path', () => {
      expect(() => new Endpoint(HttpMethod.GET, null as any))
        .toThrow('API path is required');
    });
  });

  describe('fromString', () => {
    it('should parse valid endpoint strings', () => {
      const endpoint1 = Endpoint.fromString('GET /api/users');
      expect(endpoint1.method).toBe(HttpMethod.GET);
      expect(endpoint1.path.value).toBe('/api/users');

      const endpoint2 = Endpoint.fromString('POST   /api/users');
      expect(endpoint2.method).toBe(HttpMethod.POST);
      expect(endpoint2.path.value).toBe('/api/users');

      const endpoint3 = Endpoint.fromString('delete /api/users/123');
      expect(endpoint3.method).toBe(HttpMethod.DELETE);
      expect(endpoint3.path.value).toBe('/api/users/123');
    });

    it('should reject empty string', () => {
      expect(() => Endpoint.fromString('')).toThrow('Method and path string cannot be empty');
      expect(() => Endpoint.fromString('   ')).toThrow('Method and path string cannot be empty');
    });

    it('should reject invalid format', () => {
      expect(() => Endpoint.fromString('GET')).toThrow('Invalid endpoint format');
      expect(() => Endpoint.fromString('/api/users')).toThrow('Invalid endpoint format');
      expect(() => Endpoint.fromString('GET /api/users extra')).toThrow('Invalid endpoint format');
    });

    it('should reject invalid method', () => {
      expect(() => Endpoint.fromString('INVALID /api/users')).toThrow('Invalid HTTP method');
    });

    it('should reject invalid path', () => {
      expect(() => Endpoint.fromString('GET /api/../etc/passwd'))
        .toThrow('API path contains dangerous patterns');
    });
  });

  describe('equals', () => {
    it('should compare endpoints for equality', () => {
      const endpoint1 = new Endpoint(HttpMethod.GET, new ApiPath('/api/users'));
      const endpoint2 = new Endpoint(HttpMethod.GET, new ApiPath('/api/users'));
      const endpoint3 = new Endpoint(HttpMethod.POST, new ApiPath('/api/users'));
      const endpoint4 = new Endpoint(HttpMethod.GET, new ApiPath('/api/posts'));

      expect(endpoint1.equals(endpoint2)).toBe(true);
      expect(endpoint1.equals(endpoint3)).toBe(false); // different method
      expect(endpoint1.equals(endpoint4)).toBe(false); // different path
    });
  });

  describe('matches', () => {
    it('should match exact method and path', () => {
      const endpoint = new Endpoint(HttpMethod.GET, new ApiPath('/api/users/123'));
      expect(endpoint.matches('GET', '/api/users/123')).toBe(true);
      expect(endpoint.matches('POST', '/api/users/123')).toBe(false);
      expect(endpoint.matches('GET', '/api/users/456')).toBe(false);
    });

    it('should match wildcard method', () => {
      const endpoint = new Endpoint(HttpMethod.GET, new ApiPath('/api/users'));
      expect(endpoint.matches('*', '/api/users')).toBe(true);
      expect(endpoint.matches('*', '/api/posts')).toBe(false);
    });

    it('should match wildcard path', () => {
      const endpoint = new Endpoint(HttpMethod.GET, new ApiPath('/api/users/123'));
      expect(endpoint.matches('GET', '/api/users/*')).toBe(true);
      expect(endpoint.matches('GET', '/api/*/*')).toBe(true);
      expect(endpoint.matches('POST', '/api/users/*')).toBe(false);
    });

    it('should handle case-insensitive method matching', () => {
      const endpoint = new Endpoint(HttpMethod.GET, new ApiPath('/api/users'));
      expect(endpoint.matches('get', '/api/users')).toBe(true);
      expect(endpoint.matches('Get', '/api/users')).toBe(true);
    });
  });

  describe('toIdentifier', () => {
    it('should generate unique identifier', () => {
      const endpoint1 = new Endpoint(HttpMethod.GET, new ApiPath('/api/users'));
      expect(endpoint1.toIdentifier()).toBe('GET:/api/users');

      const endpoint2 = new Endpoint(HttpMethod.POST, new ApiPath('/api/users'));
      expect(endpoint2.toIdentifier()).toBe('POST:/api/users');
    });
  });

  describe('hashCode', () => {
    it('should generate consistent hash codes', () => {
      const endpoint1 = new Endpoint(HttpMethod.GET, new ApiPath('/api/users'));
      const endpoint2 = new Endpoint(HttpMethod.GET, new ApiPath('/api/users'));
      const endpoint3 = new Endpoint(HttpMethod.POST, new ApiPath('/api/users'));

      expect(endpoint1.hashCode()).toBe(endpoint2.hashCode());
      expect(endpoint1.hashCode()).not.toBe(endpoint3.hashCode());
    });

    it('should generate numeric hash codes', () => {
      const endpoint = new Endpoint(HttpMethod.GET, new ApiPath('/api/users'));
      const hash = endpoint.hashCode();
      expect(typeof hash).toBe('number');
      expect(Number.isInteger(hash)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const endpoint = new Endpoint(HttpMethod.GET, new ApiPath('/api/users'));
      expect(endpoint.toString()).toBe('GET /api/users');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const endpoint = new Endpoint(HttpMethod.GET, new ApiPath('/api/users'));
      const json = endpoint.toJSON();
      
      expect(json).toEqual({
        method: 'GET',
        path: '/api/users',
      });
    });

    it('should deserialize from JSON', () => {
      const original = new Endpoint(HttpMethod.POST, new ApiPath('/api/users/123'));
      const json = original.toJSON();
      const restored = Endpoint.fromJSON(json);
      
      expect(restored.equals(original)).toBe(true);
      expect(restored.method).toBe(original.method);
      expect(restored.path.value).toBe(original.path.value);
    });
  });

  describe('factory methods', () => {
    it('should create health check endpoint', () => {
      const endpoint = Endpoint.healthCheck();
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.path.value).toBe('/health');
    });

    it('should create API docs endpoint', () => {
      const endpoint = Endpoint.apiDocs();
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.path.value).toBe('/api-docs');
    });
  });
});