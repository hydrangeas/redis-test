import { describe, it, expect, beforeEach } from 'vitest';
import { APIEndpoint } from '../../value-objects/api-endpoint';
import { EndpointPath } from '../../value-objects/endpoint-path';
import { HttpMethod } from '../../value-objects/http-method';
import { EndpointType } from '../../value-objects/endpoint-type';
import { EndpointId } from '../../value-objects/endpoint-id';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';

describe('APIEndpoint', () => {
  let endpoint: APIEndpoint;

  beforeEach(() => {
    const pathResult = EndpointPath.create('/api/data/*');
    const typeResult = EndpointType.create('protected');

    const endpointResult = APIEndpoint.create({
      path: pathResult.getValue(),
      method: HttpMethod.GET,
      type: typeResult.getValue(),
      isActive: true,
    });

    endpoint = endpointResult.getValue();
  });

  describe('create', () => {
    it('should create an endpoint with valid props', () => {
      const pathResult = EndpointPath.create('/api/test');
      const typeResult = EndpointType.create('public');

      const result = APIEndpoint.create({
        path: pathResult.getValue(),
        method: HttpMethod.POST,
        type: typeResult.getValue(),
        description: 'Test endpoint',
        isActive: true,
      });

      expect(result.isSuccess).toBe(true);
      const endpoint = result.getValue();
      expect(endpoint.path.value).toBe('/api/test');
      expect(endpoint.method).toBe(HttpMethod.POST);
      expect(endpoint.type.value).toBe('public');
      expect(endpoint.isPublic).toBe(true);
      expect(endpoint.isActive).toBe(true);
    });

    // Test for custom id removed - APIEndpoint is a value object without identity
  });

  describe('path matching', () => {
    it('should match wildcard patterns', () => {
      const testPath = EndpointPath.create('/api/data/test.json').getValue();
      expect(endpoint.matchesPath(testPath)).toBe(true);

      const nonMatchingPath = EndpointPath.create('/api/other/test.json').getValue();
      expect(endpoint.matchesPath(nonMatchingPath)).toBe(false);
    });

    it('should match exact paths', () => {
      const exactEndpoint = APIEndpoint.create({
        path: EndpointPath.create('/api/health').getValue(),
        method: HttpMethod.GET,
        type: EndpointType.create('public').getValue(),
        isActive: true,
      }).getValue();

      const exactPath = EndpointPath.create('/api/health').getValue();
      expect(exactEndpoint.matchesPath(exactPath)).toBe(true);

      const differentPath = EndpointPath.create('/api/health/check').getValue();
      expect(exactEndpoint.matchesPath(differentPath)).toBe(false);
    });
  });

  // Rate limiting tests removed - now handled by RateLimiting aggregate

  // Activation/deactivation tests removed - APIEndpoint is now an immutable value object

  // Reconstitute tests removed - APIEndpoint is now an immutable value object created via factory

  // Edge cases removed - rate limiting now handled by RateLimiting aggregate
});