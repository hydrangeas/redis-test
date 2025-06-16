import { performance } from 'perf_hooks';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { AuthenticatedUser } from '@/domain/auth/value-objects/authenticated-user';
import { UserId } from '@/domain/auth/value-objects/user-id';
import { UserTier } from '@/domain/auth/value-objects/user-tier';
import { Endpoint as APIEndpoint } from '@/domain/api/value-objects/endpoint';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { InMemoryRateLimitService } from '@/infrastructure/services/in-memory-rate-limit.service';
import { v4 as uuidv4 } from 'uuid';

export interface LoadTestConfig {
  concurrentUsers: number;
  requestsPerUser: number;
  userTier: TierLevel;
  endpoint: string;
}

export interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  duration: number; // milliseconds
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
}

export class RateLimitPerformanceTester {
  constructor(private rateLimitService: InMemoryRateLimitService) {}

  async runLoadTest(config: LoadTestConfig): Promise<PerformanceMetrics> {
    const { concurrentUsers, requestsPerUser, userTier, endpoint } = config;
    const totalRequests = concurrentUsers * requestsPerUser;

    // Create endpoint
    const endpointObj = APIEndpoint.fromString(`GET ${endpoint}`);

    // Create users
    const users = Array.from({ length: concurrentUsers }, (_, i) => {
      return AuthenticatedUser.fromTokenPayload(uuidv4(), userTier);
    });

    // Metrics collection
    const responseTimes: number[] = [];
    let successfulRequests = 0;
    let rateLimitedRequests = 0;

    // Capture initial memory
    const initialMemory = process.memoryUsage();
    const startTime = performance.now();

    // Run concurrent load test
    const userPromises = users.map(async (user) => {
      const userResponseTimes: number[] = [];

      for (let i = 0; i < requestsPerUser; i++) {
        const reqStartTime = performance.now();

        try {
          // Check rate limit
          const checkResult = await this.rateLimitService.checkLimit(user, endpointObj);

          if (checkResult.allowed) {
            // Record usage only if allowed
            await this.rateLimitService.recordUsage(user, endpointObj);
            successfulRequests++;
          } else {
            rateLimitedRequests++;
          }
        } catch (error) {
          // Count errors as rate limited for simplicity
          rateLimitedRequests++;
        }

        const reqEndTime = performance.now();
        const responseTime = reqEndTime - reqStartTime;
        userResponseTimes.push(responseTime);
      }

      return userResponseTimes;
    });

    // Wait for all users to complete
    const allResponseTimes = await Promise.all(userPromises);

    // Flatten response times
    allResponseTimes.forEach((userTimes) => {
      responseTimes.push(...userTimes);
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Capture final memory
    const finalMemory = process.memoryUsage();

    // Calculate metrics
    const sortedResponseTimes = responseTimes.sort((a, b) => a - b);

    return {
      totalRequests,
      successfulRequests,
      rateLimitedRequests,
      duration,
      averageResponseTime: this.calculateAverage(responseTimes),
      minResponseTime: sortedResponseTimes[0] || 0,
      maxResponseTime: sortedResponseTimes[sortedResponseTimes.length - 1] || 0,
      p50ResponseTime: this.calculatePercentile(sortedResponseTimes, 0.5),
      p95ResponseTime: this.calculatePercentile(sortedResponseTimes, 0.95),
      p99ResponseTime: this.calculatePercentile(sortedResponseTimes, 0.99),
      throughput: totalRequests / (duration / 1000),
      memoryUsage: {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal,
        rss: finalMemory.rss,
      },
    };
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  async runConcurrentRequests(
    users: AuthenticatedUser[],
    endpoint: Endpoint,
    requestsPerUser: number,
  ): Promise<{ successCount: number; failureCount: number; responseTimes: number[] }> {
    let successCount = 0;
    let failureCount = 0;
    const responseTimes: number[] = [];

    const promises = users.map(async (user) => {
      for (let i = 0; i < requestsPerUser; i++) {
        const startTime = performance.now();

        const checkResult = await this.rateLimitService.checkLimit(user, endpoint);

        if (checkResult.allowed) {
          await this.rateLimitService.recordUsage(user, endpoint);
          successCount++;
        } else {
          failureCount++;
        }

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }
    });

    await Promise.all(promises);

    return { successCount, failureCount, responseTimes };
  }
}
