-- ==============================================================================
-- DEALVIZE MASTER MIGRATION (v1.0)
-- Conclusive setup for Auth, CRM, Payments, Affiliates, and Infrastructure
-- ==============================================================================

BEGIN;

-- 1. EXTENSIONS & UTILITIES
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For search capabilities

-- Helper for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. CORE USER MANAGEMENT (The Fix for Auth)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'Agent',
    phone TEXT,
    license_number TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users view/edit own profile
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
-- Public profile view (optional, for team features)
CREATE POLICY "Read public profiles" ON public.users FOR SELECT USING (true);

-- 3. CRM CORE (Clients, Deals, Tasks)
-- ==============================================================================

-- Clients (Leads)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'new', -- new, contacted, qualified, lost
    lead_score INTEGER DEFAULT 0,
    ai_score_confidence DECIMAL(5,2),
    budget_min NUMERIC,
    budget_max NUMERIC,
    timeline TEXT,
    location_preference TEXT,
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own clients" ON clients FOR ALL USING (auth.uid() = user_id);

-- Deals (Pipelines)
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    value NUMERIC DEFAULT 0,
    stage TEXT DEFAULT 'lead', -- lead, negotiation, contract, closed_won, closed_lost
    probability INTEGER DEFAULT 10,
    expected_close_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own deals" ON deals FOR ALL USING (auth.uid() = user_id);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    related_to_type TEXT, -- client, deal
    related_to_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    is_complete BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

-- 4. INFRASTRUCTURE & SETTINGS
-- ==============================================================================

-- Job Queue (For background processes like AI scoring)
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
-- Only service role usually accesses this, but we allow user to see their jobs
CREATE POLICY "User view own jobs" ON background_jobs FOR SELECT USING (payload->>'user_id' = auth.uid()::text);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own audit logs" ON audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);

-- Commission Settings
CREATE TABLE IF NOT EXISTS public.commission_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    default_percentage DECIMAL(5,2) DEFAULT 2.5,
    broker_split DECIMAL(5,2) DEFAULT 50.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own commissions" ON commission_settings FOR ALL USING (auth.uid() = user_id);

-- MLS Settings
CREATE TABLE IF NOT EXISTS public.mls_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mls_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own MLS settings" ON mls_settings FOR ALL USING (auth.uid() = user_id);

-- 5. PAYMENTS (Stripe)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT UNIQUE NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own customer" ON customers FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY, -- Stripe Sub ID
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id),
    status TEXT NOT NULL,
    price_id TEXT,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own sub" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- 6. AFFILIATE SYSTEM
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.affiliate_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    tier VARCHAR(20) DEFAULT 'bronze',
    status VARCHAR(20) DEFAULT 'active',
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own affiliate program" ON affiliate_programs FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_id UUID REFERENCES public.affiliate_programs(id),
    referred_user_id UUID REFERENCES public.users(id),
    status TEXT DEFAULT 'pending',
    commission_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own referrals" ON affiliate_referrals FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliate_programs WHERE user_id = auth.uid())
);

-- 7. SUPER ADMIN
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin access" ON super_admins FOR SELECT USING (
    EXISTS (SELECT 1 FROM super_admins sa WHERE sa.user_id = auth.uid() AND sa.is_active = true)
);

-- 8. TRIGGERS & AUTOMATION (The "Gluten" that holds it together)
-- ==============================================================================

-- A. Timestamp Triggers
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_timestamp BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_timestamp BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- B. The "Handle New User" Trigger (CRITICAL)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 1. Create Profile
  INSERT INTO public.users (id, email, name, role, phone, license_number, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'role', 'Agent'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'license_number',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();

  -- 2. Initialize Settings
  INSERT INTO public.commission_settings (user_id, default_percentage) VALUES (new.id, 2.5) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_preferences (user_id) VALUES (new.id) ON CONFLICT DO NOTHING;
  
  -- 3. Log
  INSERT INTO public.audit_logs (user_id, action, resource, details)
  VALUES (new.id, 'user_signup', 'auth', '{"source": "trigger"}'::jsonb);

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'User creation trigger failed: %', SQLERRM;
  RETURN new;
END;
$$;

-- Bind Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. SEED DATA (Super Admin)
-- ==============================================================================
-- This safely tries to make the specified email a super admin if they exist
DO $$
DECLARE
    target_email TEXT := 'ronnyabuto@gmail.com';
    target_uid UUID;
BEGIN
    SELECT id INTO target_uid FROM auth.users WHERE email = target_email;
    
    IF target_uid IS NOT NULL THEN
        INSERT INTO public.super_admins (user_id) VALUES (target_uid)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Ensure they exist in public.users (just in case)
        INSERT INTO public.users (id, email, name, role)
        VALUES (target_uid, target_email, 'System Admin', 'Owner')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

COMMIT;