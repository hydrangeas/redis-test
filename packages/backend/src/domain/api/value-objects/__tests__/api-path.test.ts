import { describe, it, expect } from 'vitest';
import { ApiPath } from '../api-path';
import { ValidationError } from '../../../errors/validation-error';

describe('ApiPath', () => {
  describe('constructor', () => {
    it('should create valid API path', () => {
      const path = new ApiPath('/api/users');
      expect(path.value).toBe('/api/users');
      expect(Object.isFrozen(path)).toBe(true);
    });

    it('should normalize paths', () => {
      // Add leading slash
      expect(new ApiPath('api/users').value).toBe('/api/users');
      
      // Remove trailing slash (except for root)
      expect(new ApiPath('/api/users/').value).toBe('/api/users');
      
      // Root path should keep trailing slash
      expect(new ApiPath('/').value).toBe('/');
      
      // Normalize multiple slashes
      expect(new ApiPath('//api///users//').value).toBe('/api/users');
      
      // Trim whitespace
      expect(new ApiPath('  /api/users  ').value).toBe('/api/users');
    });

    it('should reject empty paths', () => {
      expect(() => new ApiPath('')).toThrow(ValidationError);
      expect(() => new ApiPath('')).toThrow('API path cannot be empty');
      expect(() => new ApiPath('   ')).toThrow('API path cannot be empty');
    });

    it('should reject dangerous patterns', () => {
      // Path traversal patterns
      expect(() => new ApiPath('../etc/passwd')).toThrow('API path contains dangerous patterns');
      expect(() => new ApiPath('/api/../../../etc/passwd')).toThrow('API path contains dangerous patterns');
      expect(() => new ApiPath('/api/..\\windows\\system32')).toThrow('API path contains dangerous patterns');
      
      // URL encoded traversal
      expect(() => new ApiPath('/api/..%2F..%2Fetc')).toThrow('API path contains dangerous patterns');
      expect(() => new ApiPath('/api/..%5C..%5Cwindows')).toThrow('API path contains dangerous patterns');
    });

    it('should reject invalid characters', () => {
      expect(() => new ApiPath('/api/<script>')).toThrow('API path contains invalid characters');
      expect(() => new ApiPath('/api/users?id=1')).toThrow('API path contains invalid characters');
      expect(() => new ApiPath('/api/users#section')).toThrow('API path contains invalid characters');
      expect(() => new ApiPath('/api/users&test')).toThrow('API path contains invalid characters');
      expect(() => new ApiPath('/api/users space')).toThrow('API path contains invalid characters');
    });

    it('should accept valid paths with dots', () => {
      const path1 = new ApiPath('/secure/319985/r5.json');
      expect(path1.value).toBe('/secure/319985/r5.json');
      
      const path2 = new ApiPath('/api/v1.0/users');
      expect(path2.value).toBe('/api/v1.0/users');
    });

    it('should reject paths that are too long', () => {
      const longPath = '/' + 'a'.repeat(255);
      expect(() => new ApiPath(longPath)).toThrow('API path is too long');
    });
  });

  describe('getSegments', () => {
    it('should return path segments', () => {
      const path = new ApiPath('/api/v1/users/123');
      expect(path.getSegments()).toEqual(['api', 'v1', 'users', '123']);
    });

    it('should return empty array for root path', () => {
      const path = new ApiPath('/');
      expect(path.getSegments()).toEqual([]);
    });

    it('should handle single segment', () => {
      const path = new ApiPath('/health');
      expect(path.getSegments()).toEqual(['health']);
    });
  });

  describe('matches', () => {
    it('should match exact patterns', () => {
      const path = new ApiPath('/api/users/123');
      expect(path.matches('/api/users/123')).toBe(true);
      expect(path.matches('/api/users/456')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      const path = new ApiPath('/api/users/123');
      expect(path.matches('/api/users/*')).toBe(true);
      expect(path.matches('/api/*/123')).toBe(true);
      expect(path.matches('/api/*/*')).toBe(true);
      expect(path.matches('/*/*/123')).toBe(true);
    });

    it('should not match incorrect patterns', () => {
      const path = new ApiPath('/api/users');
      expect(path.matches('/api/users/*')).toBe(false); // no trailing segment
      expect(path.matches('/api')).toBe(false); // too short
      expect(path.matches('/api/users/extra')).toBe(false); // too long
    });

    it('should handle paths with dots', () => {
      const path = new ApiPath('/secure/319985/r5.json');
      expect(path.matches('/secure/*/*')).toBe(true);
      expect(path.matches('/secure/*/r5.json')).toBe(true);
      expect(path.matches('/secure/319985/*.json')).toBe(true);
    });
  });

  describe('startsWith', () => {
    it('should check if path starts with prefix', () => {
      const path = new ApiPath('/api/v1/users');
      expect(path.startsWith('/api')).toBe(true);
      expect(path.startsWith('/api/v1')).toBe(true);
      expect(path.startsWith('/api/v1/users')).toBe(true);
      expect(path.startsWith('/api/v2')).toBe(false);
      expect(path.startsWith('/admin')).toBe(false);
    });
  });

  describe('equals', () => {
    it('should compare paths for equality', () => {
      const path1 = new ApiPath('/api/users');
      const path2 = new ApiPath('/api/users');
      const path3 = new ApiPath('/api/posts');
      
      expect(path1.equals(path2)).toBe(true);
      expect(path1.equals(path3)).toBe(false);
    });

    it('should handle normalized paths', () => {
      const path1 = new ApiPath('/api/users/');
      const path2 = new ApiPath('api/users');
      expect(path1.equals(path2)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return the path value', () => {
      const path = new ApiPath('/api/users');
      expect(path.toString()).toBe('/api/users');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const path = new ApiPath('/api/users');
      expect(path.toJSON()).toBe('/api/users');
      expect(JSON.stringify(path)).toBe('"/api/users"');
    });

    it('should deserialize from JSON', () => {
      const original = new ApiPath('/api/users');
      const json = original.toJSON();
      const restored = ApiPath.fromJSON(json);
      
      expect(restored.equals(original)).toBe(true);
      expect(restored.value).toBe(original.value);
    });
  });
});