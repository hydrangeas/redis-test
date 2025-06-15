import { Page, BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export class AuthHelper {
  private supabase: any;

  constructor() {
    // Use service role key for admin operations in tests
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'
    );
  }

  async createTestUser(tier: string = 'tier1') {
    const email = `e2e-test-${Date.now()}@example.com`;
    const password = 'test-password-123';

    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { tier },
    });

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }

    return { user: data.user, email, password };
  }

  async deleteTestUser(userId: string) {
    const { error } = await this.supabase.auth.admin.deleteUser(userId);
    if (error) {
      console.error(`Failed to delete test user: ${error.message}`);
    }
  }

  async loginWithCredentials(page: Page, email: string, password: string) {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill in email and password
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    // Click sign in button
    await page.click('button:has-text("Sign in")');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
  }

  async getStoredSession(context: BrowserContext): Promise<any> {
    const cookies = await context.cookies();
    const localStorage = await context.storageState();
    
    // Find Supabase session in localStorage
    const sessionData = localStorage.origins.find(
      origin => origin.origin === 'http://localhost:3000'
    )?.localStorage.find(
      item => item.name.includes('supabase.auth.token')
    );
    
    return sessionData ? JSON.parse(sessionData.value) : null;
  }

  async mockSocialLogin(page: Page, provider: 'google' | 'github') {
    // Intercept OAuth redirect
    await page.route('**/auth/v1/authorize*', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('provider') === provider) {
        // Simulate successful OAuth callback
        const callbackUrl = new URL('/auth/callback', page.url());
        callbackUrl.searchParams.set('access_token', 'mock-access-token');
        callbackUrl.searchParams.set('refresh_token', 'mock-refresh-token');
        callbackUrl.searchParams.set('expires_in', '3600');
        callbackUrl.searchParams.set('token_type', 'bearer');
        callbackUrl.searchParams.set('type', 'signup');
        
        await route.fulfill({
          status: 302,
          headers: {
            Location: callbackUrl.toString(),
          },
        });
      } else {
        await route.continue();
      }
    });
  }

  async expectAuthenticated(page: Page) {
    // Check for authenticated UI elements
    await page.waitForSelector('[data-testid="user-menu"]', { state: 'visible' });
    await page.waitForSelector('button:has-text("í°¢¦È")', { state: 'visible' });
  }

  async expectUnauthenticated(page: Page) {
    // Check for unauthenticated UI elements
    await page.waitForSelector('button:has-text("í°¤ó")', { state: 'visible' });
    await page.waitForSelector('[data-testid="user-menu"]', { state: 'hidden' });
  }
}