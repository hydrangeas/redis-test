import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../helpers/auth';

test.describe('Social Login Flow', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper();
    await page.goto('/');
  });

  test('should display social login options on landing page', async ({ page }) => {
    // Check landing page
    await expect(page.locator('h1')).toContainText('™¸◊Û«¸ø–õAPI');
    
    // Click login button
    await page.click('button:has-text("Ì∞§Û")');
    
    // Should show AuthForm with social providers
    await expect(page.locator('[data-testid="supabase-auth"]')).toBeVisible();
    await expect(page.locator('button:has-text("googlegÌ∞§Û")').or(page.locator('button:has-text("Sign in with Google")'))).toBeVisible();
    await expect(page.locator('button:has-text("githubgÌ∞§Û")').or(page.locator('button:has-text("Sign in with GitHub")'))).toBeVisible();
  });

  test('should login with Google provider', async ({ page, context }) => {
    // Set up OAuth mock
    await authHelper.mockSocialLogin(page, 'google');

    // Navigate to login
    await page.click('button:has-text("Ì∞§Û")');
    
    // Click Google login button
    const googleButton = page.locator('button:has-text("googlegÌ∞§Û")').or(page.locator('button:has-text("Sign in with Google")'));
    await googleButton.click();

    // Should redirect to dashboard after OAuth flow
    await page.waitForURL('/dashboard', { timeout: 15000 });
    
    // Verify dashboard is displayed
    await expect(page.locator('h1')).toContainText('¿√∑Â‹¸…');
    
    // Check session exists
    const session = await authHelper.getStoredSession(context);
    expect(session).toBeTruthy();
  });

  test('should login with GitHub provider', async ({ page, context }) => {
    await authHelper.mockSocialLogin(page, 'github');

    await page.click('button:has-text("Ì∞§Û")');
    
    const githubButton = page.locator('button:has-text("githubgÌ∞§Û")').or(page.locator('button:has-text("Sign in with GitHub")'));
    await githubButton.click();

    await page.waitForURL('/dashboard', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('¿√∑Â‹¸…');
  });

  test('should handle login error', async ({ page }) => {
    // Mock OAuth error
    await page.route('**/auth/v1/authorize*', async (route) => {
      const callbackUrl = new URL('/auth/callback', page.url());
      callbackUrl.searchParams.set('error', 'access_denied');
      callbackUrl.searchParams.set('error_description', 'User denied access');
      
      await route.fulfill({
        status: 302,
        headers: {
          Location: callbackUrl.toString(),
        },
      });
    });

    await page.goto('/login');
    
    const googleButton = page.locator('button:has-text("googlegÌ∞§Û")').or(page.locator('button:has-text("Sign in with Google")'));
    await googleButton.click();

    // Should redirect back to login with error
    await page.waitForURL(/\/login/, { timeout: 10000 });
    
    // Error message might be displayed
    const errorAlert = page.locator('.alert-error');
    if (await errorAlert.isVisible()) {
      await expect(errorAlert).toContainText(/error|1W/i);
    }
  });

  test('should persist login state across page refresh', async ({ page, context }) => {
    // Create a mock authenticated state
    await page.goto('/');
    
    // Inject authentication token
    await page.evaluate(() => {
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() / 1000 + 3600,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          app_metadata: { tier: 'tier1' }
        }
      };
      
      localStorage.setItem(
        'supabase.auth.token', 
        JSON.stringify({ currentSession: mockSession })
      );
    });

    // Refresh page
    await page.reload();

    // Should show authenticated state
    await expect(page.locator('button:has-text("¿√∑Â‹¸…x")')).toBeVisible();
    await expect(page.locator('button:has-text("Ì∞¢¶»")')).toBeVisible();
  });
});