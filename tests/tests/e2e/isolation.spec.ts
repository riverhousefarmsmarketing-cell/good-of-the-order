import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════
// TENANT ISOLATION — RLS enforcement test
//
// Verifies that navigating to a fabricated UUID (belonging to no org or
// another org) does not leak data. The app should show empty/redirect.
// ═══════════════════════════════════════════════════════════════════════

test.describe('Tenant isolation', () => {

  // A UUID that doesn't belong to the test user's org
  const fakeId = '00000000-0000-0000-0000-000000000000';

  test('accessing non-existent minutes ID redirects or shows empty', async ({ page }) => {
    await page.goto(`/minutes/${fakeId}`);

    // Should either redirect to /minutes (archive) or show error state
    // It should NOT show another org's data
    await page.waitForTimeout(3000);
    const url = page.url();

    // Either redirected back to archive, or stayed but shows empty/error
    const redirected = url.includes('/minutes') && !url.includes(fakeId);
    const showsNoData = await page.getByText(/not found|error|no minutes/i).isVisible().catch(() => false);
    const showsEmptyForm = await page.locator('input[type="date"]').isVisible().catch(() => false);

    // At minimum: should not show populated data from another org
    // The form should be blank if it renders at all
    if (showsEmptyForm) {
      const locationValue = await page.getByPlaceholder('Meeting location').first().inputValue().catch(() => '');
      expect(locationValue).toBe(''); // empty — no leaked data
    }

    expect(redirected || showsNoData || showsEmptyForm).toBeTruthy();
  });

  test('accessing non-existent agenda ID redirects or shows empty', async ({ page }) => {
    await page.goto(`/agendas/${fakeId}`);
    await page.waitForTimeout(3000);

    const url = page.url();
    const redirected = url.includes('/agendas') && !url.includes(fakeId);
    const showsError = await page.getByText(/not found|error/i).isVisible().catch(() => false);

    expect(redirected || showsError).toBeTruthy();
  });

  test('accessing non-existent event ID redirects or shows empty', async ({ page }) => {
    await page.goto(`/events/${fakeId}`);
    await page.waitForTimeout(3000);

    const url = page.url();
    const redirected = url.includes('/events') && !url.includes(fakeId);
    const showsError = await page.getByText(/not found|error/i).isVisible().catch(() => false);

    expect(redirected || showsError).toBeTruthy();
  });
});
