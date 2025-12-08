-- Affiliate System Helper Functions
-- Additional functions to support the affiliate routing system

-- Function to atomically increment affiliate stats
CREATE OR REPLACE FUNCTION increment_affiliate_stats(
  affiliate_id UUID,
  earnings_increment DECIMAL(10,2) DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE affiliate_programs
  SET 
    total_referrals = total_referrals + 1,
    total_earnings = total_earnings + earnings_increment,
    updated_at = NOW()
  WHERE id = affiliate_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get detailed affiliate stats for admin dashboard
CREATE OR REPLACE FUNCTION get_affiliate_detailed_stats(affiliate_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'affiliate', (
      SELECT json_build_object(
        'id', ap.id,
        'referral_code', ap.referral_code,
        'tier', ap.tier,
        'commission_rate', ap.commission_rate,
        'status', ap.status,
        'total_referrals', ap.total_referrals,
        'total_earnings', ap.total_earnings,
        'created_at', ap.created_at,
        'user', json_build_object(
          'id', u.id,
          'name', u.name,
          'email', u.email
        )
      )
      FROM affiliate_programs ap
      JOIN users u ON ap.user_id = u.id
      WHERE ap.id = affiliate_id
    ),
    'monthly_stats', (
      SELECT json_agg(
        json_build_object(
          'month', DATE_TRUNC('month', ar.created_at),
          'referrals', COUNT(*),
          'conversions', COUNT(*) FILTER (WHERE ar.status = 'confirmed'),
          'earnings', SUM(ar.commission_amount) FILTER (WHERE ar.status IN ('confirmed', 'paid'))
        )
      )
      FROM affiliate_referrals ar
      WHERE ar.affiliate_id = affiliate_id
        AND ar.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', ar.created_at)
      ORDER BY DATE_TRUNC('month', ar.created_at) DESC
    ),
    'recent_referrals', (
      SELECT json_agg(
        json_build_object(
          'id', ar.id,
          'status', ar.status,
          'commission_amount', ar.commission_amount,
          'created_at', ar.created_at,
          'conversion_date', ar.conversion_date,
          'referred_user', json_build_object(
            'name', u.name,
            'email', u.email
          )
        )
      )
      FROM affiliate_referrals ar
      LEFT JOIN users u ON ar.referred_user_id = u.id
      WHERE ar.affiliate_id = affiliate_id
      ORDER BY ar.created_at DESC
      LIMIT 20
    ),
    'click_analytics', (
      SELECT json_build_object(
        'total_clicks', COUNT(*),
        'unique_ips', COUNT(DISTINCT ip_address),
        'converted_clicks', COUNT(*) FILTER (WHERE converted = true),
        'conversion_rate', 
          CASE 
            WHEN COUNT(*) > 0 THEN 
              ROUND((COUNT(*) FILTER (WHERE converted = true))::numeric / COUNT(*) * 100, 2)
            ELSE 0 
          END,
        'countries', (
          SELECT json_agg(
            json_build_object(
              'country', COALESCE(country, 'Unknown'),
              'clicks', click_count
            )
          )
          FROM (
            SELECT 
              country,
              COUNT(*) as click_count
            FROM affiliate_clicks
            WHERE affiliate_id = affiliate_id
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY country
            ORDER BY click_count DESC
            LIMIT 10
          ) country_stats
        )
      )
      FROM affiliate_clicks
      WHERE affiliate_id = affiliate_id
        AND created_at >= NOW() - INTERVAL '30 days'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process referral conversion (when user makes first payment)
CREATE OR REPLACE FUNCTION process_referral_conversion(
  user_id UUID,
  subscription_amount DECIMAL(10,2),
  plan_type TEXT DEFAULT 'professional'
)
RETURNS JSON AS $$
DECLARE
  referral_record RECORD;
  commission_amount DECIMAL(10,2);
  result JSON;
BEGIN
  -- Find pending referral for this user
  SELECT ar.*, ap.commission_rate
  INTO referral_record
  FROM affiliate_referrals ar
  JOIN affiliate_programs ap ON ar.affiliate_id = ap.id
  WHERE ar.referred_user_id = user_id
    AND ar.status = 'pending'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'No pending referral found');
  END IF;
  
  -- Calculate commission
  commission_amount := subscription_amount * (referral_record.commission_rate / 100);
  
  -- Update referral to confirmed
  UPDATE affiliate_referrals
  SET 
    status = 'confirmed',
    commission_amount = commission_amount,
    subscription_amount = subscription_amount,
    conversion_date = NOW(),
    updated_at = NOW()
  WHERE id = referral_record.id;
  
  -- Update affiliate earnings
  UPDATE affiliate_programs
  SET 
    total_earnings = total_earnings + commission_amount,
    updated_at = NOW()
  WHERE id = referral_record.affiliate_id;
  
  -- Check for tier upgrade
  PERFORM check_and_upgrade_affiliate_tier(referral_record.affiliate_id);
  
  RETURN json_build_object(
    'success', true,
    'referral_id', referral_record.id,
    'commission_amount', commission_amount,
    'affiliate_id', referral_record.affiliate_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top performing affiliate links
CREATE OR REPLACE FUNCTION get_top_affiliate_links(limit_count INTEGER DEFAULT 10)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'referral_code', ap.referral_code,
      'user_name', u.name,
      'user_email', u.email,
      'tier', ap.tier,
      'total_clicks', COALESCE(click_stats.total_clicks, 0),
      'total_conversions', COALESCE(conversion_stats.total_conversions, 0),
      'total_earnings', ap.total_earnings,
      'conversion_rate', 
        CASE 
          WHEN COALESCE(click_stats.total_clicks, 0) > 0 THEN
            ROUND(COALESCE(conversion_stats.total_conversions, 0)::numeric / click_stats.total_clicks * 100, 2)
          ELSE 0
        END,
      'avg_commission', 
        CASE 
          WHEN COALESCE(conversion_stats.total_conversions, 0) > 0 THEN
            ROUND(ap.total_earnings / conversion_stats.total_conversions, 2)
          ELSE 0
        END
    )
  )
  INTO result
  FROM affiliate_programs ap
  JOIN users u ON ap.user_id = u.id
  LEFT JOIN (
    SELECT 
      affiliate_id,
      COUNT(*) as total_clicks
    FROM affiliate_clicks
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY affiliate_id
  ) click_stats ON ap.id = click_stats.affiliate_id
  LEFT JOIN (
    SELECT 
      affiliate_id,
      COUNT(*) as total_conversions
    FROM affiliate_referrals
    WHERE status IN ('confirmed', 'paid')
    GROUP BY affiliate_id
  ) conversion_stats ON ap.id = conversion_stats.affiliate_id
  WHERE ap.status = 'active'
  ORDER BY ap.total_earnings DESC, COALESCE(conversion_stats.total_conversions, 0) DESC
  LIMIT limit_count;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_affiliate_stats(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_affiliate_detailed_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral_conversion(UUID, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_affiliate_links(INTEGER) TO authenticated;

-- Create view for affiliate dashboard summary
CREATE OR REPLACE VIEW affiliate_dashboard_summary AS
SELECT 
  ap.id,
  ap.user_id,
  ap.referral_code,
  ap.tier,
  ap.commission_rate,
  ap.status,
  ap.total_referrals,
  ap.total_earnings,
  ap.created_at,
  u.name as user_name,
  u.email as user_email,
  COALESCE(recent_stats.clicks_30d, 0) as clicks_last_30_days,
  COALESCE(recent_stats.conversions_30d, 0) as conversions_last_30_days,
  COALESCE(pending_stats.pending_earnings, 0) as pending_earnings,
  COALESCE(paid_stats.total_paid, 0) as total_paid_out,
  CASE 
    WHEN COALESCE(recent_stats.clicks_30d, 0) > 0 THEN
      ROUND(recent_stats.conversions_30d::numeric / recent_stats.clicks_30d * 100, 2)
    ELSE 0
  END as conversion_rate_30d
FROM affiliate_programs ap
JOIN users u ON ap.user_id = u.id
LEFT JOIN (
  SELECT 
    ac.affiliate_id,
    COUNT(*) as clicks_30d,
    COUNT(*) FILTER (WHERE ac.converted = true) as conversions_30d
  FROM affiliate_clicks ac
  WHERE ac.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY ac.affiliate_id
) recent_stats ON ap.id = recent_stats.affiliate_id
LEFT JOIN (
  SELECT 
    affiliate_id,
    SUM(commission_amount) as pending_earnings
  FROM affiliate_referrals
  WHERE status = 'confirmed'
  GROUP BY affiliate_id
) pending_stats ON ap.id = pending_stats.affiliate_id
LEFT JOIN (
  SELECT 
    affiliate_id,
    SUM(amount) as total_paid
  FROM affiliate_payouts
  WHERE status = 'completed'
  GROUP BY affiliate_id
) paid_stats ON ap.id = paid_stats.affiliate_id;

-- Grant access to the view
GRANT SELECT ON affiliate_dashboard_summary TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_status_date ON affiliate_referrals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_date_converted ON affiliate_clicks(created_at, converted);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status_affiliate ON affiliate_payouts(status, affiliate_id);

COMMENT ON FUNCTION increment_affiliate_stats IS 'Atomically increments affiliate referral count and earnings';
COMMENT ON FUNCTION get_affiliate_detailed_stats IS 'Returns comprehensive stats for a specific affiliate';
COMMENT ON FUNCTION process_referral_conversion IS 'Processes referral conversion when user makes first payment';
COMMENT ON FUNCTION get_top_affiliate_links IS 'Returns top performing affiliate links with analytics';
COMMENT ON VIEW affiliate_dashboard_summary IS 'Summary view for affiliate dashboard with key metrics';