# E2E Tests

This directory contains end-to-end tests for the frontend application using Playwright.

## Setup

1. Install Playwright browsers:

```bash
npm run playwright:install
```

2. Set up environment variables:

```bash
# Create .env.test file in the frontend directory
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Running Tests

### Run all tests

```bash
npm run test:e2e
```

### Run tests in UI mode

```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)

```bash
npm run test:e2e:headed
```

### Debug tests

```bash
npm run test:e2e:debug
```

### Run specific test file

```bash
npx playwright test e2e/tests/auth/social-login.spec.ts
```

### Run tests in specific browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Structure

```
e2e/
   helpers/          # Test helper functions
      auth.ts       # Authentication helpers
   tests/           # Test files
      auth/        # Authentication tests
         social-login.spec.ts
         session-management.spec.ts
         access-control.spec.ts
         logout.spec.ts
      smoke.spec.ts # Basic smoke tests
   utils/           # Utility functions
      test-helpers.ts
   playwright.config.ts # Playwright configuration
```

## Writing Tests

### Basic test structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do something", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
  });
});
```

### Using authentication helpers

```typescript
import { AuthHelper } from "../helpers/auth";

test("authenticated test", async ({ page }) => {
  const authHelper = new AuthHelper();

  // Create test user
  const testUser = await authHelper.createTestUser("tier1");

  // Login
  await authHelper.loginWithCredentials(
    page,
    testUser.email,
    testUser.password
  );

  // Your test code here

  // Cleanup
  await authHelper.deleteTestUser(testUser.user.id);
});
```

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Clean up test data** after each test
3. **Use Page Object Model** for complex pages
4. **Avoid hard-coded waits** - use Playwright's auto-waiting
5. **Test user journeys**, not just individual features
6. **Run tests in CI** with multiple browsers

## Debugging

1. Use `--debug` flag to step through tests
2. Use `page.pause()` to pause execution
3. Check screenshots in `test-results/` folder
4. Use `--trace on` to record test traces
5. View HTML report: `npx playwright show-report`

## CI Integration

Tests run automatically in GitHub Actions on:

- Pull requests
- Pushes to main branch

See `.github/workflows/pr-check.yml` and `.github/workflows/deploy-production.yml` for configuration.
