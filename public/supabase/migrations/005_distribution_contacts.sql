-- Migration: Distribution contacts + update distribution_logs
-- Run this in your Supabase SQL editor

-- Distribution contacts: simple email list, no auth required
CREATE TABLE IF NOT EXISTS distribution_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  group_label TEXT DEFAULT 'Board',  -- e.g., Board, Committee, Guest, Staff
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_distribution_contacts_org ON distribution_contacts(organization_id);

-- Disable RLS (matching your other tables)
ALTER TABLE distribution_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Through org" ON distribution_contacts FOR ALL USING (true) WITH CHECK (true);
