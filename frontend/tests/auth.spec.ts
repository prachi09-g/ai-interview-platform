import { test, expect } from '@playwright/test';

/**
 * Exercises client-side validation and navigation on the auth pages —
 * these don't need the backend to be reachable, since Zod validation
 * runs before any network request is made. Full register->verify->login
 * flows need a live backend + database and are out of scope here (see
 * backend/test/app.e2e-spec.ts for the backend-side equivalent).
 */
test.describe('Login page', () => {
  test('shows validation errors for an invalid email and empty password', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

    await page.getByPlaceholder('you@example.com').fill('not-an-email');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('Enter a valid email address')).toBeVisible();
  });

  test('links to the register page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('links to the forgot-password page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });
});

test.describe('Register page', () => {
  test('rejects a password missing a number', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder('Jane Doe').fill('Jane Doe');
    await page.getByPlaceholder('you@example.com').fill('jane@example.com');
    await page.locator('input[type="password"]').fill('onlyletters');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Include at least one letter and one number')).toBeVisible();
  });

  test('rejects a password under 8 characters', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder('Jane Doe').fill('Jane Doe');
    await page.getByPlaceholder('you@example.com').fill('jane@example.com');
    await page.locator('input[type="password"]').fill('a1');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('At least 8 characters')).toBeVisible();
  });

  test('links back to the login page', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
