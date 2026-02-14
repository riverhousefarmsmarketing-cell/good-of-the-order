import { test, expect } from '@playwright/test';

/**
 * Auth & Security Route Tests
 *
 * Verify that protected routes redirect unauthenticated users to login,
 * and that public routes are accessible without auth.
 * These run WITHOUT authentication (public project in playwright config).
 */

test.describe('Unauthenticated Route Protection', () => {

  test('protected /minutes redirects to login', async ({ page }) => {
    await page.goto('/minutes');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });

  test('protected /agendas redirects to login', async ({ page }) => {
    await page.goto('/agendas');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });

  test('protected /events redirects to login', async ({ page }) => {
    await page.goto('/events');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });

  test('protected /members redirects to login', async ({ page }) => {
    await page.goto('/members');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });

  test('protected /settings redirects to login', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });

  test('landing page is accessible without auth', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should NOT redirect to login
    expect(page.url()).not.toContain('/login');

    // Should show the landing page content
    const heading = await page.locator('h1, h2').first().textContent();
    expect(heading).toBeTruthy();
  });

  test('login page is accessible without auth', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');

    // Should have login form elements
    const emailInput = page.getByPlaceholder('you@organization.com');
    await expect(emailInput).toBeVisible();
  });

  test('signup page is accessible without auth', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/signup');
  });
});
