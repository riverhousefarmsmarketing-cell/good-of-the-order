import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth', 'user.json');

/**
 * Auth setup — runs once before all authenticated tests.
 * Logs into the app and persists storage state (cookies + localStorage)
 * so subsequent tests start already authenticated.
 *
 * Requires env vars:
 *   TEST_USER_EMAIL    — verified user email in Supabase
 *   TEST_USER_PASSWORD — password for that user
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing TEST_USER_EMAIL or TEST_USER_PASSWORD env vars.\n' +
      'Create a test user in Supabase and set these before running tests.'
    );
  }

  await page.goto('/login');

  // Fill login form
  await page.getByPlaceholder('you@organization.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard (auth complete)
  await expect(page).toHaveURL('/', { timeout: 15_000 });
  await expect(page.getByText(/Records Management/i)).toBeVisible();

  // Save auth state
  await page.context().storageState({ path: authFile });
});
