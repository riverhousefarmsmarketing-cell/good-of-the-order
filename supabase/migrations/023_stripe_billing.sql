-- Migration: 023_stripe_billing
-- Date: 2026-04-15
-- Description: Add Stripe billing fields to organizations table.
--   Supports subscription status gating, 14-day trial tracking, and permanent comps.
--   Lewis County Farm Bureau must be manually comped after this migration runs
--   (see comment at bottom).
-- Depends on: 022_feedback_table

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'comped')),
  ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS is_permanently_comped  BOOLEAN NOT NULL DEFAULT false;

-- Index for webhook lookups by Stripe customer ID (O(1) instead of full scan)
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
  ON organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ============================================================
-- RLS NOTES
-- ============================================================
-- The new columns are covered by existing org SELECT policies —
-- org members can already read their own organization row.
-- The stripe-webhook edge function uses the service role key
-- and bypasses RLS entirely, which is correct: Stripe events
-- arrive unauthenticated and must be validated by signature,
-- not by a user JWT.
-- No new RLS policies are needed.

-- ============================================================
-- POST-MIGRATION: COMP LEWIS COUNTY FARM BUREAU
-- ============================================================
-- Run this immediately after the migration. Do NOT skip it.
-- Lewis County is permanently comped as the founding pilot client.
-- Replace the name string if your org record uses a slightly different name.
--
-- UPDATE organizations
--   SET is_permanently_comped = true,
--       subscription_status = 'comped'
--   WHERE name = 'Lewis County Farm Bureau';
--
-- Verify with:
-- SELECT id, name, subscription_status, is_permanently_comped
--   FROM organizations
--   WHERE name ILIKE '%lewis%';

-- ============================================================
-- ROLLBACK REFERENCE (do not run unless reverting)
-- ============================================================
-- ALTER TABLE organizations
--   DROP COLUMN IF EXISTS stripe_customer_id,
--   DROP COLUMN IF EXISTS stripe_subscription_id,
--   DROP COLUMN IF EXISTS subscription_status,
--   DROP COLUMN IF EXISTS trial_ends_at,
--   DROP COLUMN IF EXISTS is_permanently_comped;
-- DROP INDEX IF EXISTS idx_organizations_stripe_customer;
