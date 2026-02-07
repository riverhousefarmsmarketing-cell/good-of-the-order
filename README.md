# GoodOfTheOrder - Week 1 Setup Guide

## What's In This Package

Everything needed to set up the new multi-tenant SaaS:

```
good-of-the-order/
├── supabase/migrations/
│   └── 001_initial_schema.sql    # Complete database schema + RLS + triggers
├── src/
│   ├── App.jsx                   # Router with all page routes
│   ├── main.jsx                  # Entry point
│   ├── components/
│   │   ├── auth/ProtectedRoute.jsx
│   │   └── layout/AppLayout.jsx  # Nav with org branding
│   ├── hooks/
│   │   ├── useAuth.js            # Auth + profile + org context
│   │   └── useOrganization.js    # Org branding provider
│   ├── lib/
│   │   ├── supabase.js           # Supabase client
│   │   └── fileNaming.js         # File naming conventions
│   └── pages/
│       ├── Login.jsx             # Sign in
│       ├── Signup.jsx            # Create account + org (2-step)
│       └── Dashboard.jsx         # Home dashboard
├── public/placeholder-logo.svg
├── package.json
├── vite.config.js
├── .env.example
├── .gitignore
└── index.html
```

---

## Step-by-Step Setup

### 1. Create GitHub Repository

```bash
# Option A: Create on GitHub.com
# Go to github.com/new -> name it "good-of-the-order" -> Create

# Option B: From command line
gh repo create good-of-the-order --public --clone
```

### 2. Copy These Files Into the Repo

Copy the entire folder contents into your new repo.

```bash
cd good-of-the-order
git add .
git commit -m "Initial scaffolding: auth, routing, Supabase schema"
git push origin main
```

### 3. Create Supabase Project

1. Go to **https://supabase.com** and sign in (or create account)
2. Click **"New Project"**
3. Fill in:
   - **Name:** GoodOfTheOrder
   - **Database Password:** (save this somewhere safe!)
   - **Region:** US West (or closest to you)
4. Wait ~2 minutes for project to provision

### 4. Run the Database Migration

1. In Supabase Dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open `supabase/migrations/001_initial_schema.sql` from this package
4. **Copy the entire file** and paste it into the SQL Editor
5. Click **"Run"**

You should see "Success" with no errors. This creates:
- 18 tables (organizations, profiles, minutes, agendas, events, etc.)
- Row Level Security on every table
- Auto-signup trigger that creates org + profile
- Updated_at triggers on all timestamped tables

### 5. Configure Supabase Auth

1. Go to **Authentication** -> **Providers** in Supabase Dashboard
2. Ensure **Email** provider is enabled
3. Go to **Authentication** -> **URL Configuration**
4. Set **Site URL** to `http://localhost:3000` (for dev)
5. Add **Redirect URLs:** `http://localhost:3000/**`

### 6. Create Storage Buckets

1. Go to **Storage** in Supabase Dashboard
2. Create three buckets:

| Bucket Name | Public | Purpose |
|-------------|--------|---------|
| `org-assets` | Yes | Logos, favicons |
| `documents` | No | Minutes/agenda PDFs |
| `attachments` | No | Uploaded files |

### 7. Get Your API Keys

1. Go to **Settings** -> **API** in Supabase Dashboard
2. Copy the **Project URL** (looks like `https://abcdefg.supabase.co`)
3. Copy the **anon/public key** (long string starting with `eyJ...`)

### 8. Configure Environment

```bash
cd good-of-the-order
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 9. Install & Run

```bash
npm install
npm run dev
```

Open **http://localhost:3000** - you should see the login page.

### 10. Connect Vercel

1. Go to **https://vercel.com** and import your GitHub repo
2. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy - your app is live!

**Remember to update Supabase Auth URL Configuration:**
- Add your Vercel URL to **Redirect URLs** (e.g., `https://goodoftheorder.vercel.app/**`)
- Update **Site URL** to your production URL when ready

---

## What the Schema Gives You

### Multi-Tenant Isolation
Every table has `organization_id` and Row Level Security ensures users only see their own org's data. The `get_user_org_id()` helper function makes policies clean and fast.

### Automatic Signup Flow
When a user signs up, the `handle_new_user_signup()` trigger automatically:
- Creates an organization (if new signup)
- Creates their profile
- Sets them as admin (first user)
- OR accepts an invitation (if using invite token)

### File Naming Convention
The `fileNaming.js` utility generates standardized filenames:
```
lcfb_minutes_board_2026-01-15_v2-approved.pdf
lcfb_agenda_board_2026-02-15.pdf
```

---

## Week 1 Checklist

- [ ] Create GitHub repo
- [ ] Copy files into repo and push
- [ ] Create Supabase project
- [ ] Run 001_initial_schema.sql in SQL Editor
- [ ] Configure Supabase Auth (email provider, URLs)
- [ ] Create storage buckets (org-assets, documents, attachments)
- [ ] Set up .env.local with Supabase credentials
- [ ] `npm install && npm run dev` - verify login page loads
- [ ] Create test account via signup flow
- [ ] Verify org + profile created in Supabase Dashboard (Table Editor)
- [ ] Deploy to Vercel and verify production build
- [ ] Update Supabase redirect URLs with Vercel domain

---

## What Comes Next (Week 2)

With the foundation in place, Week 2 adds:
- Organization settings page (logo upload, color picker)
- Member invitation system
- Member management UI
- Role-based permissions in the UI

The database is already ready for all of this.
