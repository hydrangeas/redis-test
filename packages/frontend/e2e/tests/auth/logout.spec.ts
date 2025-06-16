import { test, expect } from "@playwright/test";
import { AuthHelper } from "../../helpers/auth";

test.describe("Logout Flow", () => {
  test("should logout successfully from landing page", async ({
    page,
    context,
  }) => {
    const authHelper = new AuthHelper();

    // Set up authenticated state
    await page.goto("/");
    await page.evaluate(() => {
      const mockSession = {
        access_token: "logout-landing-token",
        refresh_token: "logout-landing-refresh",
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: "logout-landing-user",
          email: "logout-landing@example.com",
          app_metadata: { tier: "tier1" },
        },
      };

      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: mockSession })
      );
    });

    await page.reload();

    // Verify authenticated state
    await expect(page.locator('button:has-text("�����")')).toBeVisible();
    await expect(page.locator('button:has-text("�÷����x")')).toBeVisible();

    // Click logout button
    await page.click('button:has-text("�����")');

    // Wait for page to update
    await page.waitForTimeout(1000);

    // Should remain on landing page
    await expect(page).toHaveURL("/");

    // Should show unauthenticated state
    await expect(page.locator('button:has-text("����")')).toBeVisible();
    await expect(page.locator('button:has-text("�����")')).toBeVisible();
    await expect(page.locator('button:has-text("�����")')).not.toBeVisible();

    // Verify session is cleared
    const session = await authHelper.getStoredSession(context);
    expect(session).toBeFalsy();
  });

  test("should logout successfully from dashboard", async ({
    page,
    context,
  }) => {
    const authHelper = new AuthHelper();

    // Set up authenticated state and navigate to dashboard
    await page.goto("/");
    await page.evaluate(() => {
      const mockSession = {
        access_token: "logout-dashboard-token",
        refresh_token: "logout-dashboard-refresh",
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: "logout-dashboard-user",
          email: "logout-dashboard@example.com",
          app_metadata: { tier: "tier2" },
        },
      };

      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: mockSession })
      );
    });

    await page.reload();

    // Navigate to dashboard
    await page.click('button:has-text("�÷����x")');
    await expect(page).toHaveURL("/dashboard");

    // Verify user info is displayed
    await expect(
      page.locator("text=logout-dashboard@example.com")
    ).toBeVisible();

    // Click logout button
    await page.click('button:has-text("�����")');

    // Should redirect to landing page
    await page.waitForURL("/");

    // Should show unauthenticated state
    await expect(page.locator('button:has-text("����")')).toBeVisible();
    await expect(page.locator('button:has-text("�����")')).not.toBeVisible();
  });

  test("should clear all authentication data on logout", async ({
    page,
    context,
  }) => {
    // Set up authenticated state with additional data
    await page.goto("/");
    await page.evaluate(() => {
      const mockSession = {
        access_token: "clear-data-token",
        refresh_token: "clear-data-refresh",
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: "clear-data-user",
          email: "clear-data@example.com",
          app_metadata: { tier: "tier3" },
        },
      };

      // Set various auth-related data
      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: mockSession })
      );
      localStorage.setItem(
        "supabase.auth.expires_at",
        String(mockSession.expires_at)
      );
      localStorage.setItem(
        "supabase.auth.refresh_token",
        mockSession.refresh_token
      );
      sessionStorage.setItem("supabase.auth.session_id", "test-session-id");
      sessionStorage.setItem("auth.user.email", mockSession.user.email);
    });

    await page.reload();

    // Verify data exists before logout
    const dataBeforeLogout = await page.evaluate(() => {
      return {
        tokenExists: !!localStorage.getItem("supabase.auth.token"),
        sessionExists: !!sessionStorage.getItem("supabase.auth.session_id"),
      };
    });
    expect(dataBeforeLogout.tokenExists).toBe(true);
    expect(dataBeforeLogout.sessionExists).toBe(true);

    // Logout
    await page.click('button:has-text("�����")');
    await page.waitForURL("/");

    // Check all auth data is cleared
    const dataAfterLogout = await page.evaluate(() => {
      const authKeys = [];

      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes("auth") || key.includes("supabase"))) {
          authKeys.push({
            storage: "local",
            key,
            value: localStorage.getItem(key),
          });
        }
      }

      // Check sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes("auth") || key.includes("supabase"))) {
          authKeys.push({
            storage: "session",
            key,
            value: sessionStorage.getItem(key),
          });
        }
      }

      return authKeys;
    });

    // Should have no auth-related data
    expect(dataAfterLogout).toHaveLength(0);
  });

  test("should handle logout errors gracefully", async ({ page }) => {
    // Set up authenticated state
    await page.goto("/");
    await page.evaluate(() => {
      const mockSession = {
        access_token: "error-logout-token",
        refresh_token: "error-logout-refresh",
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: "error-logout-user",
          email: "error-logout@example.com",
          app_metadata: { tier: "tier1" },
        },
      };

      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: mockSession })
      );
    });

    await page.reload();

    // Mock Supabase signOut to fail
    await page.evaluate(() => {
      // Override the supabase client if it exists in window
      if ((window as any).supabase) {
        (window as any).supabase.auth.signOut = async () => {
          throw new Error("Logout failed");
        };
      }
    });

    // Try to logout
    await page.click('button:has-text("�����")');

    // Even if logout fails, UI might still update
    // Check if error message is displayed
    const errorAlert = page.locator(".alert-error");
    if ((await errorAlert.count()) > 0) {
      await expect(errorAlert.first()).toContainText(/1W|error/i);
    }
  });

  test("should prevent access to protected routes after logout", async ({
    page,
  }) => {
    // Set up authenticated state
    await page.goto("/");
    await page.evaluate(() => {
      const mockSession = {
        access_token: "protect-after-logout-token",
        refresh_token: "protect-after-logout-refresh",
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: "protect-after-logout-user",
          email: "protect-after-logout@example.com",
          app_metadata: { tier: "tier2" },
        },
      };

      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: mockSession })
      );
    });

    await page.reload();

    // Access dashboard while authenticated
    await page.click('button:has-text("�÷����x")');
    await expect(page).toHaveURL("/dashboard");

    // Logout
    await page.click('button:has-text("�����")');
    await page.waitForURL("/");

    // Try to access dashboard directly
    await page.goto("/dashboard");

    // Should redirect to landing page
    await expect(page).toHaveURL("/");
    await expect(page.locator('button:has-text("����")')).toBeVisible();

    // Try to navigate back
    await page.goBack();

    // Should still be on landing page
    await expect(page).toHaveURL("/");
  });

  test("should update UI immediately after logout", async ({ page }) => {
    // Set up authenticated state
    await page.goto("/");
    await page.evaluate(() => {
      const mockSession = {
        access_token: "ui-update-token",
        refresh_token: "ui-update-refresh",
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: "ui-update-user",
          email: "ui-update@example.com",
          app_metadata: { tier: "tier1" },
        },
      };

      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: mockSession })
      );
    });

    await page.reload();

    // Verify authenticated UI elements
    const dashboardButton = page.locator('button:has-text("�÷����x")');
    const logoutButton = page.locator('button:has-text("�����")');
    const loginButton = page.locator('button:has-text("����")');
    const signupButton = page.locator('button:has-text("�����")');

    await expect(dashboardButton).toBeVisible();
    await expect(logoutButton).toBeVisible();
    await expect(loginButton).not.toBeVisible();
    await expect(signupButton).not.toBeVisible();

    // Click logout
    await logoutButton.click();

    // Wait for UI update
    await page.waitForTimeout(500);

    // Verify UI has updated
    await expect(dashboardButton).not.toBeVisible();
    await expect(logoutButton).not.toBeVisible();
    await expect(loginButton).toBeVisible();
    await expect(signupButton).toBeVisible();
  });
});
