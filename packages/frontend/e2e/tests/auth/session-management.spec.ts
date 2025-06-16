import { test, expect } from "@playwright/test";
import { AuthHelper } from "../../helpers/auth";

test.describe("Session Management", () => {
  let authHelper: AuthHelper;

  test.beforeEach(async () => {
    authHelper = new AuthHelper();
  });

  test("should persist session across page reloads", async ({ page }) => {
    // Set up authenticated state
    await page.goto("/");

    // Mock authenticated user
    await page.evaluate(() => {
      const mockSession = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: "test-user-123",
          email: "test@example.com",
          app_metadata: { tier: "tier2" },
        },
      };

      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: mockSession })
      );
    });

    // Reload page
    await page.reload();

    // Should maintain authenticated state
    await expect(page.locator('button:has-text("�÷����x")')).toBeVisible();
    await expect(page.locator('button:has-text("�����")')).toBeVisible();

    // Navigate to dashboard
    await page.click('button:has-text("�÷����x")');
    await expect(page).toHaveURL("/dashboard");

    // Check user info is displayed
    await expect(page.locator("text=test@example.com")).toBeVisible();
    await expect(
      page.locator("text=tier2").or(page.locator("text=Tier 2"))
    ).toBeVisible();
  });

  test("should sync authentication across multiple tabs", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Set up authenticated state in tab 1
    await page1.goto("/");
    await page1.evaluate(() => {
      const mockSession = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: "test-user-456",
          email: "sync-test@example.com",
          app_metadata: { tier: "tier1" },
        },
      };

      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: mockSession })
      );

      // Trigger storage event for cross-tab sync
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "supabase.auth.token",
          newValue: JSON.stringify({ currentSession: mockSession }),
          url: window.location.href,
        })
      );
    });

    // Tab 1 should show authenticated state
    await page1.reload();
    await expect(page1.locator('button:has-text("�÷����x")')).toBeVisible();

    // Tab 2 should also show authenticated state
    await page2.goto("/");
    await expect(page2.locator('button:has-text("�÷����x")')).toBeVisible();

    // Logout in tab 1
    await page1.click('button:has-text("�����")');
    await page1.waitForURL("/");

    // Clear session and trigger storage event
    await page1.evaluate(() => {
      localStorage.removeItem("supabase.auth.token");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "supabase.auth.token",
          newValue: null,
          url: window.location.href,
        })
      );
    });

    // Tab 2 should reflect logout after refresh
    await page2.reload();
    await expect(page2.locator('button:has-text("����")')).toBeVisible();

    await context.close();
  });

  test("should handle token expiration gracefully", async ({ page }) => {
    await page.goto("/");

    // Set expired token
    await page.evaluate(() => {
      const expiredSession = {
        access_token: "expired-token",
        refresh_token: "expired-refresh-token",
        expires_at: Date.now() / 1000 - 3600, // Expired 1 hour ago
        user: {
          id: "test-user-789",
          email: "expired@example.com",
          app_metadata: { tier: "tier1" },
        },
      };

      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: expiredSession })
      );
    });

    // Try to access protected route
    await page.goto("/dashboard");

    // Should redirect to login with session expired message
    await expect(page).toHaveURL(/\/login/);

    // May show an error message
    const errorAlert = page.locator(".alert-error");
    if ((await errorAlert.count()) > 0) {
      await expect(errorAlert.first()).toContainText(/P|expired/i);
    }
  });

  test("should maintain session info in dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    // Mock authenticated state with specific tier
    await page.evaluate(() => {
      const mockSession = {
        access_token: "dashboard-test-token",
        refresh_token: "dashboard-refresh-token",
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: "dashboard-user",
          email: "dashboard@example.com",
          app_metadata: { tier: "tier3" },
        },
      };

      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: mockSession })
      );
    });

    await page.reload();

    // Check tier-specific information
    await expect(page.locator("text=dashboard@example.com")).toBeVisible();
    await expect(
      page.locator("text=tier3").or(page.locator("text=Tier 3"))
    ).toBeVisible();

    // Check rate limit display based on tier
    const rateLimitText = page.locator(
      "text=/300�\\/|300 requests per minute/i"
    );
    await expect(rateLimitText).toBeVisible();
  });

  test("should clear all auth data on logout", async ({ page, context }) => {
    // Set up authenticated state
    await page.goto("/");
    await page.evaluate(() => {
      const mockSession = {
        access_token: "logout-test-token",
        refresh_token: "logout-refresh-token",
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: "logout-user",
          email: "logout@example.com",
          app_metadata: { tier: "tier1" },
        },
      };

      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: mockSession })
      );

      // Set some additional auth-related data
      localStorage.setItem(
        "supabase.auth.expires_at",
        String(mockSession.expires_at)
      );
      sessionStorage.setItem("supabase.auth.session", "active");
    });

    await page.reload();

    // Verify authenticated state
    await expect(page.locator('button:has-text("�����")')).toBeVisible();

    // Click logout
    await page.click('button:has-text("�����")');

    // Wait for redirect to home
    await page.waitForURL("/");

    // Check all auth data is cleared
    const authData = await page.evaluate(() => {
      return {
        token: localStorage.getItem("supabase.auth.token"),
        expiresAt: localStorage.getItem("supabase.auth.expires_at"),
        session: sessionStorage.getItem("supabase.auth.session"),
      };
    });

    expect(authData.token).toBeNull();
    expect(authData.expiresAt).toBeNull();
    expect(authData.session).toBeNull();

    // Verify logged out state
    await expect(page.locator('button:has-text("����")')).toBeVisible();
    await expect(page.locator('button:has-text("�����")')).not.toBeVisible();
  });
});
