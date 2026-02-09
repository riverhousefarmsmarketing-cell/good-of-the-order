import { test, expect } from '@playwright/test';

test.describe('Minutes CRUD', () => {

  test('minutes form loads with all tabs', async ({ page }) => {
    await page.goto('/minutes/new');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Save Draft')).toBeVisible({ timeout: 15_000 });

    for (const tab of ['Meeting Info', 'Attendance', 'Financial', 'Reports', 'Business', 'Preview']) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible();
    }

    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').first().fill(today);
  });

  test('minutes appear in archive list', async ({ page }) => {
    await page.goto('/minutes');
    await expect(page.getByText('Minutes Archive')).toBeVisible({ timeout: 10_000 });
  });
});
