import { describe, it, expect } from 'vitest';
import { routes, isAuthRoute, isProtectedRoute, getRedirectUrl } from '../routes';

describe('routes utilities', () => {
  describe('routes constant', () => {
    it('should contain all expected routes', () => {
      expect(routes.home).toBe('/');
      expect(routes.login).toBe('/login');
      expect(routes.signup).toBe('/login');
      expect(routes.dashboard).toBe('/dashboard');
      expect(routes.profile).toBe('/profile');
      expect(routes.apiKeys).toBe('/api-keys');
      expect(routes.usage).toBe('/usage');
      expect(routes.settings).toBe('/settings');
      expect(routes.terms).toBe('/terms');
      expect(routes.privacy).toBe('/privacy');
      expect(routes.authCallback).toBe('/auth/callback');
      expect(routes.apiDocs).toBe('/api-docs');
    });
  });

  describe('isAuthRoute', () => {
    it('should return true for auth routes', () => {
      expect(isAuthRoute('/login')).toBe(true);
      expect(isAuthRoute('/auth/callback')).toBe(true);
    });

    it('should return false for non-auth routes', () => {
      expect(isAuthRoute('/')).toBe(false);
      expect(isAuthRoute('/dashboard')).toBe(false);
      expect(isAuthRoute('/profile')).toBe(false);
    });
  });

  describe('isProtectedRoute', () => {
    it('should return true for protected routes', () => {
      expect(isProtectedRoute('/dashboard')).toBe(true);
      expect(isProtectedRoute('/profile')).toBe(true);
      expect(isProtectedRoute('/api-keys')).toBe(true);
      expect(isProtectedRoute('/usage')).toBe(true);
      expect(isProtectedRoute('/settings')).toBe(true);
      expect(isProtectedRoute('/settings/advanced')).toBe(true); // Nested route
    });

    it('should return false for public routes', () => {
      expect(isProtectedRoute('/')).toBe(false);
      expect(isProtectedRoute('/login')).toBe(false);
      expect(isProtectedRoute('/auth/callback')).toBe(false);
      expect(isProtectedRoute('/terms')).toBe(false);
    });
  });

  describe('getRedirectUrl', () => {
    it('should return dashboard for auth routes', () => {
      expect(getRedirectUrl('/login')).toBe('/dashboard');
      expect(getRedirectUrl('/auth/callback')).toBe('/dashboard');
    });

    it('should return dashboard when no from parameter', () => {
      expect(getRedirectUrl()).toBe('/dashboard');
      expect(getRedirectUrl('')).toBe('/dashboard');
    });

    it('should return the from parameter for non-auth routes', () => {
      expect(getRedirectUrl('/profile')).toBe('/profile');
      expect(getRedirectUrl('/api-keys')).toBe('/api-keys');
      expect(getRedirectUrl('/some/other/path')).toBe('/some/other/path');
    });
  });
});