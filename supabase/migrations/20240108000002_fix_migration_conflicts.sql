-- Fix Migration Conflicts and Type Mismatches
-- Migration: 20240108000002_fix_migration_conflicts

-- Fix for ERROR: policy "Users can view their own MLS settings" already exists
-- Drop existing MLS policies if they exist
DROP POLICY IF EXISTS "Users can view their own MLS settings" ON mls_settings;
DROP POLICY IF EXISTS "Users can insert their own MLS settings" ON mls_settings;
DROP POLICY IF EXISTS "Users can update their own MLS settings" ON mls_settings;
DROP POLICY IF EXISTS "Users can delete their own MLS settings" ON mls_settings;
DROP POLICY IF EXISTS "Users can view their own MLS audit logs" ON mls_audit_log;
DROP POLICY IF EXISTS "System can insert MLS audit logs" ON mls_audit_log;

-- Recreate MLS policies
CREATE POLICY "Users can view their own MLS settings" ON mls_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MLS settings" ON mls_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MLS settings" ON mls_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MLS settings" ON mls_settings
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own MLS audit logs" ON mls_audit_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert MLS audit logs" ON mls_audit_log
    FOR INSERT WITH CHECK (true);

-- Fix for foreign key constraint error in subscription tables
-- Drop existing subscription tables and recreate with correct types
DROP TABLE IF EXISTS subscription_events CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP VIEW IF EXISTS subscription_details CASCADE;

-- Recreate customers table
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Recreate subscriptions table  
CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_price_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'trialing',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    plan_id TEXT,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Recreate subscription_events table with CORRECT UUID type for foreign key
CREATE TABLE subscription_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,  -- UUID not TEXT
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    event_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Re-enable RLS and recreate policies for subscription tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Customer policies
CREATE POLICY "Users can view their own customer data" ON customers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customer data" ON customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer data" ON customers
    FOR UPDATE USING (auth.uid() = user_id);

-- Subscription policies
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Subscription events policies
CREATE POLICY "Users can view their subscription events" ON subscription_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subscriptions s 
            WHERE s.id = subscription_events.subscription_id 
            AND s.user_id = auth.uid()
        )
    );

-- Recreate indexes
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_stripe_customer_id ON customers(stripe_customer_id);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);

CREATE INDEX idx_subscription_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);
CREATE INDEX idx_subscription_events_event_type ON subscription_events(event_type);

-- Recreate triggers
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Recreate subscription details view
CREATE VIEW subscription_details AS
SELECT 
    s.id,
    s.user_id,
    s.stripe_subscription_id,
    s.stripe_price_id,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.canceled_at,
    s.trial_start,
    s.trial_end,
    s.plan_id,
    s.quantity,
    s.created_at,
    s.updated_at,
    c.stripe_customer_id,
    c.email as customer_email
FROM subscriptions s
LEFT JOIN customers c ON s.customer_id = c.id;