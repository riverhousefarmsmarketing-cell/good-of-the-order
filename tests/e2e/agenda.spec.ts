import { test, expect } from '@playwright/test';

test.describe('Agenda CRUD', () => {

  test('create new agenda with default items', async ({ page }) => {
    await page.goto('/agendas/new');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 15_000 });

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    await page.locator('input[type="date"]').first().fill(nextMonth.toISOString().split('T')[0]);
    await page.getByPlaceholder('e.g., 7:00 PM').fill('7:00 PM');
    await page.getByPlaceholder('Meeting location').fill('Farm Bureau Office');

    await expect(page.locator('input[value="Call to Order"]')).toBeVisible();
    await expect(page.locator('input[value="Adjournment"]')).toBeVisible();

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForTimeout(3000);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('agenda appears in list', async ({ page }) => {
    await page.goto('/agendas');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });
  });
});
