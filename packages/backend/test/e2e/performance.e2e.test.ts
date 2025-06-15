/**
 * Performance E2E Tests
 * Tests the application's performance under various load conditions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { 
  setupTestEnvironment, 
  teardownTestEnvironment, 
  createTestUser,
  createTestDataFile,
  removeTestDataFile,
  makeConcurrentRequests
} from './setup';

describe('Performance E2E Tests', () => {
  let app: FastifyInstance;
  const testDataPath = 'secure/performance/test.json';
  const testData = { 
    test: 'performance', 
    data: Array(100).fill(0).map((_, i) => ({ id: i, value: Math.random() })) 
  };

  beforeAll(async () => {
    ({ app } = await setupTestEnvironment());
    await createTestDataFile(testDataPath, testData);
  });

  afterAll(async () => {
    await removeTestDataFile(testDataPath);
    await teardownTestEnvironment();
  });

  it('should handle concurrent requests efficiently', async () => {
    const users = await Promise.all([
      createTestUser('tier1'),
      createTestUser('tier2'),
      createTestUser('tier3'),
    ]);

    const startTime = Date.now();
    const concurrentRequests = 100;

    const responses = await makeConcurrentRequests(concurrentRequests, (index) => ({
      method: 'GET',
      url: '/health',
      headers: {
        Authorization: `Bearer ${users[index % 3].token}`,
      },
    }));

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // All requests should succeed
    const successCount = responses.filter(r => r.statusCode === 200).length;
    expect(successCount).toBe(concurrentRequests);

    // Total time should be reasonable (5 seconds for 100 requests)
    expect(totalTime).toBeLessThan(5000);

    // Calculate average response time
    const avgResponseTime = totalTime / concurrentRequests;
    expect(avgResponseTime).toBeLessThan(50); // Average should be under 50ms

    // Check response time consistency
    const responseTimes = responses.map(r => 
      parseInt(r.headers['x-response-time'] || '0')
    ).filter(t => t > 0);

    if (responseTimes.length > 0) {
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      // Response times should be relatively consistent
      expect(maxResponseTime).toBeLessThan(minResponseTime * 10);
    }
  });

  it('should handle burst traffic gracefully', async () => {
    const { token } = await createTestUser('tier3'); // Use tier3 for higher limits
    const burstSize = 50;

    // Send burst of requests
    const startTime = Date.now();
    const responses = await makeConcurrentRequests(burstSize, () => ({
      method: 'GET',
      url: `/secure/performance/test.json`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }));
    const burstTime = Date.now() - startTime;

    // All requests should complete
    expect(responses.length).toBe(burstSize);

    // Most requests should succeed (tier3 has 300/min limit)
    const successCount = responses.filter(r => r.statusCode === 200).length;
    expect(successCount).toBe(burstSize);

    // Burst should complete quickly (under 2 seconds)
    expect(burstTime).toBeLessThan(2000);

    // Check memory usage didn't spike excessively
    const healthResponse = await app.inject({
      method: 'GET',
      url: '/health',
    });
    
    const health = JSON.parse(healthResponse.body);
    if (health.metrics?.memory) {
      expect(health.metrics.memory.percentage).toBeLessThan(90);
    }
  });

  it('should maintain performance with large payloads', async () => {
    const { token } = await createTestUser('tier2');
    
    // Create a larger test file (1MB)
    const largeData = {
      items: Array(10000).fill(0).map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        values: Array(10).fill(0).map(() => Math.random()),
      })),
    };
    
    await createTestDataFile('secure/performance/large.json', largeData);

    const startTime = Date.now();
    const response = await app.inject({
      method: 'GET',
      url: '/secure/performance/large.json',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const responseTime = Date.now() - startTime;

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    
    // Large file should still be served quickly (under 500ms)
    expect(responseTime).toBeLessThan(500);

    // Verify content integrity
    const responseData = JSON.parse(response.body);
    expect(responseData.items.length).toBe(10000);

    await removeTestDataFile('secure/performance/large.json');
  });

  it('should handle mixed traffic patterns efficiently', async () => {
    const users = await Promise.all([
      createTestUser('tier1'),
      createTestUser('tier2'),
      createTestUser('tier3'),
    ]);

    const totalRequests = 150;
    const startTime = Date.now();

    // Mix of different endpoints and operations
    const requests = [];
    for (let i = 0; i < totalRequests; i++) {
      const user = users[i % 3];
      
      if (i % 5 === 0) {
        // Health check (no auth needed)
        requests.push(app.inject({
          method: 'GET',
          url: '/health',
        }));
      } else if (i % 5 === 1) {
        // Auth check
        requests.push(app.inject({
          method: 'GET',
          url: '/auth/me',
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }));
      } else if (i % 5 === 2) {
        // Data API
        requests.push(app.inject({
          method: 'GET',
          url: '/secure/performance/test.json',
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }));
      } else if (i % 5 === 3) {
        // API docs
        requests.push(app.inject({
          method: 'GET',
          url: '/api-docs/json',
        }));
      } else {
        // 404 requests
        requests.push(app.inject({
          method: 'GET',
          url: `/secure/missing-${i}.json`,
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }));
      }
    }

    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;

    // Check response distribution
    const statusCodes = responses.reduce((acc, r) => {
      acc[r.statusCode] = (acc[r.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Verify expected status codes
    expect(statusCodes[200]).toBeGreaterThan(0); // Successful requests
    expect(statusCodes[404]).toBeGreaterThan(0); // Not found requests
    
    // All requests should complete within 10 seconds
    expect(totalTime).toBeLessThan(10000);

    // Average response time should remain low despite mixed traffic
    const avgResponseTime = totalTime / totalRequests;
    expect(avgResponseTime).toBeLessThan(100);
  });

  it('should recover from rate limit exhaustion', async () => {
    const { token, user } = await createTestUser('tier1');
    const limit = 60; // tier1 limit

    // Exhaust rate limit
    await makeConcurrentRequests(limit, () => ({
      method: 'GET',
      url: '/secure/performance/test.json',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }));

    // Verify rate limited
    const rateLimitedResponse = await app.inject({
      method: 'GET',
      url: '/secure/performance/test.json',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(rateLimitedResponse.statusCode).toBe(429);

    // Make requests with different users to ensure system still responsive
    const otherUser = await createTestUser('tier2');
    const otherUserResponse = await app.inject({
      method: 'GET',
      url: '/secure/performance/test.json',
      headers: {
        Authorization: `Bearer ${otherUser.token}`,
      },
    });
    expect(otherUserResponse.statusCode).toBe(200);

    // Health check should still work
    const healthResponse = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(healthResponse.statusCode).toBe(200);
  });

  it('should maintain consistent performance over time', async () => {
    const { token } = await createTestUser('tier3');
    const iterations = 5;
    const requestsPerIteration = 20;
    const iterationTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      const responses = await makeConcurrentRequests(requestsPerIteration, () => ({
        method: 'GET',
        url: '/secure/performance/test.json',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }));

      const iterationTime = Date.now() - startTime;
      iterationTimes.push(iterationTime);

      // All requests should succeed
      const successCount = responses.filter(r => r.statusCode === 200).length;
      expect(successCount).toBe(requestsPerIteration);

      // Brief pause between iterations
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate standard deviation to check consistency
    const avgTime = iterationTimes.reduce((a, b) => a + b) / iterations;
    const variance = iterationTimes.reduce((acc, time) => {
      return acc + Math.pow(time - avgTime, 2);
    }, 0) / iterations;
    const stdDev = Math.sqrt(variance);

    // Standard deviation should be low (consistent performance)
    expect(stdDev).toBeLessThan(avgTime * 0.3); // Within 30% of average

    // No iteration should be significantly slower
    const maxTime = Math.max(...iterationTimes);
    expect(maxTime).toBeLessThan(avgTime * 1.5); // No more than 50% slower than average
  });

  it('should handle database connection pool efficiently', async () => {
    // Create multiple users to generate auth logs
    const users = await Promise.all(
      Array(10).fill(0).map(() => createTestUser('tier2'))
    );

    // Make concurrent authenticated requests that hit the database
    const responses = await makeConcurrentRequests(50, (index) => ({
      method: 'GET',
      url: '/auth/me',
      headers: {
        Authorization: `Bearer ${users[index % 10].token}`,
      },
    }));

    // All requests should succeed
    const successCount = responses.filter(r => r.statusCode === 200).length;
    expect(successCount).toBe(50);

    // Check that database is still healthy
    const healthResponse = await app.inject({
      method: 'GET',
      url: '/health',
    });
    
    const health = JSON.parse(healthResponse.body);
    expect(health.services.database.status).toBe('healthy');
    expect(health.services.database.responseTime).toBeLessThan(100);
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory under sustained load', async function() {
      // Skip in CI environments with limited resources
      if (process.env.CI) {
        this.skip();
      }

      const { token } = await createTestUser('tier3');
      const iterations = 10;
      const requestsPerIteration = 50;

      // Get initial memory usage
      const initialHealthResponse = await app.inject({
        method: 'GET',
        url: '/health',
      });
      const initialHealth = JSON.parse(initialHealthResponse.body);
      const initialMemory = initialHealth.metrics?.memory?.used || 0;

      // Apply sustained load
      for (let i = 0; i < iterations; i++) {
        await makeConcurrentRequests(requestsPerIteration, () => ({
          method: 'GET',
          url: '/secure/performance/test.json',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }));

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check final memory usage
      const finalHealthResponse = await app.inject({
        method: 'GET',
        url: '/health',
      });
      const finalHealth = JSON.parse(finalHealthResponse.body);
      const finalMemory = finalHealth.metrics?.memory?.used || 0;

      // Memory increase should be reasonable (less than 50MB)
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});