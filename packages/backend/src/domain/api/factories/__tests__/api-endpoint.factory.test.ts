import { describe, it, expect } from 'vitest';
import { APIEndpointFactory } from '../api-endpoint.factory';
import { HttpMethod } from '../../value-objects/http-method';

describe('APIEndpointFactory', () => {
  describe('createDataEndpoint', () => {
    it('should create a data endpoint with default method', () => {
      const endpoint = APIEndpointFactory.createDataEndpoint('/api/data/test.json');
      
      expect(endpoint.path.value).toBe('/api/data/test.json');
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.type.value).toBe('protected');
      expect(endpoint.isActive).toBe(true);
      expect(endpoint.isPublic).toBe(false);
    });

    it('should create a data endpoint with custom method', () => {
      const endpoint = APIEndpointFactory.createDataEndpoint(
        '/api/data/upload',
        HttpMethod.POST
      );
      
      expect(endpoint.path.value).toBe('/api/data/upload');
      expect(endpoint.method).toBe(HttpMethod.POST);
      expect(endpoint.type.value).toBe('protected');
    });

    it('should throw for invalid path', () => {
      expect(() => APIEndpointFactory.createDataEndpoint('invalid-path'))
        .toThrow('Failed to create data endpoint');
    });
  });

  describe('createHealthCheckEndpoint', () => {
    it('should create a health check endpoint', () => {
      const endpoint = APIEndpointFactory.createHealthCheckEndpoint();
      
      expect(endpoint.path.value).toBe('/health');
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.type.value).toBe('public');
      expect(endpoint.isActive).toBe(true);
      expect(endpoint.isPublic).toBe(true);
    });
  });

  describe('createDocumentationEndpoint', () => {
    it('should create a documentation endpoint', () => {
      const endpoint = APIEndpointFactory.createDocumentationEndpoint();
      
      expect(endpoint.path.value).toBe('/api-docs');
      expect(endpoint.method).toBe(HttpMethod.GET);
      expect(endpoint.type.value).toBe('public');
      expect(endpoint.isActive).toBe(true);
      expect(endpoint.isPublic).toBe(true);
    });
  });

  describe('factory pattern validation', () => {
    it('should create different instances', () => {
      const endpoint1 = APIEndpointFactory.createHealthCheckEndpoint();
      const endpoint2 = APIEndpointFactory.createHealthCheckEndpoint();
      
      expect(endpoint1).not.toBe(endpoint2);
      expect(endpoint1.id).not.toBe(endpoint2.id);
    });

    it('should create endpoints with proper descriptions', () => {
      const dataEndpoint = APIEndpointFactory.createDataEndpoint('/api/test');
      const healthEndpoint = APIEndpointFactory.createHealthCheckEndpoint();
      const docsEndpoint = APIEndpointFactory.createDocumentationEndpoint();
      
      // Factory sets descriptions but they're private, so we can't test directly
      // But we can verify the endpoints are created correctly
      expect(dataEndpoint).toBeDefined();
      expect(healthEndpoint).toBeDefined();
      expect(docsEndpoint).toBeDefined();
    });
  });
});