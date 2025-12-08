-- Fix Affiliate RLS Policies - Remove Circular Dependencies
-- Run this to fix the infinite recursion issue

-- First, disable RLS temporarily to clean up
ALTER TABLE affiliate_programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks DISABLE ROW LEVEL SECURITY;

-- Drop all existing affiliate policies
DROP POLICY IF EXISTS "Users can view own affiliate program" ON affiliate_programs;
DROP POLICY IF EXISTS "Users can update own affiliate program" ON affiliate_programs;
DROP POLICY IF EXISTS "Users can insert own affiliate program" ON affiliate_programs;
DROP POLICY IF EXISTS "Users can view own referrals" ON affiliate_referrals;
DROP POLICY IF EXISTS "Users can view own payouts" ON affiliate_payouts;
DROP POLICY IF EXISTS "Users can insert own payout requests" ON affiliate_payouts;
DROP POLICY IF EXISTS "Super admins can view all affiliate data" ON affiliate_programs;
DROP POLICY IF EXISTS "Super admins can view all referrals" ON affiliate_referrals;
DROP POLICY IF EXISTS "Super admins can view all payouts" ON affiliate_payouts;
DROP POLICY IF EXISTS "Anyone can insert affiliate clicks" ON affiliate_clicks;

-- Re-enable RLS
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies (with IF NOT EXISTS equivalent)
DO $$ 
BEGIN
  -- Affiliate programs - users can manage their own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'affiliate_programs' AND policyname = 'affiliate_programs_user_all') THEN
    CREATE POLICY "affiliate_programs_user_all" ON affiliate_programs 
      FOR ALL USING (auth.uid() = user_id);
  END IF;

  -- Affiliate referrals - users can view their own referrals
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'affiliate_referrals' AND policyname = 'affiliate_referrals_user_select') THEN
    CREATE POLICY "affiliate_referrals_user_select" ON affiliate_referrals 
      FOR SELECT USING (
        affiliate_id IN (SELECT id FROM affiliate_programs WHERE user_id = auth.uid())
      );
  END IF;

  -- Allow system to insert referrals (for signup flow)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'affiliate_referrals' AND policyname = 'affiliate_referrals_system_insert') THEN
    CREATE POLICY "affiliate_referrals_system_insert" ON affiliate_referrals 
      FOR INSERT WITH CHECK (true);
  END IF;

  -- Affiliate payouts - users can manage their own payouts  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'affiliate_payouts' AND policyname = 'affiliate_payouts_user_select') THEN
    CREATE POLICY "affiliate_payouts_user_select" ON affiliate_payouts 
      FOR SELECT USING (
        affiliate_id IN (SELECT id FROM affiliate_programs WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'affiliate_payouts' AND policyname = 'affiliate_payouts_user_insert') THEN
    CREATE POLICY "affiliate_payouts_user_insert" ON affiliate_payouts 
      FOR INSERT WITH CHECK (
        affiliate_id IN (SELECT id FROM affiliate_programs WHERE user_id = auth.uid())
      );
  END IF;

  -- Affiliate clicks - allow public inserts for tracking
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'affiliate_clicks' AND policyname = 'affiliate_clicks_public_insert') THEN
    CREATE POLICY "affiliate_clicks_public_insert" ON affiliate_clicks 
      FOR INSERT WITH CHECK (true);
  END IF;

  -- Users can view their own click data
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'affiliate_clicks' AND policyname = 'affiliate_clicks_user_select') THEN
    CREATE POLICY "affiliate_clicks_user_select" ON affiliate_clicks 
      FOR SELECT USING (
        affiliate_id IN (SELECT id FROM affiliate_programs WHERE user_id = auth.uid())
      );
  END IF;

  RAISE NOTICE 'All RLS policies verified/created successfully';
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON affiliate_programs TO authenticated;
GRANT SELECT, INSERT ON affiliate_referrals TO authenticated;
GRANT SELECT, INSERT ON affiliate_payouts TO authenticated;
GRANT INSERT ON affiliate_clicks TO anon;
GRANT SELECT ON affiliate_clicks TO authenticated;

-- Verification
SELECT 'RLS policies fixed successfully' as status;