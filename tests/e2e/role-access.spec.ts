import { test, expect } from '@playwright/test';

/**
 * Role-Based Access Control Tests
 *
 * These tests verify that role restrictions are enforced in the UI.
 * The default test user should be an admin or editor.
 * We test that restricted routes and UI elements behave correctly.
 *
 * Note: Server-side RLS enforcement is tested in rls-policy.spec.ts.
 * These tests focus on the client-side UI gating.
 */

test.describe('Role-Based UI Gating', () => {

  test('editor/admin can see "+ New Minutes" button', async ({ page }) => {
    await page.goto('/minutes');
    await page.waitForLoadState('networkidle');

    // Admin/editor should see the create button
    const newBtn = page.locator('text=+ New Minutes').or(page.locator('a[href="/minutes/new"]'));
    const count = await newBtn.count();
    expect(count).toBeGreaterThan(0);
  });

  test('editor/admin can see "+ New Agenda" button', async ({ page }) => {
    await page.goto('/agendas');
    await page.waitForLoadState('networkidle');

    const newBtn = page.locator('text=+ New Agenda').or(page.locator('a[href="/agendas/new"]'));
    const count = await newBtn.count();
    expect(count).toBeGreaterThan(0);
  });

  test('editor/admin can see "+ New Event" button', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');

    const newBtn = page.locator('text=+ New Event').or(page.locator('a[href="/events/new"]'));
    const count = await newBtn.count();
    expect(count).toBeGreaterThan(0);
  });

  test('admin can access Members page', async ({ page }) => {
    await page.goto('/members');
    await page.waitForLoadState('networkidle');

    // Should not redirect away from /members
    expect(page.url()).toContain('/members');

    // Should see member management UI (not an error or redirect)
    const header = page.locator('text=Members').or(page.locator('text=Board Members'));
    const count = await header.count();
    expect(count).toBeGreaterThan(0);
  });

  test('admin can access Settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/settings');

    const header = page.locator('text=Settings').or(page.locator('text=Organization'));
    const count = await header.count();
    expect(count).toBeGreaterThan(0);
  });

  test('create minutes form loads with all tabs', async ({ page }) => {
    await page.goto('/minutes/new');
    await page.waitForLoadState('networkidle');

    // Should see all the tabs
    await expect(page.locator('text=Meeting Info')).toBeVisible();
    await expect(page.locator('text=Attendance')).toBeVisible();
    await expect(page.locator('text=Business')).toBeVisible();
    await expect(page.locator('text=Preview')).toBeVisible();
  });
});
