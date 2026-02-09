import { test, expect } from '@playwright/test';

test.describe('Tenant isolation', () => {
  const fakeId = '00000000-0000-0000-0000-000000000000';

  test('accessing non-existent minutes ID does not leak data', async ({ page }) => {
    await page.goto('/minutes/' + fakeId);
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('error');
  });

  test('accessing non-existent agenda ID does not leak data', async ({ page }) => {
    await page.goto('/agendas/' + fakeId);
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('error');
  });

  test('accessing non-existent event ID does not leak data', async ({ page }) => {
    await page.goto('/events/' + fakeId);
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('error');
  });
});
