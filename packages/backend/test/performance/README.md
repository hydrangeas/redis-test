# Rate Limit Performance Tests

This directory contains performance tests for the rate limiting functionality of the Open Data API.

## Overview

The performance tests verify that the rate limiting system:

- Handles high load (1000+ requests/second) accurately
- Maintains correct counting under extreme concurrency
- Has acceptable response times (P99 < 100ms)
- Doesn't have memory leaks
- Works correctly with different tier levels

## Test Structure

### Files

- `rate-limit-setup.ts` - Performance testing framework and metrics collection
- `rate-limit-load.test.ts` - Actual performance test scenarios
- `rate-limit-report.ts` - Report generation (HTML, JSON, Markdown)
- `run-performance-tests.ts` - Test runner script

### Test Scenarios

1. **High Load Test**

   - 100 concurrent users × 100 requests each = 10,000 total requests
   - Verifies rate limiting accuracy under high load
   - Measures response time percentiles

2. **Tier Scaling Test**

   - Tests different tier levels (TIER1, TIER2, TIER3)
   - Verifies each tier's rate limits are correctly enforced
   - Ensures performance is consistent across tiers

3. **Extreme Concurrency Test**

   - 1000 concurrent users making requests
   - Tests race condition handling
   - Verifies independent user counting

4. **Memory Usage Test**
   - Runs multiple iterations of load tests
   - Monitors memory usage growth
   - Ensures no memory leaks

## Running the Tests

### Quick Run

```bash
npm run test:performance
```

### With Custom Parameters

```bash
# Run specific test file
npx vitest run test/performance/rate-limit-load.test.ts

# Run with garbage collection exposed (for memory tests)
node --expose-gc ./node_modules/.bin/vitest run test/performance/rate-limit-load.test.ts
```

## Performance Metrics

The tests collect the following metrics:

- **Total Requests**: Number of requests made
- **Success Rate**: Percentage of requests that were allowed
- **Response Times**:
  - Average
  - P50 (Median)
  - P95
  - P99
  - Min/Max
- **Throughput**: Requests per second
- **Memory Usage**: Heap and RSS memory increase

## Performance Targets

| Metric                | Target  | Description                           |
| --------------------- | ------- | ------------------------------------- |
| P99 Response Time     | < 100ms | 99% of requests complete within 100ms |
| Average Response Time | < 50ms  | Average request processing time       |
| Memory Growth         | < 50%   | Memory increase over sustained load   |
| Accuracy              | 100%    | Rate limits are exactly enforced      |

## Reports

After running the tests, reports are generated in the `test-results` directory:

- `rate-limit-performance.html` - Interactive HTML report
- `rate-limit-performance.json` - Raw JSON data
- `rate-limit-performance.md` - Markdown summary

### HTML Report Features

- Visual summary with pass/fail status
- Detailed metrics table
- Performance threshold indicators
- Test environment information
- Response time distribution

## Implementation Details

### Rate Limiting Algorithm

The system uses a sliding window algorithm with in-memory storage:

```typescript
// Each user has independent rate limits
const limit = getUserRateLimit(tier); // 60/120/300 per minute
const window = 60000; // 1 minute window
const requests = getRecentRequests(userId, window);

if (requests.length >= limit) {
  return { isGranted: false };
}

recordRequest(userId);
return { isGranted: true };
```

### Concurrency Handling

The implementation uses:

- Atomic operations for request counting
- User-isolated rate limit buckets
- No shared mutable state between users

## Troubleshooting

### Out of Memory Errors

If tests fail with memory errors:

1. Increase Node.js heap size:

   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run test:performance
   ```

2. Reduce concurrent users or requests per user in tests

### Slow Tests

If tests are running slowly:

1. Check system resources (CPU, memory)
2. Close other applications
3. Run tests individually rather than all at once

## Future Improvements

1. **Distributed Testing**: Test with Redis or other distributed stores
2. **Network Latency**: Add network delay simulation
3. **Long-running Tests**: Add endurance tests (hours/days)
4. **Chaos Testing**: Random failures and recovery
5. **Real-world Patterns**: Simulate actual usage patterns
