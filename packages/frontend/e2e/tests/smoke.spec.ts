import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("should load the landing page", async ({ page }) => {
    await page.goto("/");

    // Check page title
    await expect(page).toHaveTitle(/�������|Open Data/);

    // Check main heading
    await expect(page.locator("h1")).toContainText("�������ЛAPI");

    // Check key elements are present
    await expect(page.locator("text=Hon��������JSONbgЛ")).toBeVisible();
    await expect(page.locator('a[href="/api-docs"]')).toBeVisible();
  });

  test("should have working navigation", async ({ page }) => {
    await page.goto("/");

    // Check API docs link
    const apiDocsLink = page.locator('a[href="/api-docs"]');
    await expect(apiDocsLink).toBeVisible();
    await expect(apiDocsLink).toHaveAttribute("target", "_blank");
  });

  test("should display authentication buttons when not logged in", async ({
    page,
  }) => {
    await page.goto("/");

    // Check login and signup buttons
    await expect(page.locator('button:has-text("����")')).toBeVisible();
    await expect(page.locator('button:has-text("�����")')).toBeVisible();
  });

  test("should have responsive design", async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator("h1")).toBeVisible();

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should handle 404 pages", async ({ page }) => {
    await page.goto("/non-existent-page");

    // React Router might redirect to home or show a 404 component
    // For now, just check we don't get a server error
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});
