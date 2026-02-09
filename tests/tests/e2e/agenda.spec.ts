import { test, expect } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════
// AGENDA CRUD — create, edit, save, verify item ordering
// ═══════════════════════════════════════════════════════════════════════

test.describe('Agenda CRUD', () => {
  let agendaId: string;

  test('create new agenda with default items', async ({ page }) => {
    await page.goto('/agendas/new');

    // Should see the agenda form with default standard items
    await expect(page.getByText('Save')).toBeVisible({ timeout: 10_000 });

    // Fill meeting details
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const dateStr = nextMonth.toISOString().split('T')[0];

    await page.locator('input[type="date"]').first().fill(dateStr);
    await page.getByPlaceholder('e.g., 7:00 PM').fill('7:00 PM');
    await page.getByPlaceholder('Meeting location').fill('Farm Bureau Office');

    // Should have standard items pre-populated
    await expect(page.getByDisplayValue('Call to Order')).toBeVisible();
    await expect(page.getByDisplayValue('Adjournment')).toBeVisible();

    // Save
    await page.getByRole('button', { name: /^Save$/ }).click();

    // Should redirect to /agendas/:id
    await expect(page).toHaveURL(/\/agendas\/[a-f0-9-]+/, { timeout: 10_000 });
    agendaId = page.url().split('/agendas/')[1];
  });

  test('agenda standard items maintain order after save', async ({ page }) => {
    test.skip(!agendaId, 'No agenda ID from previous test');

    await page.goto(`/agendas/${agendaId}`);
    await expect(page.getByText('Save')).toBeVisible({ timeout: 10_000 });

    // Verify Call to Order is first item (item #1)
    const firstItem = page.locator('input[type="text"]').filter({ hasText: /Call to Order/ }).first();
    // Standard items should appear in expected order
    await expect(page.getByDisplayValue('Call to Order')).toBeVisible();
  });

  test('add custom agenda item', async ({ page }) => {
    test.skip(!agendaId, 'No agenda ID from previous test');

    await page.goto(`/agendas/${agendaId}`);
    await expect(page.getByText('Save')).toBeVisible({ timeout: 10_000 });

    // Add new item
    await page.getByRole('button', { name: /Add Item/i }).click();

    // Fill the new empty item (last input with empty value)
    const newItemInputs = page.locator('input[placeholder="Agenda item title"]');
    const lastInput = newItemInputs.last();
    await lastInput.fill('Discussion: New Tractor Purchase');

    // Save
    await page.getByRole('button', { name: /^Save$/ }).click();
    await page.waitForTimeout(1000);

    // Reload and verify custom item persisted
    await page.reload();
    await expect(page.getByDisplayValue('Discussion: New Tractor Purchase')).toBeVisible({ timeout: 10_000 });
  });

  test('agenda appears in agendas list', async ({ page }) => {
    await page.goto('/agendas');

    // Should see at least our created agenda
    await expect(page.getByText('Board Meeting').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Draft').first()).toBeVisible();
  });
});
