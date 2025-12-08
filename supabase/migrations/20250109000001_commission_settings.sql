-- Commission Settings Schema
-- User-specific commission rates and broker split configurations

-- Create commission_settings table
CREATE TABLE IF NOT EXISTS commission_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Core commission settings
    default_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 3.00 
        CHECK (default_commission_rate >= 0 AND default_commission_rate <= 100),
    broker_split_percentage DECIMAL(5,2) NOT NULL DEFAULT 50.00 
        CHECK (broker_split_percentage >= 0 AND broker_split_percentage <= 100),
    
    -- Commission structure and custom rates
    commission_structure TEXT NOT NULL DEFAULT 'flat' 
        CHECK (commission_structure IN ('flat', 'tiered', 'progressive')),
    custom_rates JSONB DEFAULT '{}',
    
    -- Settings metadata
    currency TEXT DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    effective_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one commission setting per user per tenant
    UNIQUE(user_id, tenant_id)
);

-- Add updated_at trigger
CREATE TRIGGER update_commission_settings_updated_at 
    BEFORE UPDATE ON commission_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own commission settings
CREATE POLICY "Users can view own commission settings" ON commission_settings
    FOR SELECT USING (
        auth.uid() = user_id OR
        -- Tenant admins can view all commission settings in their tenant
        EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.user_id = auth.uid() 
            AND tm.tenant_id = commission_settings.tenant_id
            AND tm.role IN ('owner', 'admin')
            AND tm.status = 'active'
        )
    );

-- Users can insert their own commission settings
CREATE POLICY "Users can create own commission settings" ON commission_settings
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        -- Verify user belongs to the tenant if tenant_id is specified
        (tenant_id IS NULL OR EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.user_id = auth.uid() 
            AND tm.tenant_id = commission_settings.tenant_id
            AND tm.status = 'active'
        ))
    );

-- Users can update their own commission settings, admins can update team settings
CREATE POLICY "Users can update commission settings" ON commission_settings
    FOR UPDATE USING (
        auth.uid() = user_id OR
        -- Tenant admins can update commission settings for their team
        EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.user_id = auth.uid() 
            AND tm.tenant_id = commission_settings.tenant_id
            AND tm.role IN ('owner', 'admin')
            AND tm.status = 'active'
        )
    );

-- Only users can delete their own settings, or tenant owners
CREATE POLICY "Delete commission settings" ON commission_settings
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.user_id = auth.uid() 
            AND tm.tenant_id = commission_settings.tenant_id
            AND tm.role = 'owner'
            AND tm.status = 'active'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_commission_settings_user_id ON commission_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_settings_tenant_id ON commission_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_settings_active ON commission_settings(is_active) WHERE is_active = true;

-- Helper function to get commission settings with defaults
CREATE OR REPLACE FUNCTION get_user_commission_settings(target_user_id UUID, target_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    tenant_id UUID,
    default_commission_rate DECIMAL(5,2),
    broker_split_percentage DECIMAL(5,2),
    commission_structure TEXT,
    custom_rates JSONB,
    currency TEXT,
    is_active BOOLEAN,
    effective_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Try to get existing commission settings
    RETURN QUERY
    SELECT cs.*
    FROM commission_settings cs
    WHERE cs.user_id = target_user_id
      AND (target_tenant_id IS NULL OR cs.tenant_id = target_tenant_id)
      AND cs.is_active = true
    ORDER BY cs.created_at DESC
    LIMIT 1;
    
    -- If no settings found, return with defaults
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::UUID as id,
            target_user_id as user_id,
            target_tenant_id as tenant_id,
            3.00::DECIMAL(5,2) as default_commission_rate,
            50.00::DECIMAL(5,2) as broker_split_percentage,
            'flat'::TEXT as commission_structure,
            '{}'::JSONB as custom_rates,
            'USD'::TEXT as currency,
            true::BOOLEAN as is_active,
            CURRENT_DATE as effective_date,
            NULL::TEXT as notes,
            NOW() as created_at,
            NOW() as updated_at;
    END IF;
END;
$$;

-- Function to calculate commission split
CREATE OR REPLACE FUNCTION calculate_commission_split(
    commission_amount DECIMAL(10,2),
    user_id UUID,
    tenant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    agent_amount DECIMAL(10,2),
    broker_amount DECIMAL(10,2),
    split_percentage DECIMAL(5,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    settings_record RECORD;
BEGIN
    -- Get commission settings
    SELECT * INTO settings_record
    FROM get_user_commission_settings(user_id, tenant_id)
    LIMIT 1;
    
    -- Calculate split
    RETURN QUERY
    SELECT 
        ROUND(commission_amount * (100 - settings_record.broker_split_percentage) / 100, 2) as agent_amount,
        ROUND(commission_amount * settings_record.broker_split_percentage / 100, 2) as broker_amount,
        settings_record.broker_split_percentage as split_percentage;
END;
$$;

-- Insert default commission settings for existing users without settings
INSERT INTO commission_settings (user_id, tenant_id, default_commission_rate, broker_split_percentage)
SELECT 
    tm.user_id,
    tm.tenant_id,
    3.00,  -- Default 3% commission
    50.00  -- Default 50/50 split
FROM tenant_members tm
LEFT JOIN commission_settings cs ON cs.user_id = tm.user_id AND cs.tenant_id = tm.tenant_id
WHERE tm.status = 'active' 
  AND cs.id IS NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON commission_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_commission_settings(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_commission_split(DECIMAL(10,2), UUID, UUID) TO authenticated;