import { describe, it, expect } from 'vitest';
import { EndpointPath } from '../endpoint-path';

describe('EndpointPath', () => {
  describe('create', () => {
    it('should create a valid endpoint path', () => {
      const result = EndpointPath.create('/api/users');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('/api/users');
    });

    it('should fail when path is empty', () => {
      const result = EndpointPath.create('');
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Endpoint path is required');
    });

    it('should fail when path does not start with /', () => {
      const result = EndpointPath.create('api/users');
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Endpoint path must start with /');
    });

    it('should fail with invalid characters', () => {
      const result = EndpointPath.create('/api/users?query=test');
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('Invalid endpoint path format');
    });

    it('should accept paths with wildcards', () => {
      const result = EndpointPath.create('/api/data/*');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('/api/data/*');
    });

    it('should accept paths with parameters', () => {
      const result = EndpointPath.create('/api/users/:id');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('/api/users/:id');
    });

    it('should accept paths with dots', () => {
      const result = EndpointPath.create('/api/file.json');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe('/api/file.json');
    });
  });

  describe('pattern matching', () => {
    it('should match exact paths', () => {
      const path = EndpointPath.create('/api/users').getValue();
      expect(path.matches('/api/users')).toBe(true);
      expect(path.matches('/api/users/')).toBe(false);
      expect(path.matches('/api/other')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      const path = EndpointPath.create('/api/data/*').getValue();
      expect(path.matches('/api/data/file.json')).toBe(true);
      expect(path.matches('/api/data/path/to/file.json')).toBe(true);
      expect(path.matches('/api/other/file.json')).toBe(false);
      expect(path.matches('/api/data')).toBe(false);
    });

    it('should match parameter patterns', () => {
      const path = EndpointPath.create('/api/users/:id').getValue();
      expect(path.matches('/api/users/123')).toBe(true);
      expect(path.matches('/api/users/abc-def')).toBe(true);
      expect(path.matches('/api/users/')).toBe(false);
      expect(path.matches('/api/users/123/posts')).toBe(false);
    });

    it('should match complex patterns', () => {
      const path = EndpointPath.create('/api/:version/users/:id/*').getValue();
      expect(path.matches('/api/v1/users/123/posts')).toBe(true);
      expect(path.matches('/api/v2/users/456/comments/789')).toBe(true);
      expect(path.matches('/api/users/123/posts')).toBe(false);
    });

    it('should handle special characters correctly', () => {
      const path = EndpointPath.create('/api/file.json').getValue();
      expect(path.matches('/api/file.json')).toBe(true);
      expect(path.matches('/api/fileXjson')).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same paths', () => {
      const path1 = EndpointPath.create('/api/users').getValue();
      const path2 = EndpointPath.create('/api/users').getValue();
      expect(path1.equals(path2)).toBe(true);
    });

    it('should return false for different paths', () => {
      const path1 = EndpointPath.create('/api/users').getValue();
      const path2 = EndpointPath.create('/api/posts').getValue();
      expect(path1.equals(path2)).toBe(false);
    });

    it('should return false for null', () => {
      const path = EndpointPath.create('/api/users').getValue();
      expect(path.equals(null as any)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the path value', () => {
      const path = EndpointPath.create('/api/users/:id').getValue();
      expect(path.toString()).toBe('/api/users/:id');
    });
  });
});