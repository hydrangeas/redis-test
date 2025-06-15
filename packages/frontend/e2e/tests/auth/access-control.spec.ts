import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../helpers/auth';

test.describe('Access Control', () => {
  test('should redirect to login when accessing protected routes without auth', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');
    
    // Should redirect to home page (since login redirect is not implemented)
    await expect(page).toHaveURL('/');
    
    // Should show login button
    await expect(page.locator('button:has-text("í°¤ó")')).toBeVisible();
  });

  test('should allow access to public routes without auth', async ({ page }) => {
    // Test public routes
    const publicRoutes = ['/', '/api-docs'];

    for (const route of publicRoutes) {
      await page.goto(route);
      
      if (route === '/') {
        // Landing page should be accessible
        await expect(page.locator('h1:has-text("ªü×óÇü¿Ð›API")')).toBeVisible();
        await expect(page.locator('button:has-text("í°¤ó")')).toBeVisible();
      } else if (route === '/api-docs') {
        // API docs should be accessible
        await expect(page).toHaveURL('/api-docs');
        // The actual content depends on Scalar UI loading
      }
    }
  });

  test('should display tier-based information correctly', async ({ page }) => {
    // Test different tier levels
    const tiers = [
      { name: 'tier1', rateLimit: '60Þ/' },
      { name: 'tier2', rateLimit: '120Þ/' },
      { name: 'tier3', rateLimit: '300Þ/' }
    ];

    for (const tier of tiers) {
      // Set up authenticated state with specific tier
      await page.goto('/');
      await page.evaluate((tierInfo) => {
        const mockSession = {
          access_token: `${tierInfo.name}-token`,
          refresh_token: `${tierInfo.name}-refresh`,
          expires_at: Date.now() / 1000 + 3600,
          user: {
            id: `${tierInfo.name}-user`,
            email: `${tierInfo.name}@example.com`,
            app_metadata: { tier: tierInfo.name }
          }
        };
        
        localStorage.setItem(
          'supabase.auth.token',
          JSON.stringify({ currentSession: mockSession })
        );
      }, tier);

      // Navigate to dashboard
      await page.reload();
      await page.click('button:has-text("ÀÃ·åÜüÉx")');
      await expect(page).toHaveURL('/dashboard');

      // Check tier information
      await expect(page.locator(`text=${tier.name}@example.com`)).toBeVisible();
      
      // Check rate limit display
      const rateLimitPattern = new RegExp(tier.rateLimit);
      await expect(page.locator('body')).toContainText(rateLimitPattern);
    }
  });

  test('should prevent access to dashboard after logout', async ({ page }) => {
    // Set up authenticated state
    await page.goto('/');
    await page.evaluate(() => {
      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: 'test-user',
          email: 'test@example.com',
          app_metadata: { tier: 'tier1' }
        }
      };
      
      localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({ currentSession: mockSession })
      );
    });

    await page.reload();
    
    // Verify can access dashboard
    await page.click('button:has-text("ÀÃ·åÜüÉx")');
    await expect(page).toHaveURL('/dashboard');

    // Logout
    await page.click('button:has-text("í°¢¦È")');
    await page.waitForURL('/');

    // Try to access dashboard again
    await page.goto('/dashboard');
    
    // Should redirect to home
    await expect(page).toHaveURL('/');
    await expect(page.locator('button:has-text("í°¤ó")')).toBeVisible();
  });

  test('should handle navigation guards correctly', async ({ page }) => {
    // Start unauthenticated
    await page.goto('/');
    
    // Click on dashboard link should not navigate
    const dashboardLink = page.locator('a[href="/dashboard"]');
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      // Should not navigate to dashboard
      await expect(page).not.toHaveURL('/dashboard');
    }

    // Authenticate
    await page.evaluate(() => {
      const mockSession = {
        access_token: 'nav-test-token',
        refresh_token: 'nav-test-refresh',
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: 'nav-test-user',
          email: 'nav@example.com',
          app_metadata: { tier: 'tier2' }
        }
      };
      
      localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({ currentSession: mockSession })
      );
    });

    await page.reload();

    // Now dashboard navigation should work
    await page.click('button:has-text("ÀÃ·åÜüÉx")');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display appropriate UI based on auth state', async ({ page }) => {
    // Test unauthenticated state
    await page.goto('/');
    
    // Should show login/signup buttons
    await expect(page.locator('button:has-text("í°¤ó")')).toBeVisible();
    await expect(page.locator('button:has-text("µ¤ó¢Ã×")')).toBeVisible();
    
    // Should not show authenticated elements
    await expect(page.locator('button:has-text("ÀÃ·åÜüÉx")')).not.toBeVisible();
    await expect(page.locator('button:has-text("í°¢¦È")')).not.toBeVisible();

    // Authenticate
    await page.evaluate(() => {
      const mockSession = {
        access_token: 'ui-test-token',
        refresh_token: 'ui-test-refresh',
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: 'ui-test-user',
          email: 'ui@example.com',
          app_metadata: { tier: 'tier1' }
        }
      };
      
      localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({ currentSession: mockSession })
      );
    });

    await page.reload();

    // Should show authenticated elements
    await expect(page.locator('button:has-text("ÀÃ·åÜüÉx")')).toBeVisible();
    await expect(page.locator('button:has-text("í°¢¦È")')).toBeVisible();
    
    // Should not show login/signup buttons
    await expect(page.locator('button:has-text("í°¤ó")')).not.toBeVisible();
    await expect(page.locator('button:has-text("µ¤ó¢Ã×")')).not.toBeVisible();
  });
});