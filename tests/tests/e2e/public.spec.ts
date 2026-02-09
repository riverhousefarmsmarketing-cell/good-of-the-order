import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC ROUTE TESTS — no authentication required
// ═══════════════════════════════════════════════════════════════════════

test.describe('Public pages', () => {

  test('landing page loads for unauthenticated visitor', async ({ page }) => {
    await page.goto('/');
    // Should show landing/marketing page, not dashboard
    // The LandingOrDashboard component shows LandingPage when no user
    await expect(page.locator('body')).toBeVisible();
    // Should NOT show "Records Management" (that's the authenticated dashboard)
    await expect(page.getByText('Quick Actions')).not.toBeVisible({ timeout: 3000 });
  });

  test('unauthenticated user is redirected from protected routes to /login', async ({ page }) => {
    await page.goto('/minutes');
    await expect(page).toHaveURL('/login', { timeout: 10_000 });
  });

  test('unauthenticated deep link to /agendas redirects to /login', async ({ page }) => {
    await page.goto('/agendas');
    await expect(page).toHaveURL('/login', { timeout: 10_000 });
  });

  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('you@organization.com')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@organization.com').fill('nonexistent@test.com');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show an error message, not redirect
    await expect(page.getByText(/invalid|error|incorrect|credentials/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL('/login');
  });

  test('signup page loads and shows form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByPlaceholder('Jane Smith')).toBeVisible();
    await expect(page.getByPlaceholder('jane@organization.com')).toBeVisible();
    await expect(page.getByPlaceholder('At least 8 characters')).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('button', { name: /send|reset/i })).toBeVisible();
  });
});
