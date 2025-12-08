-- User Preferences Schema
-- Create table for storing user preferences and settings

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create notification_settings table for specific notification preferences
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications JSONB DEFAULT '{}',
    in_app_notifications JSONB DEFAULT '{}',
    sms_notifications JSONB DEFAULT '{}',
    push_notifications JSONB DEFAULT '{}',
    frequency_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add updated_at trigger for user_preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at 
    BEFORE UPDATE ON notification_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Notification settings policies
CREATE POLICY "Users can view their own notification settings" ON notification_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings" ON notification_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings" ON notification_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings" ON notification_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Admin policies for user_preferences
CREATE POLICY "Admins can view all preferences" ON user_preferences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.user_id = auth.uid() 
            AND tm.role = 'admin'
            AND tm.status = 'active'
        )
    );

-- Admin policies for notification_settings
CREATE POLICY "Admins can view all notification settings" ON notification_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.user_id = auth.uid() 
            AND tm.role = 'admin'
            AND tm.status = 'active'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- Create function to get user preferences with defaults
CREATE OR REPLACE FUNCTION get_user_preferences_with_defaults(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_prefs JSONB;
    default_prefs JSONB;
BEGIN
    -- Default preferences structure
    default_prefs := '{
        "theme": "system",
        "language": "en",
        "timezone": "America/New_York",
        "dateFormat": "MM/DD/YYYY",
        "timeFormat": "12h",
        "dashboardLayout": "grid",
        "defaultDashboardView": "deals",
        "showWelcomeMessage": true,
        "compactMode": false,
        "emailNotifications": {
            "newDeals": true,
            "taskReminders": true,
            "systemUpdates": true,
            "marketingEmails": false,
            "weeklyDigest": true
        },
        "inAppNotifications": {
            "newMessages": true,
            "taskDeadlines": true,
            "dealUpdates": true,
            "systemAlerts": true
        },
        "defaultCurrency": "USD",
        "defaultCommissionRate": 3.0,
        "commissionStructure": "flat",
        "analyticsEnabled": true,
        "dataSharingEnabled": false,
        "profileVisibility": "team",
        "autoSave": true,
        "autoSaveInterval": 30,
        "confirmDeletions": true,
        "showAdvancedFeatures": false,
        "betaFeatures": false
    }';

    -- Get user preferences
    SELECT preferences INTO user_prefs
    FROM user_preferences
    WHERE user_id = target_user_id;

    -- If no preferences found, return defaults
    IF user_prefs IS NULL THEN
        RETURN default_prefs;
    END IF;

    -- Merge user preferences with defaults (user preferences take precedence)
    RETURN default_prefs || user_prefs;
END;
$$;

-- Create function to validate and sanitize preferences
CREATE OR REPLACE FUNCTION validate_user_preferences(prefs JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    validated_prefs JSONB := '{}';
BEGIN
    -- Theme validation
    IF prefs->>'theme' IN ('light', 'dark', 'system') THEN
        validated_prefs := validated_prefs || jsonb_build_object('theme', prefs->>'theme');
    END IF;

    -- Language validation (basic check)
    IF prefs->>'language' ~ '^[a-z]{2}(-[A-Z]{2})?$' THEN
        validated_prefs := validated_prefs || jsonb_build_object('language', prefs->>'language');
    END IF;

    -- Dashboard layout validation
    IF prefs->>'dashboardLayout' IN ('grid', 'list') THEN
        validated_prefs := validated_prefs || jsonb_build_object('dashboardLayout', prefs->>'dashboardLayout');
    END IF;

    -- Boolean field validations
    IF prefs ? 'compactMode' AND (prefs->>'compactMode')::boolean IS NOT NULL THEN
        validated_prefs := validated_prefs || jsonb_build_object('compactMode', (prefs->>'compactMode')::boolean);
    END IF;

    IF prefs ? 'autoSave' AND (prefs->>'autoSave')::boolean IS NOT NULL THEN
        validated_prefs := validated_prefs || jsonb_build_object('autoSave', (prefs->>'autoSave')::boolean);
    END IF;

    -- Auto save interval validation (must be positive number)
    IF prefs ? 'autoSaveInterval' AND (prefs->>'autoSaveInterval')::numeric > 0 THEN
        validated_prefs := validated_prefs || jsonb_build_object('autoSaveInterval', (prefs->>'autoSaveInterval')::numeric);
    END IF;

    -- Email notifications validation (if provided)
    IF prefs ? 'emailNotifications' AND jsonb_typeof(prefs->'emailNotifications') = 'object' THEN
        validated_prefs := validated_prefs || jsonb_build_object('emailNotifications', prefs->'emailNotifications');
    END IF;

    -- In-app notifications validation (if provided)
    IF prefs ? 'inAppNotifications' AND jsonb_typeof(prefs->'inAppNotifications') = 'object' THEN
        validated_prefs := validated_prefs || jsonb_build_object('inAppNotifications', prefs->'inAppNotifications');
    END IF;

    RETURN validated_prefs;
END;
$$;

-- Insert default preferences for existing users who don't have any
INSERT INTO user_preferences (user_id, preferences)
SELECT 
    id as user_id,
    get_user_preferences_with_defaults(id) as preferences
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_preferences TO authenticated;
GRANT ALL ON notification_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferences_with_defaults(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_user_preferences(JSONB) TO authenticated;