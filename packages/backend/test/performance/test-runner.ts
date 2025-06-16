import { vi } from 'vitest';
import { InMemoryRateLimitService } from '@/infrastructure/services/in-memory-rate-limit.service';
import { RateLimitPerformanceTester } from './rate-limit-setup';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { Logger } from 'pino';

// Simple test runner for debugging
async function runSimpleTest() {
  console.log('Starting simple rate limit test...');

  // Mock logger
  const mockLogger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as any;

  // Create services
  const rateLimitService = new InMemoryRateLimitService(mockLogger);
  const tester = new RateLimitPerformanceTester(rateLimitService);

  try {
    // Run a simple test
    const metrics = await tester.runLoadTest({
      concurrentUsers: 10,
      requestsPerUser: 10,
      userTier: TierLevel.TIER1,
      endpoint: '/secure/test/data.json',
    });

    console.log('Test completed successfully!');
    console.log('Metrics:', {
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      rateLimitedRequests: metrics.rateLimitedRequests,
      avgResponseTime: metrics.averageResponseTime.toFixed(2) + 'ms',
      p99ResponseTime: metrics.p99ResponseTime.toFixed(2) + 'ms',
    });
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    rateLimitService.stop();
  }
}

// Run if called directly
if (require.main === module) {
  runSimpleTest();
}
