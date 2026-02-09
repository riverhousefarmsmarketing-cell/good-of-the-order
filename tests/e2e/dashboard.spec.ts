import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {

  test('dashboard loads with quick actions', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Quick Actions')).toBeVisible({ timeout: 10_000 });
  });

  test('navigation bar shows main links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Quick Actions')).toBeVisible({ timeout: 10_000 });
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Agendas' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Minutes' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Events' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Members' })).toBeVisible();
  });

  test('navigating to /minutes shows Minutes Archive', async ({ page }) => {
    await page.goto('/minutes');
    await expect(page.getByText('Minutes Archive')).toBeVisible({ timeout: 10_000 });
  });

  test('navigating to /agendas shows Agendas page', async ({ page }) => {
    await page.goto('/agendas');
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

  test('sign out returns to login or landing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Quick Actions')).toBeVisible({ timeout: 10_000 });
    await page.getByText('Sign Out').click();
    await page.waitForTimeout(3000);
    await expect(page.getByText('Quick Actions')).not.toBeVisible({ timeout: 10_000 });
  });
});
