-- ==============================================================================
-- DEALVIZE: FINAL MIGRATION SCRIPT
-- ==============================================================================
-- Run this script once in Supabase SQL Editor
-- This adds ONLY the missing tables required for the application to function
-- 
-- Tables created by this script:
--   1. sms_delivery_logs  - Required for Twilio SMS webhook status tracking
--   2. webhook_events     - Required for Stripe webhook idempotency
--   3. messages           - Required for Twilio inbound SMS handling
--   4. call_logs          - Required for voice call tracking
--
-- SAFE TO RUN: Uses IF NOT EXISTS for all objects
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. SMS DELIVERY LOGS (Required for Twilio outbound SMS status webhooks)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sms_delivery_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_sid TEXT NOT NULL,
    status TEXT NOT NULL,
    to_number TEXT,
    from_number TEXT,
    error_code TEXT,
    error_message TEXT,
    webhook_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_delivery_logs_message_sid ON sms_delivery_logs(message_sid);
CREATE INDEX IF NOT EXISTS idx_sms_delivery_logs_status ON sms_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_delivery_logs_created_at ON sms_delivery_logs(created_at);

-- RLS: Service role only (webhook endpoint uses service client)
ALTER TABLE sms_delivery_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sms_delivery_logs' AND policyname = 'Service role manages sms logs') THEN
        CREATE POLICY "Service role manages sms logs" ON sms_delivery_logs
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

-- ==============================================================================
-- 2. WEBHOOK EVENTS (Required for Stripe webhook idempotency)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    error TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_events' AND policyname = 'Service role manages webhook events') THEN
        CREATE POLICY "Service role manages webhook events" ON webhook_events
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

-- Timestamp trigger
CREATE OR REPLACE FUNCTION update_webhook_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhook_events_updated_at ON webhook_events;
CREATE TRIGGER webhook_events_updated_at
    BEFORE UPDATE ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_events_timestamp();

-- ==============================================================================
-- 3. MESSAGES (Required for Twilio inbound SMS handling)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    direction TEXT NOT NULL DEFAULT 'outbound', -- 'inbound' or 'outbound'
    from_number TEXT,
    to_number TEXT,
    body TEXT,
    status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_metadata_sid ON messages((metadata->>'twilio_sid'));

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users manage own messages') THEN
        CREATE POLICY "Users manage own messages" ON messages
            FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Service role manages all messages') THEN
        CREATE POLICY "Service role manages all messages" ON messages
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

-- Timestamp trigger
DROP TRIGGER IF EXISTS messages_updated_at ON messages;
CREATE TRIGGER messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 4. CALL LOGS (Required for voice call tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    call_sid TEXT UNIQUE,
    direction TEXT DEFAULT 'outbound', -- 'inbound' or 'outbound'
    from_number TEXT,
    to_number TEXT,
    status TEXT DEFAULT 'queued',
    duration_seconds INTEGER,
    call_start_time TIMESTAMPTZ,
    call_end_time TIMESTAMPTZ,
    outcome TEXT,
    notes TEXT,
    recording_url TEXT,
    transcription TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_client_id ON call_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid ON call_logs(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_logs' AND policyname = 'Users manage own call logs') THEN
        CREATE POLICY "Users manage own call logs" ON call_logs
            FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'call_logs' AND policyname = 'Service role manages all call logs') THEN
        CREATE POLICY "Service role manages all call logs" ON call_logs
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

-- Timestamp trigger
DROP TRIGGER IF EXISTS call_logs_updated_at ON call_logs;
CREATE TRIGGER call_logs_updated_at
    BEFORE UPDATE ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. ADD MISSING COLUMNS TO CUSTOMERS TABLE (for Stripe webhook)
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'full_name') THEN
        ALTER TABLE customers ADD COLUMN full_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'deleted_at') THEN
        ALTER TABLE customers ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================
-- After running, verify these tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN (
--     'sms_delivery_logs', 'webhook_events', 'messages', 'call_logs'
-- );

COMMIT;

-- ==============================================================================
-- SUCCESS! Your database now has all required tables for:
-- - Stripe webhook idempotency (webhook_events)
-- - Twilio SMS status webhooks (sms_delivery_logs)
-- - Twilio inbound SMS (messages)
-- - Voice call tracking (call_logs)
-- ==============================================================================
