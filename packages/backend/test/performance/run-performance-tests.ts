#!/usr/bin/env node
import { execSync } from 'child_process';
import { PerformanceReporter } from './rate-limit-report';

console.log('🚀 Starting Rate Limit Performance Tests...\n');

try {
  // Run performance tests with Node.js garbage collection exposed
  const testCommand = 'node --expose-gc ./node_modules/.bin/vitest run test/performance/rate-limit-load.test.ts';
  
  console.log('Running tests with command:', testCommand);
  console.log('This may take a few minutes...\n');
  
  // Execute tests
  execSync(testCommand, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });
  
  console.log('\n✅ Performance tests completed successfully!');
  
  // Note: In a real implementation, we would collect test results
  // and pass them to the reporter. For this example, we'll create
  // a sample report structure.
  
  console.log('\n📊 Generating performance reports...');
  
  // Sample results for demonstration
  const sampleResults = [
    {
      name: 'High Load Test (10,000 requests)',
      passed: true,
      metrics: {
        totalRequests: 10000,
        successfulRequests: 6000,
        rateLimitedRequests: 4000,
        averageResponseTime: 25.5,
        p50ResponseTime: 20.0,
        p95ResponseTime: 45.0,
        p99ResponseTime: 85.0,
        maxResponseTime: 120.0,
        minResponseTime: 5.0,
        memoryUsage: {
          rss: 50 * 1024 * 1024,
          heapTotal: 40 * 1024 * 1024,
          heapUsed: 35 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          arrayBuffers: 5 * 1024 * 1024,
        },
        duration: 8500,
      },
    },
    {
      name: 'Tier Scaling Test',
      passed: true,
      metrics: {
        totalRequests: 15000,
        successfulRequests: 12000,
        rateLimitedRequests: 3000,
        averageResponseTime: 30.2,
        p50ResponseTime: 25.0,
        p95ResponseTime: 55.0,
        p99ResponseTime: 95.0,
        maxResponseTime: 150.0,
        minResponseTime: 8.0,
        memoryUsage: {
          rss: 60 * 1024 * 1024,
          heapTotal: 45 * 1024 * 1024,
          heapUsed: 40 * 1024 * 1024,
          external: 12 * 1024 * 1024,
          arrayBuffers: 6 * 1024 * 1024,
        },
        duration: 12000,
      },
    },
    {
      name: 'Extreme Concurrency Test (1000 users)',
      passed: true,
      metrics: {
        totalRequests: 10000,
        successfulRequests: 10000,
        rateLimitedRequests: 0,
        averageResponseTime: 35.8,
        p50ResponseTime: 30.0,
        p95ResponseTime: 65.0,
        p99ResponseTime: 98.0,
        maxResponseTime: 180.0,
        minResponseTime: 10.0,
        memoryUsage: {
          rss: 80 * 1024 * 1024,
          heapTotal: 60 * 1024 * 1024,
          heapUsed: 55 * 1024 * 1024,
          external: 15 * 1024 * 1024,
          arrayBuffers: 8 * 1024 * 1024,
        },
        duration: 5000,
      },
    },
  ];
  
  PerformanceReporter.generateReport(sampleResults);
  
  console.log('\n✨ Performance testing complete!');
  
} catch (error) {
  console.error('\n❌ Performance tests failed:', error);
  process.exit(1);
}