import { Page, expect } from "@playwright/test";

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 3000) {
  await page.waitForLoadState("networkidle", { timeout });
}

/**
 * Check if user is authenticated
 */
export async function expectToBeAuthenticated(page: Page) {
  // Check for authenticated UI elements
  await expect(page.locator('button:has-text("�÷����x")')).toBeVisible();
  await expect(page.locator('button:has-text("�����")')).toBeVisible();

  // Check that unauthenticated elements are hidden
  await expect(page.locator('button:has-text("����")')).not.toBeVisible();
  await expect(page.locator('button:has-text("�����")')).not.toBeVisible();
}

/**
 * Check if user is unauthenticated
 */
export async function expectToBeUnauthenticated(page: Page) {
  // Check for unauthenticated UI elements
  await expect(page.locator('button:has-text("����")')).toBeVisible();

  // Check that authenticated elements are hidden
  await expect(page.locator('button:has-text("�÷����x")')).not.toBeVisible();
  await expect(page.locator('button:has-text("�����")')).not.toBeVisible();
}

/**
 * Set up mock authentication
 */
export async function mockAuthentication(
  page: Page,
  options: {
    email?: string;
    tier?: string;
    expiresIn?: number;
  } = {}
) {
  const {
    email = "test@example.com",
    tier = "tier1",
    expiresIn = 3600,
  } = options;

  await page.evaluate(
    ({ email, tier, expiresIn }) => {
      const mockSession = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_at: Date.now() / 1000 + expiresIn,
        user: {
          id: "mock-user-id",
          email,
          app_metadata: { tier },
        },
      };

      localStorage.setItem(
        "supabase.auth.token",
        JSON.stringify({ currentSession: mockSession })
      );
    },
    { email, tier, expiresIn }
  );
}

/**
 * Clear authentication
 */
export async function clearAuthentication(page: Page) {
  await page.evaluate(() => {
    // Clear all auth-related localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("supabase") || key.includes("auth"))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Clear all auth-related sessionStorage
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes("supabase") || key.includes("auth"))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));
  });
}

/**
 * Intercept and log Supabase Auth requests
 */
export async function interceptSupabaseAuth(page: Page) {
  await page.route("**/auth/v1/**", async (route, request) => {
    const url = request.url();
    const method = request.method();
    const postData = request.postData();

    console.log(`[Supabase Auth] ${method} ${url}`);
    if (postData) {
      console.log(`[Supabase Auth] Body: ${postData}`);
    }

    await route.continue();
  });
}

/**
 * Wait for a specific text to appear
 */
export async function waitForText(
  page: Page,
  text: string,
  options?: {
    timeout?: number;
    exact?: boolean;
  }
) {
  const { timeout = 5000, exact = false } = options || {};

  if (exact) {
    await page.waitForSelector(`text="${text}"`, { timeout });
  } else {
    await page.waitForSelector(`text=${text}`, { timeout });
  }
}

/**
 * Get current auth session from page
 */
export async function getCurrentSession(page: Page) {
  return await page.evaluate(() => {
    const tokenData = localStorage.getItem("supabase.auth.token");
    if (!tokenData) return null;

    try {
      const parsed = JSON.parse(tokenData);
      return parsed.currentSession;
    } catch {
      return null;
    }
  });
}

/**
 * Check if element is in viewport
 */
export async function isInViewport(
  page: Page,
  selector: string
): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }, selector);
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await page.screenshot({
    path: `e2e/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}
