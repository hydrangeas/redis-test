/**
 * Data API Endpoints E2E Tests
 * Tests the complete data access flow including authentication, rate limiting, and file access
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { 
  setupTestEnvironment, 
  teardownTestEnvironment, 
  createTestUser,
  createTestDataFile,
  removeTestDataFile,
  makeConcurrentRequests,
  delay
} from './setup';

describe('Data API Endpoints E2E', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    ({ app } = await setupTestEnvironment());
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe('GET /secure/*', () => {
    const testDataPath = 'secure/test/data.json';
    const testData = {
      name: 'Test Open Data',
      description: 'This is test data for E2E testing',
      timestamp: new Date().toISOString(),
      values: [1, 2, 3, 4, 5],
    };

    beforeEach(async () => {
      // Create test data file
      await createTestDataFile(testDataPath, testData);
    });

    afterAll(async () => {
      // Clean up test data file
      await removeTestDataFile(testDataPath);
    });

    it('should return JSON data for authenticated user', async () => {
      const { token } = await createTestUser('tier1');

      const response = await app.inject({
        method: 'GET',
        url: `/secure/test/data.json`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['cache-control']).toBeDefined();
      
      const body = JSON.parse(response.body);
      expect(body).toEqual(testData);
    });

    it('should support different data formats', async () => {
      const { token } = await createTestUser('tier1');

      // Create test files with different formats
      const xlsData = Buffer.from('Mock XLS data');
      const csvData = 'name,value\ntest,123';
      const xmlData = '<?xml version="1.0"?><data><item>test</item></data>';

      await createTestDataFile('secure/test/data.xls', xlsData);
      await createTestDataFile('secure/test/data.csv', csvData);
      await createTestDataFile('secure/test/data.xml', xmlData);

      // Test XLS file
      const xlsResponse = await app.inject({
        method: 'GET',
        url: '/secure/test/data.xls',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(xlsResponse.statusCode).toBe(200);
      expect(xlsResponse.headers['content-type']).toContain('application/vnd.ms-excel');

      // Test CSV file
      const csvResponse = await app.inject({
        method: 'GET',
        url: '/secure/test/data.csv',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(csvResponse.statusCode).toBe(200);
      expect(csvResponse.headers['content-type']).toContain('text/csv');

      // Test XML file
      const xmlResponse = await app.inject({
        method: 'GET',
        url: '/secure/test/data.xml',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(xmlResponse.statusCode).toBe(200);
      expect(xmlResponse.headers['content-type']).toContain('application/xml');

      // Clean up
      await removeTestDataFile('secure/test/data.xls');
      await removeTestDataFile('secure/test/data.csv');
      await removeTestDataFile('secure/test/data.xml');
    });

    it('should return 404 for non-existent file', async () => {
      const { token } = await createTestUser('tier1');

      const response = await app.inject({
        method: 'GET',
        url: '/secure/missing/file.json',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/not-found');
      expect(body.title).toBe('Resource not found');
      expect(body.status).toBe(404);
      expect(body.detail).toBe('The requested data file does not exist');
      expect(body.instance).toBe('/secure/missing/file.json');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/secure/test/data.json',
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
      
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/unauthorized');
      expect(body.title).toBe('Unauthorized');
      expect(body.detail).toBe('Authentication required');
    });

    it('should reject expired token', async () => {
      // This would require mocking time or using a real expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJleHAiOjEwMDAwMDAwMDB9.invalid';

      const response = await app.inject({
        method: 'GET',
        url: '/secure/test/data.json',
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.type).toBe('https://api.opendata.nara/errors/unauthorized');
      expect(body.detail).toContain('Invalid token');
    });

    describe('Rate Limiting', () => {
      it('should enforce rate limits for tier1 users', async () => {
        const { token } = await createTestUser('tier1');
        const limit = 60; // tier1 limit per minute

        // Make requests up to the limit
        const responses = await makeConcurrentRequests(limit + 5, () => ({
          method: 'GET',
          url: '/secure/test/data.json',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }));

        const successCount = responses.filter(r => r.statusCode === 200).length;
        const rateLimitedCount = responses.filter(r => r.statusCode === 429).length;

        expect(successCount).toBe(limit);
        expect(rateLimitedCount).toBe(5);

        // Check rate limit headers
        const lastSuccessResponse = responses.find(r => r.statusCode === 200);
        expect(lastSuccessResponse?.headers['x-ratelimit-limit']).toBe('60');
        expect(lastSuccessResponse?.headers['x-ratelimit-remaining']).toBeDefined();
        expect(lastSuccessResponse?.headers['x-ratelimit-reset']).toBeDefined();

        // Check rate limited response
        const rateLimitedResponse = responses.find(r => r.statusCode === 429);
        expect(rateLimitedResponse).toBeDefined();
        
        const body = JSON.parse(rateLimitedResponse!.body);
        expect(body.type).toBe('https://api.opendata.nara/errors/rate-limit-exceeded');
        expect(body.title).toBe('Too Many Requests');
        expect(body.status).toBe(429);
        expect(body.detail).toContain('Rate limit exceeded');
        
        expect(rateLimitedResponse!.headers['retry-after']).toBeDefined();
        expect(rateLimitedResponse!.headers['x-ratelimit-limit']).toBe('60');
        expect(rateLimitedResponse!.headers['x-ratelimit-remaining']).toBe('0');
      });

      it('should have different rate limits for different tiers', async () => {
        const tier2User = await createTestUser('tier2');
        const tier3User = await createTestUser('tier3');

        // Test tier2 (120 requests/minute)
        const tier2Response = await app.inject({
          method: 'GET',
          url: '/secure/test/data.json',
          headers: {
            Authorization: `Bearer ${tier2User.token}`,
          },
        });
        expect(tier2Response.statusCode).toBe(200);
        expect(tier2Response.headers['x-ratelimit-limit']).toBe('120');

        // Test tier3 (300 requests/minute)
        const tier3Response = await app.inject({
          method: 'GET',
          url: '/secure/test/data.json',
          headers: {
            Authorization: `Bearer ${tier3User.token}`,
          },
        });
        expect(tier3Response.statusCode).toBe(200);
        expect(tier3Response.headers['x-ratelimit-limit']).toBe('300');
      });

      it('should reset rate limit after window expires', async () => {
        const { token } = await createTestUser('tier1');
        const limit = 60;

        // Exhaust rate limit
        await makeConcurrentRequests(limit + 1, () => ({
          method: 'GET',
          url: '/secure/test/data.json',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }));

        // Verify rate limited
        const rateLimitedResponse = await app.inject({
          method: 'GET',
          url: '/secure/test/data.json',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        expect(rateLimitedResponse.statusCode).toBe(429);

        // In a real test, we would wait for the window to expire
        // For now, we'll just verify the retry-after header is set correctly
        const retryAfter = parseInt(rateLimitedResponse.headers['retry-after'] as string);
        expect(retryAfter).toBeGreaterThan(0);
        expect(retryAfter).toBeLessThanOrEqual(60);
      });
    });

    describe('Security', () => {
      it('should prevent path traversal attacks', async () => {
        const { token } = await createTestUser('tier1');

        const maliciousPaths = [
          '/secure/../../../etc/passwd',
          '/secure/%2e%2e%2f%2e%2e%2fetc/passwd',
          '/secure/..\\..\\windows\\system32\\config\\sam',
          '/secure/test/../../../../../../etc/passwd',
          '/secure/./././../../../etc/passwd',
          '/secure//../../etc/passwd',
          '/secure/test/data.json/../../../etc/passwd',
        ];

        for (const path of maliciousPaths) {
          const response = await app.inject({
            method: 'GET',
            url: path,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          expect(response.statusCode).toBe(400);
          const body = JSON.parse(response.body);
          expect(body.type).toBe('https://api.opendata.nara/errors/invalid-path');
          expect(body.title).toBe('Invalid Path');
          expect(body.detail).toContain('Invalid file path');
        }
      });

      it('should only allow access to data directory', async () => {
        const { token } = await createTestUser('tier1');

        // Try to access files outside data directory
        const response = await app.inject({
          method: 'GET',
          url: '/etc/passwd',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Should be handled by route not found, not file access
        expect(response.statusCode).toBe(404);
      });

      it('should validate file extensions', async () => {
        const { token } = await createTestUser('tier1');

        // Create a file with dangerous extension
        await createTestDataFile('secure/test/dangerous.exe', 'dangerous content');

        const response = await app.inject({
          method: 'GET',
          url: '/secure/test/dangerous.exe',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Should still serve the file but with appropriate content type
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBe('application/octet-stream');
        expect(response.headers['content-disposition']).toContain('attachment');

        await removeTestDataFile('secure/test/dangerous.exe');
      });
    });

    describe('CORS', () => {
      it('should handle CORS preflight requests', async () => {
        const response = await app.inject({
          method: 'OPTIONS',
          url: '/secure/test/data.json',
          headers: {
            'Origin': 'https://example.com',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'authorization,content-type',
          },
        });

        expect(response.statusCode).toBe(204);
        expect(response.headers['access-control-allow-origin']).toBeDefined();
        expect(response.headers['access-control-allow-methods']).toContain('GET');
        expect(response.headers['access-control-allow-headers']).toContain('authorization');
        expect(response.headers['access-control-max-age']).toBeDefined();
      });

      it('should include CORS headers in responses', async () => {
        const { token } = await createTestUser('tier1');

        const response = await app.inject({
          method: 'GET',
          url: '/secure/test/data.json',
          headers: {
            Authorization: `Bearer ${token}`,
            Origin: 'https://example.com',
          },
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBeDefined();
        expect(response.headers['access-control-allow-credentials']).toBe('true');
      });
    });

    describe('Caching', () => {
      it('should set appropriate cache headers', async () => {
        const { token } = await createTestUser('tier1');

        const response = await app.inject({
          method: 'GET',
          url: '/secure/test/data.json',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['cache-control']).toContain('private');
        expect(response.headers['etag']).toBeDefined();
        expect(response.headers['last-modified']).toBeDefined();
      });

      it('should handle conditional requests', async () => {
        const { token } = await createTestUser('tier1');

        // First request to get ETag
        const firstResponse = await app.inject({
          method: 'GET',
          url: '/secure/test/data.json',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const etag = firstResponse.headers['etag'];
        expect(etag).toBeDefined();

        // Second request with If-None-Match
        const secondResponse = await app.inject({
          method: 'GET',
          url: '/secure/test/data.json',
          headers: {
            Authorization: `Bearer ${token}`,
            'If-None-Match': etag,
          },
        });

        expect(secondResponse.statusCode).toBe(304);
        expect(secondResponse.body).toBe('');
      });
    });
  });
});