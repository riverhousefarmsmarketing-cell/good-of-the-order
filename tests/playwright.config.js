import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
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
    // Authenticated tests — excludes public.spec
    {
      name: 'e2e',
      testMatch: /^(?!.*(public|auth-security)\.spec).*\.spec\.ts$/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/e2e/.auth/user.json',
      },
    },
    // Public tests — no auth state
    {
      name: 'public',
      testMatch: /(public|auth-security)\.spec/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
