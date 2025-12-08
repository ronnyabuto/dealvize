-- ==============================================================================
-- DEALVIZE MASTER MIGRATION (v1.1 - STABILIZED)
-- ==============================================================================

BEGIN;

-- 1. EXTENSIONS & UTILITIES
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. CORE USER MANAGEMENT
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

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Read public profiles" ON public.users FOR SELECT USING (true);

-- 3. CRM CORE
-- ==============================================================================

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'new',
    lead_score INTEGER DEFAULT 0,
    ai_score_confidence DECIMAL(5,2),
    budget_min NUMERIC,
    budget_max NUMERIC,
    timeline TEXT,
    location_preference TEXT,
    notes TEXT,
    tags TEXT[],
    last_contact TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own clients" ON clients FOR ALL USING (auth.uid() = user_id);

-- Deals
-- FIX: Renamed 'stage' to 'status' to match Application Code and Zod Schema
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    value NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Qualified', -- Aligned with frontend enum
    probability INTEGER DEFAULT 10,
    expected_close_date DATE,
    commission NUMERIC DEFAULT 0,
    property_address TEXT,
    property_type TEXT,
    property_bedrooms INTEGER,
    property_bathrooms INTEGER,
    property_sqft INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_client_id ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own deals" ON deals FOR ALL USING (auth.uid() = user_id);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL, -- Explicit FK
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,     -- Explicit FK
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    is_complete BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Pending',
    type TEXT DEFAULT 'Other',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

-- 4. MISSING TABLES (CRITICAL FIXES)
-- ==============================================================================

-- Lead Scores (Was missing, crashing lead scoring service)
CREATE TABLE IF NOT EXISTS public.lead_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    category TEXT,
    factors JSONB DEFAULT '{}'::jsonb,
    history JSONB[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own lead scores" ON lead_scores FOR SELECT USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = lead_scores.client_id AND clients.user_id = auth.uid())
);

-- Conversation Messages (Was missing, crashing Inbox)
CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    channel TEXT NOT NULL, -- 'email', 'sms'
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_user_client ON conversation_messages(user_id, client_id);
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own messages" ON conversation_messages FOR ALL USING (auth.uid() = user_id);

-- 5. INFRASTRUCTURE & SETTINGS
-- ==============================================================================

-- Job Queue
CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending',
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
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

-- 6. PAYMENTS (Stripe)
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
    id TEXT PRIMARY KEY,
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

-- 7. AFFILIATE SYSTEM
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

-- 8. SUPER ADMIN
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

-- 9. TRIGGERS & AUTOMATION
-- ==============================================================================

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_timestamp BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_timestamp BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
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

  INSERT INTO public.commission_settings (user_id, default_percentage) VALUES (new.id, 2.5) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_preferences (user_id) VALUES (new.id) ON CONFLICT DO NOTHING;
  
  INSERT INTO public.audit_logs (user_id, action, resource, details)
  VALUES (new.id, 'user_signup', 'auth', '{"source": "trigger"}'::jsonb);

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'User creation trigger failed: %', SQLERRM;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;