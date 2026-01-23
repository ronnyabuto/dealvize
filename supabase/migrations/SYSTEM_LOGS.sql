-- ==============================================================================
-- SYSTEM OBSERVABILITY MIGRATION
-- ==============================================================================
-- Adds system_logs table for tracking server-side events and errors
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level TEXT CHECK (level IN ('info', 'warn', 'error', 'debug')),
    component TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimize for time-series querying
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_component ON system_logs(component);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);

-- Security: Only Admins can view logs, System can write
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_logs' AND policyname = 'Service role manages all logs') THEN
        CREATE POLICY "Service role manages all logs" ON system_logs
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
    
    -- Allow admins/users to view logs if needed (for now restricted to service role writing)
    -- We'll use service role client in the Diagnostics page to read them
END $$;
