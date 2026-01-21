-- ==============================================================================
-- COMPLETE SCHEMA FIX - ALL MISSING COLUMNS
-- ==============================================================================
-- Run this script in Supabase SQL Editor to fix ALL 500 errors
-- This is the comprehensive version based on full API route audit
-- ==============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX CLIENTS TABLE - ALL MISSING COLUMNS
-- ============================================================================

-- Company name
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS company TEXT DEFAULT '';

-- Physical address
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';

-- Last contact timestamp (used for sorting and display)
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS last_contact TIMESTAMPTZ DEFAULT NOW();

-- Lead scoring value
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;

-- Display name (for compatibility with legacy code)
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';

-- Initials for UI avatars
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS initials TEXT DEFAULT '';

-- ============================================================================
-- 2. FIX TASKS TABLE - ALL MISSING COLUMNS
-- ============================================================================

-- Task type with validation
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Other';

-- Add CHECK constraint for valid task types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tasks_type_check'
  ) THEN
    ALTER TABLE public.tasks 
      ADD CONSTRAINT tasks_type_check 
      CHECK (type IN ('Call', 'Email', 'Meeting', 'Follow-up', 'Document', 'Review', 'Other'));
  END IF;
END $$;

-- ============================================================================
-- 3. FIX DEALS TABLE - ENSURE ALL EXPECTED COLUMNS EXIST
-- ============================================================================

-- Property details columns (if not exist)
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS property_address TEXT DEFAULT '';

ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT '';

ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS property_bedrooms INTEGER DEFAULT 0;

ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS property_bathrooms NUMERIC(3,1) DEFAULT 0;

ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS property_sqft INTEGER DEFAULT 0;

-- Probability percentage
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 50;

-- Commission amount
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS commission NUMERIC(12,2) DEFAULT 0;

-- Expected close date
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS expected_close_date DATE;

-- ============================================================================
-- 4. ADD INDEXES FOR QUERY PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients(company);
CREATE INDEX IF NOT EXISTS idx_clients_last_contact ON public.clients(last_contact);
CREATE INDEX IF NOT EXISTS idx_clients_lead_score ON public.clients(lead_score);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON public.tasks(type);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON public.deals(expected_close_date);

-- ============================================================================
-- 5. UPDATE EXISTING NULL VALUES TO DEFAULTS
-- ============================================================================

-- Clients
UPDATE public.clients SET company = '' WHERE company IS NULL;
UPDATE public.clients SET address = '' WHERE address IS NULL;
UPDATE public.clients SET last_contact = created_at WHERE last_contact IS NULL;
UPDATE public.clients SET lead_score = 0 WHERE lead_score IS NULL;
UPDATE public.clients SET name = CONCAT(first_name, ' ', last_name) WHERE name IS NULL OR name = '';
UPDATE public.clients SET initials = UPPER(LEFT(first_name, 1) || LEFT(last_name, 1)) 
  WHERE initials IS NULL OR initials = '';

-- Tasks
UPDATE public.tasks SET type = 'Other' WHERE type IS NULL;

-- Deals
UPDATE public.deals SET property_address = '' WHERE property_address IS NULL;
UPDATE public.deals SET property_type = '' WHERE property_type IS NULL;
UPDATE public.deals SET property_bedrooms = 0 WHERE property_bedrooms IS NULL;
UPDATE public.deals SET property_bathrooms = 0 WHERE property_bathrooms IS NULL;
UPDATE public.deals SET property_sqft = 0 WHERE property_sqft IS NULL;
UPDATE public.deals SET probability = 50 WHERE probability IS NULL;
UPDATE public.deals SET commission = 0 WHERE commission IS NULL;

-- ============================================================================
-- 6. CREATE TRIGGER TO AUTO-UPDATE name AND initials ON INSERT/UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_client_computed_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name := CONCAT(NEW.first_name, ' ', NEW.last_name);
  NEW.initials := UPPER(LEFT(NEW.first_name, 1) || LEFT(NEW.last_name, 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_client_computed ON public.clients;
CREATE TRIGGER trg_update_client_computed
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_client_computed_fields();

-- ============================================================================
-- 7. RELOAD POSTGREST SCHEMA CACHE
-- ============================================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run separately to confirm success)
-- ============================================================================
-- 
-- -- Check clients columns
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'clients' 
-- ORDER BY ordinal_position;
--
-- -- Check tasks columns
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'tasks' 
-- ORDER BY ordinal_position;
--
-- -- Check deals columns
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'deals' 
-- ORDER BY ordinal_position;
--
-- -- Verify constraints
-- SELECT conname, contype FROM pg_constraint 
-- WHERE conrelid IN ('public.clients'::regclass, 'public.tasks'::regclass, 'public.deals'::regclass);
