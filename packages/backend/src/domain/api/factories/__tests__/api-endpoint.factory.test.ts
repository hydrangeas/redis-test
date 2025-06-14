import { describe, it, expect } from 'vitest';
import { APIEndpointFactory } from '../api-endpoint.factory';
import { HttpMethod } from '../../value-objects/http-method';
import { EndpointPath } from '../../value-objects/endpoint-path';

describe('APIEndpointFactory', () => {
  describe('createDataEndpoint', () => {
    it('should create a protected data endpoint with default GET method', () => {
      const endpoint = APIEndpointFactory.createDataEndpoint('/api/data/test.json');
      
      expect(endpoint.path.value).toBe('/api/data/test.json');
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.type.value).toBe('protected');
      expect(endpoint.isActive).toBe(true);
      expect(endpoint.isPublic).toBe(false);
    });

    it('should create a data endpoint with custom HTTP method', () => {
      const endpoint = APIEndpointFactory.createDataEndpoint('/api/data/update', HttpMethod.POST);
      
      expect(endpoint.path.value).toBe('/api/data/update');
      expect(endpoint.method).toBe(HttpMethod.POST);
      expect(endpoint.type.value).toBe('protected');
    });

    it('should create a data endpoint with wildcard path', () => {
      const endpoint = APIEndpointFactory.createDataEndpoint('/secure/*/data/*');
      
      expect(endpoint.path.value).toBe('/secure/*/data/*');
      expect(endpoint.matchesPath).toBeDefined();
    });
  });

  describe('createHealthCheckEndpoint', () => {
    it('should create a public health check endpoint', () => {
      const endpoint = APIEndpointFactory.createHealthCheckEndpoint();
      
      expect(endpoint.path.value).toBe('/health');
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.type.value).toBe('public');
      expect(endpoint.isPublic).toBe(true);
      expect(endpoint.isActive).toBe(true);
    });
  });

  describe('createDocumentationEndpoint', () => {
    it('should create a public API documentation endpoint', () => {
      const endpoint = APIEndpointFactory.createDocumentationEndpoint();
      
      expect(endpoint.path.value).toBe('/api-docs');
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.type.value).toBe('public');
      expect(endpoint.isPublic).toBe(true);
      expect(endpoint.isActive).toBe(true);
    });
  });

  describe('createAuthEndpoint', () => {
    it('should create a public auth endpoint with default POST method', () => {
      const endpoint = APIEndpointFactory.createAuthEndpoint('login');
      
      expect(endpoint.path.value).toBe('/auth/login');
      expect(endpoint.method).toBe(HttpMethod.POST);
      expect(endpoint.type.value).toBe('public');
      expect(endpoint.isPublic).toBe(true);
    });

    it('should handle subpath with leading slash', () => {
      const endpoint = APIEndpointFactory.createAuthEndpoint('/refresh');
      
      expect(endpoint.path.value).toBe('/auth/refresh');
    });

    it('should create auth endpoint with custom method', () => {
      const endpoint = APIEndpointFactory.createAuthEndpoint('logout', HttpMethod.DELETE);
      
      expect(endpoint.path.value).toBe('/auth/logout');
      expect(endpoint.method).toBe(HttpMethod.DELETE);
    });
  });

  describe('createAdminEndpoint', () => {
    it('should create an admin endpoint with default GET method', () => {
      const endpoint = APIEndpointFactory.createAdminEndpoint('/admin/users');
      
      expect(endpoint.path.value).toBe('/admin/users');
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.type.value).toBe('admin');
      expect(endpoint.isPublic).toBe(false);
      expect(endpoint.isActive).toBe(true);
    });

    it('should create admin endpoint with custom method', () => {
      const endpoint = APIEndpointFactory.createAdminEndpoint('/admin/config', HttpMethod.PUT);
      
      expect(endpoint.path.value).toBe('/admin/config');
      expect(endpoint.method).toBe(HttpMethod.PUT);
      expect(endpoint.type.value).toBe('admin');
    });
  });

  describe('createPatternEndpoint', () => {
    it('should create a pattern endpoint with default protected type', () => {
      const endpoint = APIEndpointFactory.createPatternEndpoint('/api/v*/users/*');
      
      expect(endpoint.path.value).toBe('/api/v*/users/*');
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.type.value).toBe('protected');
      expect(endpoint.isActive).toBe(true);
    });

    it('should create pattern endpoint with custom method and type', () => {
      const endpoint = APIEndpointFactory.createPatternEndpoint(
        '/public/data/*',
        HttpMethod.GET,
        'public'
      );
      
      expect(endpoint.path.value).toBe('/public/data/*');
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.type.value).toBe('public');
      expect(endpoint.isPublic).toBe(true);
    });

    it('should create admin pattern endpoint', () => {
      const endpoint = APIEndpointFactory.createPatternEndpoint(
        '/admin/*/reports',
        HttpMethod.POST,
        'admin'
      );
      
      expect(endpoint.path.value).toBe('/admin/*/reports');
      expect(endpoint.method).toBe(HttpMethod.POST);
      expect(endpoint.type.value).toBe('admin');
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid path in data endpoint', () => {
      expect(() => {
        APIEndpointFactory.createDataEndpoint('');
      }).toThrow('Failed to create data endpoint');
    });

    it('should throw error for invalid path in auth endpoint', () => {
      expect(() => {
        APIEndpointFactory.createAuthEndpoint('');
      }).toThrow('Failed to create auth endpoint');
    });

    it('should throw error for invalid path in admin endpoint', () => {
      expect(() => {
        APIEndpointFactory.createAdminEndpoint('');
      }).toThrow('Failed to create admin endpoint');
    });

    it('should throw error for invalid pattern', () => {
      expect(() => {
        APIEndpointFactory.createPatternEndpoint('');
      }).toThrow('Failed to create pattern endpoint');
    });
  });

  describe('integration tests', () => {
    it('should create multiple endpoints for comprehensive API', () => {
      const endpoints = [
        APIEndpointFactory.createHealthCheckEndpoint(),
        APIEndpointFactory.createDocumentationEndpoint(),
        APIEndpointFactory.createAuthEndpoint('login'),
        APIEndpointFactory.createAuthEndpoint('logout', HttpMethod.POST),
        APIEndpointFactory.createAuthEndpoint('refresh', HttpMethod.POST),
        APIEndpointFactory.createDataEndpoint('/secure/*/data.json'),
        APIEndpointFactory.createAdminEndpoint('/admin/users', HttpMethod.GET),
        APIEndpointFactory.createAdminEndpoint('/admin/logs', HttpMethod.GET),
      ];
      
      expect(endpoints).toHaveLength(8);
      
      // Verify public endpoints
      const publicEndpoints = endpoints.filter(e => e.isPublic);
      expect(publicEndpoints).toHaveLength(5); // health, docs, and 3 auth endpoints
      
      // Verify protected endpoints
      const protectedEndpoints = endpoints.filter(e => e.type.value === 'protected');
      expect(protectedEndpoints).toHaveLength(1);
      
      // Verify admin endpoints
      const adminEndpoints = endpoints.filter(e => e.type.value === 'admin');
      expect(adminEndpoints).toHaveLength(2);
    });

    it('should create endpoints matching project requirements', () => {
      // プロジェクト要求仕様に基づくエンドポイント
      const dataEndpoint = APIEndpointFactory.createPatternEndpoint('/secure/*/*.json');
      const healthEndpoint = APIEndpointFactory.createHealthCheckEndpoint();
      const docsEndpoint = APIEndpointFactory.createDocumentationEndpoint();
      
      // データエンドポイントのマッチングテスト
      const testPath1 = EndpointPath.create('/secure/319985/r5.json');
      const testPath2 = EndpointPath.create('/secure/test/data.json');
      
      expect(testPath1.isSuccess).toBe(true);
      expect(testPath2.isSuccess).toBe(true);
      
      if (testPath1.isSuccess && testPath2.isSuccess) {
        expect(dataEndpoint.matchesPath(testPath1.getValue())).toBe(true);
        expect(dataEndpoint.matchesPath(testPath2.getValue())).toBe(true);
      }
      
      // ヘルスチェックとドキュメントは公開
      expect(healthEndpoint.isPublic).toBe(true);
      expect(docsEndpoint.isPublic).toBe(true);
    });
  });
});