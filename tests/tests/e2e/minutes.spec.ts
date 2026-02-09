import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════
// MINUTES CRUD — golden path test
// Create → fill → save → reload → verify persisted
// ═══════════════════════════════════════════════════════════════════════

test.describe('Minutes CRUD', () => {
  let minutesId: string;

  test('create new minutes, fill meeting info, and save', async ({ page }) => {
    // Navigate to new minutes
    await page.goto('/minutes/new');
    await expect(page.getByText('Save Draft')).toBeVisible({ timeout: 10_000 });

    // Fill meeting info
    const today = new Date().toISOString().split('T')[0];
    await page.locator('input[type="date"]').first().fill(today);
    await page.getByPlaceholder('e.g., 7:00 PM').first().fill('7:00 PM');
    await page.getByPlaceholder('Meeting location').first().fill('County Building Room 204');

    // Save draft
    await page.getByText('Save Draft').click();

    // Wait for save to complete — URL should change to /minutes/:id
    await expect(page).toHaveURL(/\/minutes\/[a-f0-9-]+/, { timeout: 10_000 });

    // Capture the ID for later tests
    minutesId = page.url().split('/minutes/')[1];
    expect(minutesId).toBeTruthy();
  });

  test('saved minutes persists after page reload', async ({ page }) => {
    test.skip(!minutesId, 'No minutes ID from previous test');

    await page.goto(`/minutes/${minutesId}`);
    await expect(page.getByText('Save Draft')).toBeVisible({ timeout: 10_000 });

    // Verify the data we entered persisted
    await expect(page.getByPlaceholder('Meeting location').first()).toHaveValue('County Building Room 204');
    await expect(page.getByPlaceholder('e.g., 7:00 PM').first()).toHaveValue('7:00 PM');
  });

  test('minutes appear in archive list', async ({ page }) => {
    await page.goto('/minutes');
    await expect(page.getByText('Minutes Archive')).toBeVisible({ timeout: 10_000 });

    // Should have at least one entry (the one we just created)
    // Look for the draft badge
    await expect(page.getByText('Draft').first()).toBeVisible();
  });

  test('tab navigation works across all minutes tabs', async ({ page }) => {
    test.skip(!minutesId, 'No minutes ID from previous test');

    await page.goto(`/minutes/${minutesId}`);
    await expect(page.getByText('Save Draft')).toBeVisible({ timeout: 10_000 });

    const tabs = ['Meeting Info', 'Attendance', 'Financial', 'Reports', 'Business', 'Preview'];

    for (const tabName of tabs) {
      await page.getByRole('button', { name: tabName }).click();
      // Each tab should render without error — at minimum the save button stays visible
      await expect(page.getByText('Save Draft')).toBeVisible();
    }
  });
});
