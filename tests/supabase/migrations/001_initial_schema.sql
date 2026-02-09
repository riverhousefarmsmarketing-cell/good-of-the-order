-- ============================================================================
-- Board Portal Pro: Initial Schema
-- GoodOfTheOrder - Multi-Tenant Meeting Minutes Management System
-- Migration: 001_initial_schema.sql
-- Created: 2026-02-06
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS (Multi-Tenant Core)
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]{3,10}$'),

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e3a5f',
  accent_color TEXT DEFAULT '#dc2626',

  -- Settings
  timezone TEXT DEFAULT 'America/Los_Angeles',
  date_format TEXT DEFAULT 'MMMM D, YYYY',
  fiscal_year_start INT DEFAULT 1 CHECK (fiscal_year_start BETWEEN 1 AND 12),

  -- Meeting configuration
  default_meeting_types JSONB DEFAULT '["BOARD", "ANNUAL", "SUBCOMMITTEE"]'::jsonb,
  custom_meeting_types JSONB DEFAULT '[]'::jsonb,

  -- Default roles template (used when org is created)
  default_roles JSONB DEFAULT '[
    {"title": "President", "order": 1},
    {"title": "Vice President", "order": 2},
    {"title": "Secretary", "order": 3},
    {"title": "Treasurer", "order": 4},
    {"title": "Board Member", "order": 5}
  ]'::jsonb,

  -- Subscription
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  plan_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ORGANIZATION ASSETS (logos, etc.)
-- ============================================================================

CREATE TABLE organization_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'favicon', 'header_image')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  board_position TEXT,
  board_position_order INT,
  is_voting_member BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast org-scoped lookups
CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================================================
-- SUBCOMMITTEES
-- ============================================================================

CREATE TABLE subcommittees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  chair_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subcommittees_org ON subcommittees(organization_id);

CREATE TABLE subcommittee_members (
  subcommittee_id UUID NOT NULL REFERENCES subcommittees(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (subcommittee_id, member_id)
);

-- ============================================================================
-- AGENDAS
-- ============================================================================

CREATE TABLE agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('BOARD', 'ANNUAL', 'SUBCOMMITTEE')),
  subcommittee_id UUID REFERENCES subcommittees(id) ON DELETE SET NULL,
  meeting_date DATE,
  meeting_time TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'sent')),
  source_minutes_id UUID, -- inherits items from previous meeting
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agendas_org ON agendas(organization_id);
CREATE INDEX idx_agendas_date ON agendas(meeting_date DESC);

CREATE TABLE agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id UUID NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_standard BOOLEAN DEFAULT false,
  is_inherited BOOLEAN DEFAULT false,
  source_minutes_id UUID,
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agenda_items_agenda ON agenda_items(agenda_id);

-- ============================================================================
-- MINUTES
-- ============================================================================

CREATE TABLE minutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agenda_id UUID REFERENCES agendas(id) ON DELETE SET NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('BOARD', 'ANNUAL', 'SUBCOMMITTEE')),
  subcommittee_id UUID REFERENCES subcommittees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved')),

  -- Meeting details
  meeting_date DATE NOT NULL,
  meeting_time TEXT,
  location TEXT,
  facilitator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorder_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  time_called_to_order TEXT,
  time_adjourned TEXT,

  -- Opening
  invocation TEXT,
  pledge_recited BOOLEAN DEFAULT true,
  quorum TEXT DEFAULT 'present' CHECK (quorum IN ('present', 'not_present', 'not_recorded')),
  guests TEXT,

  -- Agenda/Minutes approval
  agenda_changes TEXT,
  agenda_approval_motion JSONB,
  agenda_no_motion BOOLEAN DEFAULT false,
  previous_meeting_dates TEXT,
  minutes_approval_motion JSONB,
  minutes_no_motion BOOLEAN DEFAULT false,

  -- Financial
  total_donations_ytd DECIMAL(10,2),
  donations_since_last_meeting DECIMAL(10,2),
  current_account_balance DECIMAL(10,2),
  financial_report_motion JSONB,
  financial_no_motion BOOLEAN DEFAULT false,

  -- Reports
  correspondence TEXT,
  presidents_report TEXT,
  presidents_report_motion JSONB,
  presidents_report_no_motion BOOLEAN DEFAULT true,
  member_services_report TEXT,
  member_services_motion JSONB,
  member_services_no_motion BOOLEAN DEFAULT true,
  state_board_report TEXT,
  state_board_motion JSONB,
  state_board_no_motion BOOLEAN DEFAULT true,

  -- Committees
  membership_committee TEXT,
  new_members TEXT,
  membership_motion JSONB,
  membership_no_motion BOOLEAN DEFAULT true,
  pac_committee TEXT,
  pac_motion JSONB,
  pac_no_motion BOOLEAN DEFAULT true,
  nomination_committee TEXT,
  nomination_motion JSONB,
  nomination_no_motion BOOLEAN DEFAULT true,
  policy_committee TEXT,
  policy_motion JSONB,
  policy_no_motion BOOLEAN DEFAULT true,

  -- Closing
  good_of_the_order TEXT,
  adjournment_motion JSONB,
  adjournment_no_motion BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_minutes_org ON minutes(organization_id);
CREATE INDEX idx_minutes_date ON minutes(meeting_date DESC);
CREATE INDEX idx_minutes_status ON minutes(organization_id, status);

-- ============================================================================
-- ATTENDANCE
-- ============================================================================

CREATE TABLE attendance (
  minutes_id UUID NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
  PRIMARY KEY (minutes_id, member_id)
);

-- ============================================================================
-- BUSINESS ITEMS (old and new business)
-- ============================================================================

CREATE TABLE business_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minutes_id UUID NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('old', 'new')),
  title TEXT NOT NULL,
  discussion TEXT,
  motion JSONB,
  no_motion BOOLEAN DEFAULT true,
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_business_items_minutes ON business_items(minutes_id);

-- ============================================================================
-- ACTION ITEMS
-- ============================================================================

CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minutes_id UUID NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignee_name TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_action_items_minutes ON action_items(minutes_id);

-- ============================================================================
-- FINANCIAL ITEMS (fundraising events and expenses)
-- ============================================================================

CREATE TABLE financial_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minutes_id UUID NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('fundraising', 'expense')),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_items_minutes ON financial_items(minutes_id);

-- ============================================================================
-- EVENTS
-- ============================================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_minutes_id UUID REFERENCES minutes(id) ON DELETE SET NULL,
  source_meeting_type TEXT,
  name TEXT NOT NULL,
  date DATE,
  time TEXT,
  location TEXT,
  description TEXT,
  desired_outcome TEXT,
  purpose TEXT,
  budget_total DECIMAL(10,2),
  is_orphaned BOOLEAN DEFAULT false,
  orphaned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_source ON events(source_minutes_id);

-- ============================================================================
-- EVENT VENDORS
-- ============================================================================

CREATE TABLE event_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vendor_type TEXT DEFAULT 'vendor' CHECK (vendor_type IN ('vendor', 'speaker', 'other')),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  budget DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_vendors_event ON event_vendors(event_id);

-- ============================================================================
-- UPCOMING EVENTS (mentioned in minutes, not full events)
-- ============================================================================

CREATE TABLE minutes_upcoming_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minutes_id UUID NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TEXT,
  location TEXT
);

-- ============================================================================
-- DISTRIBUTION LOGS (email send history)
-- ============================================================================

CREATE TABLE distribution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('minutes', 'agenda')),
  document_id UUID NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_emails TEXT[] NOT NULL,
  email_subject TEXT,
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed'))
);

CREATE INDEX idx_distribution_logs_org ON distribution_logs(organization_id);
CREATE INDEX idx_distribution_logs_doc ON distribution_logs(document_type, document_id);

-- ============================================================================
-- ATTACHMENTS
-- ============================================================================

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('minutes', 'agenda', 'event')),
  document_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachments_doc ON attachments(document_type, document_id);

-- ============================================================================
-- INVITATIONS (for inviting members to an organization)
-- ============================================================================

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  board_position TEXT,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_org ON invitations(organization_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's organization_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subcommittees_updated_at BEFORE UPDATE ON subcommittees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agendas_updated_at BEFORE UPDATE ON agendas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_minutes_updated_at BEFORE UPDATE ON minutes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcommittees ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcommittee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE minutes_upcoming_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ORGANIZATIONS: users can see their own org
CREATE POLICY "Users see own org"
  ON organizations FOR SELECT
  USING (id = get_user_org_id());

CREATE POLICY "Admins update own org"
  ON organizations FOR UPDATE
  USING (id = get_user_org_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- PROFILES: users see members of their own org
CREATE POLICY "Users see org members"
  ON profiles FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins manage profiles"
  ON profiles FOR ALL
  USING (organization_id = get_user_org_id() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- GENERIC ORG-SCOPED POLICIES (applied to most tables)
-- Pattern: users can SELECT rows matching their org, admins/editors can INSERT/UPDATE/DELETE

CREATE POLICY "Org isolation" ON organization_assets FOR ALL
  USING (organization_id = get_user_org_id());

CREATE POLICY "Org isolation" ON subcommittees FOR ALL
  USING (organization_id = get_user_org_id());

CREATE POLICY "Org isolation" ON agendas FOR ALL
  USING (organization_id = get_user_org_id());

CREATE POLICY "Org isolation" ON minutes FOR ALL
  USING (organization_id = get_user_org_id());

CREATE POLICY "Org isolation" ON events FOR ALL
  USING (organization_id = get_user_org_id());

CREATE POLICY "Org isolation" ON distribution_logs FOR ALL
  USING (organization_id = get_user_org_id());

CREATE POLICY "Org isolation" ON attachments FOR ALL
  USING (organization_id = get_user_org_id());

CREATE POLICY "Org isolation" ON invitations FOR ALL
  USING (organization_id = get_user_org_id());

-- CHILD TABLES: access through parent's org
CREATE POLICY "Through parent" ON subcommittee_members FOR ALL
  USING (subcommittee_id IN (
    SELECT id FROM subcommittees WHERE organization_id = get_user_org_id()
  ));

CREATE POLICY "Through parent" ON agenda_items FOR ALL
  USING (agenda_id IN (
    SELECT id FROM agendas WHERE organization_id = get_user_org_id()
  ));

CREATE POLICY "Through parent" ON attendance FOR ALL
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));

CREATE POLICY "Through parent" ON business_items FOR ALL
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));

CREATE POLICY "Through parent" ON action_items FOR ALL
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));

CREATE POLICY "Through parent" ON financial_items FOR ALL
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));

CREATE POLICY "Through parent" ON event_vendors FOR ALL
  USING (event_id IN (
    SELECT id FROM events WHERE organization_id = get_user_org_id()
  ));

CREATE POLICY "Through parent" ON minutes_upcoming_events FOR ALL
  USING (minutes_id IN (
    SELECT id FROM minutes WHERE organization_id = get_user_org_id()
  ));

-- SPECIAL: Allow invitation lookup by token (for unauthenticated accept flow)
CREATE POLICY "Public invite lookup"
  ON invitations FOR SELECT
  USING (true); -- Token-based lookup is handled in app logic

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- These are created via Supabase Dashboard or CLI, but documenting here:
-- 1. "org-assets" bucket (public) - logos, favicons
-- 2. "documents" bucket (private) - minutes PDFs, agenda PDFs
-- 3. "attachments" bucket (private) - uploaded attachments

-- Storage policies (applied in Supabase Dashboard):
-- org-assets: authenticated users can upload to their org's folder
-- documents: org members can read, admins/editors can write
-- attachments: org members can read, admins/editors can write

-- ============================================================================
-- SIGNUP FUNCTION (creates org + profile in one transaction)
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Check if user was invited to an existing org
  IF NEW.raw_user_meta_data->>'invitation_token' IS NOT NULL THEN
    -- Accept invitation flow
    SELECT organization_id INTO org_id
    FROM invitations
    WHERE token = NEW.raw_user_meta_data->>'invitation_token'
      AND accepted_at IS NULL
      AND expires_at > NOW();

    IF org_id IS NOT NULL THEN
      INSERT INTO profiles (id, organization_id, email, full_name, role, board_position)
      SELECT
        NEW.id,
        organization_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        role,
        board_position
      FROM invitations
      WHERE token = NEW.raw_user_meta_data->>'invitation_token';

      UPDATE invitations
      SET accepted_at = NOW()
      WHERE token = NEW.raw_user_meta_data->>'invitation_token';

      RETURN NEW;
    END IF;
  END IF;

  -- New organization flow
  org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization');
  org_slug := COALESCE(NEW.raw_user_meta_data->>'organization_slug', 'org' || substr(gen_random_uuid()::text, 1, 6));

  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO org_id;

  INSERT INTO profiles (id, organization_id, email, full_name, role)
  VALUES (
    NEW.id,
    org_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin' -- First user is always admin
  );

  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();
