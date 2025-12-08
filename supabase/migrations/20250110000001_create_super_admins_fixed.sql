-- Super Admin System - Fixed Version
-- Industry-standard platform administration with proper security
-- Created: 2025-01-10

-- Create super_admins table
CREATE TABLE IF NOT EXISTS super_admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    revoked_by UUID REFERENCES auth.users(id),
    revoked_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_super_admin_user UNIQUE(user_id),
    CONSTRAINT valid_revocation CHECK (
        (is_active = true AND revoked_by IS NULL AND revoked_at IS NULL) OR
        (is_active = false AND revoked_by IS NOT NULL AND revoked_at IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_active ON super_admins(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_super_admins_granted_at ON super_admins(granted_at);

-- Enable Row Level Security
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only super admins can view and manage super admin records
CREATE POLICY "Super admins can manage all super admin records" ON super_admins
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM super_admins sa 
            WHERE sa.user_id = auth.uid() 
            AND sa.is_active = true
        )
    );

-- Updated at trigger
CREATE TRIGGER update_super_admins_updated_at 
    BEFORE UPDATE ON super_admins 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add initial super admin - Fixed INSERT
INSERT INTO super_admins (user_id, is_active, notes, granted_at)
SELECT 
    au.id,
    true,
    'Initial platform super administrator - granted via migration',
    NOW()
FROM auth.users au
WHERE au.email = 'ronnyabuto@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM super_admins sa WHERE sa.user_id = au.id
);

-- If user already exists, just activate them
UPDATE super_admins 
SET 
    is_active = true,
    updated_at = NOW(),
    notes = COALESCE(notes, '') || ' | Super admin status activated via migration on ' || NOW()::date
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'ronnyabuto@gmail.com'
)
AND is_active = false;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON super_admins TO authenticated;

-- Comments for documentation
COMMENT ON TABLE super_admins IS 'Platform-level super administrators with full system access';
COMMENT ON COLUMN super_admins.user_id IS 'Reference to auth.users - the super admin user';
COMMENT ON COLUMN super_admins.is_active IS 'Whether super admin privileges are currently active';
COMMENT ON COLUMN super_admins.granted_by IS 'Who granted super admin status';
COMMENT ON COLUMN super_admins.granted_at IS 'When super admin status was granted';
COMMENT ON COLUMN super_admins.revoked_by IS 'Who revoked super admin status (if applicable)';
COMMENT ON COLUMN super_admins.revoked_at IS 'When super admin status was revoked (if applicable)';
COMMENT ON COLUMN super_admins.notes IS 'Administrative notes about this super admin assignment';