import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD & NAVIGATION — authenticated tests
// Uses saved auth state from auth.setup.ts
// ═══════════════════════════════════════════════════════════════════════

test.describe('Dashboard', () => {

  test('dashboard loads with greeting and quick actions', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Quick Actions')).toBeVisible();
    await expect(page.getByText('Records Management')).toBeVisible();
  });

  test('navigation bar shows all main links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Records Management/)).toBeVisible({ timeout: 10_000 });

    // Main nav links should be present
    const nav = page.locator('nav');
    await expect(nav.getByText('Dashboard')).toBeVisible();
    await expect(nav.getByText('Agendas')).toBeVisible();
    await expect(nav.getByText('Minutes')).toBeVisible();
    await expect(nav.getByText('Events')).toBeVisible();
    await expect(nav.getByText('Members')).toBeVisible();
  });

  test('navigating to /minutes shows Minutes Archive', async ({ page }) => {
    await page.goto('/minutes');
    await expect(page.getByText('Minutes Archive')).toBeVisible({ timeout: 10_000 });
  });

  test('navigating to /agendas shows Agendas list', async ({ page }) => {
    await page.goto('/agendas');
    // Should show agendas page header or empty state
    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });
  });

  test('navigating to /events shows Events page', async ({ page }) => {
    await page.goto('/events');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });
  });

  test('navigating to /members shows Members page', async ({ page }) => {
    await page.goto('/members');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });
  });

  test('sign out button returns to login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Quick Actions')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/(login)?$/, { timeout: 10_000 });
  });
});
