-- =====================================================
-- DEALVIZE PAYMENT SYSTEM - CORE SCHEMA (SIMPLIFIED)
-- =====================================================
-- Minimal, production-ready payment tables without monitoring bloat

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID REFERENCES auth.users PRIMARY KEY,
    stripe_customer_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_stripe_id ON customers(stripe_customer_id);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own customer data" ON customers;
CREATE POLICY "Users can manage their own customer data" ON customers
    FOR ALL USING (auth.uid() = id);

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY, -- Stripe subscription ID
    user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    price_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
        'incomplete', 'incomplete_expired', 'trialing', 
        'active', 'past_due', 'canceled', 'unpaid'
    )),
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Service role can manage all
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- WEBHOOK EVENTS TABLE (MINIMAL)
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY, -- Stripe event ID
    type TEXT NOT NULL,
    processed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- No RLS needed - internal system data
ALTER TABLE webhook_events DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Customers update trigger
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Subscriptions update trigger
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get user's active subscription
CREATE OR REPLACE FUNCTION get_active_subscription(p_user_id UUID)
RETURNS TABLE (
    id TEXT,
    status TEXT,
    price_id TEXT,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.status, s.price_id, s.current_period_end, s.cancel_at_period_end
    FROM subscriptions s
    WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM subscriptions 
        WHERE user_id = p_user_id 
        AND status IN ('active', 'trialing')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEANUP FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_webhook_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Keep only last 7 days of webhook events
    DELETE FROM webhook_events 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERMISSIONS
-- =====================================================
GRANT ALL ON customers TO authenticated;
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON webhook_events TO service_role;
GRANT EXECUTE ON FUNCTION get_active_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_subscription TO authenticated;

-- =====================================================
-- COMPLETION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Core payment schema created successfully';
    RAISE NOTICE 'Tables: customers, subscriptions, webhook_events';
    RAISE NOTICE 'Functions: get_active_subscription, has_active_subscription, cleanup_webhook_events';
END
$$;