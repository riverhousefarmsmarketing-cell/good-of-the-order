# E2E Test Suite — GoodOfTheOrder

Playwright end-to-end tests covering auth flows, CRUD operations, navigation, and tenant isolation.

## Setup

```bash
# 1. Install dependencies (including Playwright)
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Set up test credentials
#    Create a verified test user in your Supabase project, then:
export TEST_USER_EMAIL="test@yourorg.com"
export TEST_USER_PASSWORD="your-test-password"

# 4. Ensure .env.local has your Supabase credentials
cp .env.example .env.local
# Edit .env.local with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

## Running Tests

```bash
# Run all tests (starts dev server automatically)
npm test

# Run with interactive UI
npm run test:ui

# Run only public (unauthenticated) tests
npm run test:public

# Run only authenticated E2E tests
npm run test:e2e
```

## Test Structure

```
tests/e2e/
├── .auth/              # Saved auth state (gitignored)
├── auth.setup.ts       # Logs in once, saves session for other tests
├── public.spec.ts      # Unauthenticated: login, signup, redirects
├── dashboard.spec.ts   # Dashboard, navigation, sign out
├── minutes.spec.ts     # Minutes CRUD golden path
├── agenda.spec.ts      # Agenda CRUD + item ordering
└── isolation.spec.ts   # RLS tenant isolation verification
```

## Test Coverage Map

| Area | File | What's Tested |
|------|------|---------------|
| Auth gate | public.spec | Unauthenticated users redirected to /login |
| Login | public.spec | Form renders, invalid creds show error |
| Signup | public.spec | Form renders with all fields |
| Dashboard | dashboard.spec | Greeting, quick actions, nav links visible |
| Navigation | dashboard.spec | All main routes accessible |
| Sign out | dashboard.spec | Returns to login page |
| Minutes create | minutes.spec | Create → fill → save → URL changes to /minutes/:id |
| Minutes persist | minutes.spec | Reload preserves entered data |
| Minutes archive | minutes.spec | Created minutes appear in list |
| Minutes tabs | minutes.spec | All 6 tabs render without error |
| Agenda create | agenda.spec | Create with standard items pre-populated |
| Agenda ordering | agenda.spec | Standard items in expected order after save |
| Agenda custom items | agenda.spec | Add custom item, save, reload, verify |
| Agenda list | agenda.spec | Created agenda appears in list |
| Tenant isolation | isolation.spec | Fake UUID returns empty/redirect, no data leak |

## CI Integration

Add to your CI pipeline (GitHub Actions example):

```yaml
- name: Run E2E tests
  env:
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
  run: |
    npx playwright install chromium
    npm test
```

## Notes

- Tests run sequentially (`workers: 1`) to avoid auth state conflicts
- Auth setup runs once and saves browser state for all authenticated tests
- The dev server starts automatically if not already running
- Screenshots are captured on failure in `test-results/`
