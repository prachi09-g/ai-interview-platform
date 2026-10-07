import { test, expect } from '@playwright/test';

/**
 * Verifies the client-side AuthGuard/RoleGuard redirect behavior
 * documented in components/guards/*.tsx — an unauthenticated visitor is
 * bounced to /login rather than seeing a flash of protected content.
 * Runs with a clean browser context (no stored auth state), matching a
 * first-time visitor.
 */
test.describe('Unauthenticated access', () => {
  test('redirects from the student dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('redirects from a nested student route to /login', async ({ page }) => {
    await page.goto('/interview/setup');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('redirects from the admin dashboard to /login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the root path redirects to /login when logged out', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });
});
