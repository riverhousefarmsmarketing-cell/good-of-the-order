import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for GoodOfTheOrder.
 *
 * Prerequisites:
 *   1. Copy .env.example → .env.local with real Supabase credentials
 *   2. Create test user: TEST_USER_EMAIL / TEST_USER_PASSWORD in Supabase
 *   3. npm run dev (runs on :5173)
 *
 * Run:
 *   npx playwright test              # all tests
 *   npx playwright test --ui         # interactive UI
 *   npx playwright test auth.spec    # single file
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // sequential — tests share auth state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Auth setup — runs first, saves storage state
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Main tests — use saved auth state
    {
      name: 'e2e',
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/e2e/.auth/user.json',
      },
    },
    // Tests that require no auth (login, signup, public pages)
    {
      name: 'public',
      testMatch: /public\.spec/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  /* Start dev server automatically if not running */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
