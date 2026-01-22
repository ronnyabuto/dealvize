-- ==============================================================================
-- GOOGLE INTEGRATION MIGRATION
-- ==============================================================================
-- Adds tables required for Google Gmail and Calendar integration
-- 
-- Tables created:
--   1. user_integrations - Store OAuth tokens for user integrations
--   2. sync_states       - Track sync progress for Gmail/Calendar
--
-- SAFE TO RUN: Uses IF NOT EXISTS for all objects
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. USER INTEGRATIONS (OAuth token storage for Google, etc.)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    scopes TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_provider ON user_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_provider ON user_integrations(user_id, provider);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_integrations' AND policyname = 'Users manage own integrations') THEN
        CREATE POLICY "Users manage own integrations" ON user_integrations
            FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_integrations' AND policyname = 'Service role manages all integrations') THEN
        CREATE POLICY "Service role manages all integrations" ON user_integrations
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

DROP TRIGGER IF EXISTS user_integrations_updated_at ON user_integrations;
CREATE TRIGGER user_integrations_updated_at
    BEFORE UPDATE ON user_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 2. SYNC STATES (Track Gmail history ID and Calendar sync tokens)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sync_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    history_id TEXT,
    sync_token TEXT,
    channel_id TEXT,
    resource_id TEXT,
    expiration TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_sync_states_user_id ON sync_states(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_states_provider ON sync_states(provider);
CREATE INDEX IF NOT EXISTS idx_sync_states_user_provider ON sync_states(user_id, provider);

ALTER TABLE sync_states ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sync_states' AND policyname = 'Users manage own sync states') THEN
        CREATE POLICY "Users manage own sync states" ON sync_states
            FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sync_states' AND policyname = 'Service role manages all sync states') THEN
        CREATE POLICY "Service role manages all sync states" ON sync_states
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

DROP TRIGGER IF EXISTS sync_states_updated_at ON sync_states;
CREATE TRIGGER sync_states_updated_at
    BEFORE UPDATE ON sync_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================
-- After running, verify these tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN (
--     'user_integrations', 'sync_states'
-- );

COMMIT;

-- ==============================================================================
-- SUCCESS! Your database now has tables for:
-- - Google OAuth token storage (user_integrations)
-- - Gmail history tracking (sync_states)
-- - Calendar sync token tracking (sync_states)
-- ==============================================================================
