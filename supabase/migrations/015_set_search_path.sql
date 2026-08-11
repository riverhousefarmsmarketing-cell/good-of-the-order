-- Migration: 015_set_search_path
-- Date: 2026-02-16
-- Description: Add SET search_path = public to all SECURITY DEFINER
--   functions missing it (CR-002 from security review)
-- Depends on: 014_security_hardening

ALTER FUNCTION get_user_org_id() SET search_path = public;
ALTER FUNCTION get_user_role() SET search_path = public;
ALTER FUNCTION is_org_admin() SET search_path = public;
ALTER FUNCTION is_org_editor() SET search_path = public;
