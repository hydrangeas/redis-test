# E2E Tests for OpenData API

This directory contains end-to-end tests for the OpenData API backend. These tests verify the complete application flow including authentication, data access, rate limiting, and error handling.

## Overview

E2E tests simulate real-world usage scenarios by:

- Starting the actual Fastify application
- Using real Supabase connections (test environment)
- Making HTTP requests through the full application stack
- Verifying responses, headers, and side effects

## Test Structure

```
test/e2e/
├── setup.ts                    # Test environment setup and utilities
├── auth.e2e.test.ts           # Authentication endpoint tests
├── data-api.e2e.test.ts       # Data access API tests
├── utility-endpoints.e2e.test.ts # Health check and documentation tests
├── performance.e2e.test.ts     # Performance and load tests
└── README.md                   # This file
```

## Running E2E Tests

### Prerequisites

1. **Supabase Local Development Setup**

   ```bash
   # Start Supabase locally
   supabase start
   ```

2. **Environment Configuration**

   ```bash
   # Copy test environment template
   cp .env.test.example .env.test

   # Update with your local Supabase credentials
   # Get credentials from: supabase status
   ```

3. **Database Migrations**
   ```bash
   # Run migrations on local Supabase
   supabase db push
   ```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in watch mode
npm run test:e2e:watch

# Run E2E tests with coverage
npm run test:coverage:e2e

# Run specific test file
npm run test:e2e auth.e2e.test.ts
```

## Test Categories

### Authentication Tests (`auth.e2e.test.ts`)

- Supabase auth callback handling
- JWT token validation
- Logout functionality
- Token refresh flow
- User profile retrieval
- Authentication logging

### Data API Tests (`data-api.e2e.test.ts`)

- Authenticated data access
- File format support (JSON, CSV, XML, XLS)
- 404 handling for missing files
- Rate limiting per tier
- Path traversal prevention
- CORS handling
- Caching and ETags

### Utility Endpoint Tests (`utility-endpoints.e2e.test.ts`)

- Health check endpoint
- Service health monitoring
- API documentation (Scalar)
- OpenAPI specification
- Security headers
- Error response format (RFC 7807)
- Request validation

### Performance Tests (`performance.e2e.test.ts`)

- Concurrent request handling
- Burst traffic management
- Large payload performance
- Mixed traffic patterns
- Rate limit recovery
- Memory leak detection
- Database connection pooling

## Test Utilities

### `setup.ts` Functions

- `setupTestEnvironment()`: Initialize test environment
- `teardownTestEnvironment()`: Clean up after tests
- `createTestUser(tier)`: Create test user with specific tier
- `createTestDataFile(path, data)`: Create test data files
- `removeTestDataFile(path)`: Remove test data files
- `makeConcurrentRequests(count, factory)`: Send concurrent requests
- `delay(ms)`: Wait for specified milliseconds

## Best Practices

1. **Test Isolation**

   - Each test should be independent
   - Clean up test data after each test
   - Use unique identifiers for test data

2. **Realistic Scenarios**

   - Test actual user workflows
   - Include error cases and edge cases
   - Verify side effects (logs, database changes)

3. **Performance Considerations**

   - E2E tests are slower than unit tests
   - Run in CI with appropriate timeouts
   - Use concurrent requests sparingly

4. **Debugging**
   - Check Supabase logs: `supabase logs`
   - Enable Fastify logging in tests if needed
   - Use `console.log` for debugging (remove before commit)

## Common Issues

### Port Already in Use

E2E tests start Fastify on a random port. If you see port conflicts:

- Ensure no other instances are running
- Check for hanging test processes

### Supabase Connection Failed

- Verify Supabase is running: `supabase status`
- Check `.env.test` configuration
- Ensure migrations are applied

### Rate Limit Tests Flaky

Rate limit tests depend on timing. If flaky:

- Increase delays between requests
- Use mock time if possible
- Run tests sequentially

### Memory Tests Failing

Memory tests may fail in CI with limited resources:

- Tests skip automatically in CI
- Run locally for memory leak detection
- Use `--expose-gc` flag for accurate results

## CI/CD Integration

E2E tests run in GitHub Actions with:

- Supabase GitHub Action for test database
- Secrets for test environment variables
- Sequential execution to avoid conflicts
- Separate job from unit tests

## Future Improvements

- [ ] Add WebSocket testing for real-time features
- [ ] Implement visual regression testing
- [ ] Add accessibility testing
- [ ] Create performance benchmarks
- [ ] Add contract testing with frontend
