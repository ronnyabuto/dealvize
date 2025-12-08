-- Affiliate Marketing System Tables
-- Run this in your Supabase SQL editor

-- Create affiliate programs table
CREATE TABLE affiliate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  tier VARCHAR(20) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  total_referrals INTEGER DEFAULT 0 CHECK (total_referrals >= 0),
  total_earnings DECIMAL(10,2) DEFAULT 0.00 CHECK (total_earnings >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create affiliate referrals table
CREATE TABLE affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  commission_amount DECIMAL(10,2) DEFAULT 0.00 CHECK (commission_amount >= 0),
  subscription_amount DECIMAL(10,2),
  conversion_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create affiliate payouts table
CREATE TABLE affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payment_method VARCHAR(50) NOT NULL,
  payment_details JSONB,
  transaction_id VARCHAR(100),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create affiliate tracking table (for analytics)
CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliate_programs(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  referrer_url TEXT,
  landing_page TEXT,
  country VARCHAR(2),
  converted BOOLEAN DEFAULT FALSE,
  converted_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_affiliate_programs_user_id ON affiliate_programs(user_id);
CREATE INDEX idx_affiliate_programs_referral_code ON affiliate_programs(referral_code);
CREATE INDEX idx_affiliate_programs_status ON affiliate_programs(status);

CREATE INDEX idx_affiliate_referrals_affiliate_id ON affiliate_referrals(affiliate_id);
CREATE INDEX idx_affiliate_referrals_referred_user_id ON affiliate_referrals(referred_user_id);
CREATE INDEX idx_affiliate_referrals_status ON affiliate_referrals(status);
CREATE INDEX idx_affiliate_referrals_created_at ON affiliate_referrals(created_at);

CREATE INDEX idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);
CREATE INDEX idx_affiliate_payouts_status ON affiliate_payouts(status);

CREATE INDEX idx_affiliate_clicks_affiliate_id ON affiliate_clicks(affiliate_id);
CREATE INDEX idx_affiliate_clicks_referral_code ON affiliate_clicks(referral_code);
CREATE INDEX idx_affiliate_clicks_created_at ON affiliate_clicks(created_at);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_affiliate_programs_updated_at BEFORE UPDATE ON affiliate_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_affiliate_referrals_updated_at BEFORE UPDATE ON affiliate_referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_affiliate_payouts_updated_at BEFORE UPDATE ON affiliate_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Users can only see their own affiliate data
CREATE POLICY "Users can view own affiliate program" ON affiliate_programs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own affiliate program" ON affiliate_programs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own affiliate program" ON affiliate_programs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can see referrals from their affiliate program
CREATE POLICY "Users can view own referrals" ON affiliate_referrals FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliate_programs WHERE user_id = auth.uid())
);

-- Users can see their own payouts
CREATE POLICY "Users can view own payouts" ON affiliate_payouts FOR SELECT USING (
  affiliate_id IN (SELECT id FROM affiliate_programs WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own payout requests" ON affiliate_payouts FOR INSERT WITH CHECK (
  affiliate_id IN (SELECT id FROM affiliate_programs WHERE user_id = auth.uid())
);

-- Super admins can see everything
CREATE POLICY "Super admins can view all affiliate data" ON affiliate_programs FOR ALL USING (
  EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Super admins can view all referrals" ON affiliate_referrals FOR ALL USING (
  EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Super admins can view all payouts" ON affiliate_payouts FOR ALL USING (
  EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true)
);

-- Public access for affiliate clicks (needed for tracking)
CREATE POLICY "Anyone can insert affiliate clicks" ON affiliate_clicks FOR INSERT WITH CHECK (true);

-- Function to get affiliate stats (for admin dashboard)
CREATE OR REPLACE FUNCTION get_affiliate_platform_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_affiliates', (SELECT COUNT(*) FROM affiliate_programs WHERE status = 'active'),
    'total_referrals', (SELECT COUNT(*) FROM affiliate_referrals),
    'total_conversions', (SELECT COUNT(*) FROM affiliate_referrals WHERE status = 'confirmed'),
    'total_commissions', (SELECT COALESCE(SUM(commission_amount), 0) FROM affiliate_referrals WHERE status IN ('confirmed', 'paid')),
    'pending_commissions', (SELECT COALESCE(SUM(commission_amount), 0) FROM affiliate_referrals WHERE status = 'confirmed'),
    'paid_commissions', (SELECT COALESCE(SUM(commission_amount), 0) FROM affiliate_referrals WHERE status = 'paid'),
    'top_affiliates', (
      SELECT json_agg(
        json_build_object(
          'id', ap.id,
          'user_name', u.name,
          'user_email', u.email,
          'referral_code', ap.referral_code,
          'tier', ap.tier,
          'total_referrals', ap.total_referrals,
          'total_earnings', ap.total_earnings,
          'conversion_rate', 
            CASE 
              WHEN ap.total_referrals > 0 THEN 
                ROUND((SELECT COUNT(*) FROM affiliate_referrals ar WHERE ar.affiliate_id = ap.id AND ar.status = 'confirmed')::numeric / ap.total_referrals * 100, 2)
              ELSE 0 
            END
        )
      )
      FROM affiliate_programs ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.status = 'active'
      ORDER BY ap.total_earnings DESC
      LIMIT 10
    ),
    'recent_activity', (
      SELECT json_agg(
        json_build_object(
          'type', 
            CASE 
              WHEN ar.status = 'pending' THEN 'referral'
              WHEN ar.status = 'confirmed' THEN 'conversion'
              ELSE 'activity'
            END,
          'affiliate_name', u.name,
          'amount', ar.commission_amount,
          'date', ar.created_at,
          'status', ar.status
        )
      )
      FROM affiliate_referrals ar
      JOIN affiliate_programs ap ON ar.affiliate_id = ap.id
      JOIN users u ON ap.user_id = u.id
      ORDER BY ar.created_at DESC
      LIMIT 20
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically upgrade affiliate tiers
CREATE OR REPLACE FUNCTION check_and_upgrade_affiliate_tier(affiliate_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  current_referrals INTEGER;
  current_tier VARCHAR(20);
  new_tier VARCHAR(20);
  new_rate DECIMAL(5,2);
BEGIN
  -- Get current stats
  SELECT total_referrals, tier INTO current_referrals, current_tier
  FROM affiliate_programs 
  WHERE id = affiliate_id;
  
  -- Determine new tier
  IF current_referrals >= 50 THEN
    new_tier := 'platinum';
    new_rate := 0.30;
  ELSIF current_referrals >= 15 THEN
    new_tier := 'gold';
    new_rate := 0.20;
  ELSIF current_referrals >= 5 THEN
    new_tier := 'silver';
    new_rate := 0.15;
  ELSE
    new_tier := 'bronze';
    new_rate := 0.10;
  END IF;
  
  -- Update if tier changed
  IF new_tier != current_tier THEN
    UPDATE affiliate_programs 
    SET tier = new_tier, commission_rate = new_rate
    WHERE id = affiliate_id;
  END IF;
  
  RETURN new_tier;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-upgrade tier when referrals increase
CREATE OR REPLACE FUNCTION trigger_tier_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check on referral count increase
  IF NEW.total_referrals > OLD.total_referrals THEN
    PERFORM check_and_upgrade_affiliate_tier(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER affiliate_tier_upgrade_trigger
  AFTER UPDATE OF total_referrals ON affiliate_programs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_tier_upgrade();

-- Insert sample commission tiers configuration
INSERT INTO public.system_settings (key, value, description) VALUES
('affiliate_bronze_rate', '0.10', 'Bronze tier commission rate'),
('affiliate_silver_rate', '0.15', 'Silver tier commission rate (5+ referrals)'),
('affiliate_gold_rate', '0.20', 'Gold tier commission rate (15+ referrals)'),
('affiliate_platinum_rate', '0.30', 'Platinum tier commission rate (50+ referrals)'),
('affiliate_min_payout', '50.00', 'Minimum payout amount'),
('affiliate_cookie_days', '30', 'Referral attribution window in days')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE affiliate_programs IS 'Main affiliate program registrations';
COMMENT ON TABLE affiliate_referrals IS 'Tracks all referrals and their conversion status';
COMMENT ON TABLE affiliate_payouts IS 'Payout requests and payments to affiliates';
COMMENT ON TABLE affiliate_clicks IS 'Click tracking for affiliate links';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON affiliate_programs TO anon, authenticated;
GRANT ALL ON affiliate_programs TO authenticated;
GRANT ALL ON affiliate_referrals TO authenticated;
GRANT ALL ON affiliate_payouts TO authenticated;
GRANT INSERT ON affiliate_clicks TO anon;