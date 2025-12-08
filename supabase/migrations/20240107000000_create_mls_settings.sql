-- Create MLS Settings and Audit Tables
-- Migration: 20240107000000_create_mls_settings

-- MLS Settings table to store user-specific MLS configuration
CREATE TABLE IF NOT EXISTS mls_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- MLS Audit Log table to track configuration changes
CREATE TABLE IF NOT EXISTS mls_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for MLS Settings
ALTER TABLE mls_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view their own MLS settings" ON mls_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MLS settings" ON mls_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MLS settings" ON mls_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MLS settings" ON mls_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for MLS Audit Log
ALTER TABLE mls_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view their own MLS audit logs" ON mls_audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Only the system can insert audit logs (via service role)
CREATE POLICY "System can insert MLS audit logs" ON mls_audit_log
    FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mls_settings_user_id ON mls_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_mls_audit_log_user_id ON mls_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mls_audit_log_created_at ON mls_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_mls_audit_log_action ON mls_audit_log(action);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on mls_settings
CREATE TRIGGER update_mls_settings_updated_at
    BEFORE UPDATE ON mls_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default MLS settings for existing users (optional)
-- This will create default Columbus MLS settings for any existing users
INSERT INTO mls_settings (user_id, settings)
SELECT 
    id as user_id,
    '{
        "provider": "CMLS",
        "environment": "production",
        "clientId": "",
        "clientSecret": "",
        "apiUrl": "https://api.columbusrealtors.com",
        "requestsPerMinute": 60,
        "requestsPerHour": 1000,
        "requestsPerDay": 10000,
        "propertyCacheTTL": 300,
        "searchCacheTTL": 180,
        "photosCacheTTL": 1800,
        "enableAutoSync": true,
        "syncInterval": 15,
        "batchSize": 100,
        "enableAutoPopulate": true,
        "enableMarketAnalysis": true,
        "enablePriceHistory": true,
        "enableComparables": true,
        "defaultSearchRadius": 1.0,
        "includeSchoolData": true,
        "includeNeighborhoodData": true,
        "includeTaxData": true
    }'::jsonb as settings
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM mls_settings)
ON CONFLICT (user_id) DO NOTHING;