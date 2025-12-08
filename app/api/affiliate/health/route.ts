import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test if affiliate tables exist and are accessible
    const results = {
      affiliate_programs: false,
      affiliate_referrals: false,
      affiliate_payouts: false
    }
    
    const errors = {
      affiliate_programs: null,
      affiliate_referrals: null,
      affiliate_payouts: null
    }
    
    // Check affiliate_programs table
    try {
      const { error: programsError } = await supabase
        .from('affiliate_programs')
        .select('id')
        .limit(1)
      
      results.affiliate_programs = !programsError
      errors.affiliate_programs = programsError?.message || null
    } catch (e) {
      results.affiliate_programs = false
      errors.affiliate_programs = e instanceof Error ? e.message : 'Unknown error'
    }
    
    // Check affiliate_referrals table
    try {
      const { error: referralsError } = await supabase
        .from('affiliate_referrals')
        .select('id')
        .limit(1)
      
      results.affiliate_referrals = !referralsError
      errors.affiliate_referrals = referralsError?.message || null
    } catch (e) {
      results.affiliate_referrals = false
      errors.affiliate_referrals = e instanceof Error ? e.message : 'Unknown error'
    }
    
    // Check affiliate_payouts table
    try {
      const { error: payoutsError } = await supabase
        .from('affiliate_payouts')
        .select('id')
        .limit(1)
      
      results.affiliate_payouts = !payoutsError
      errors.affiliate_payouts = payoutsError?.message || null
    } catch (e) {
      results.affiliate_payouts = false
      errors.affiliate_payouts = e instanceof Error ? e.message : 'Unknown error'
    }
    
    const allHealthy = Object.values(results).every(Boolean)
    
    if (!allHealthy) {
      const missingTables = Object.entries(results)
        .filter(([_, healthy]) => !healthy)
        .map(([table, _]) => table)
      
      return NextResponse.json({ 
        healthy: false, 
        tables: results,
        errors: errors,
        error: `Missing tables: ${missingTables.join(', ')}`,
        suggestion: 'Run the affiliate migration SQL: supabase/migrations/safe_affiliate_migration.sql',
        instructions: 'Open Supabase Dashboard → SQL Editor → Run the migration file'
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      healthy: true, 
      tables: results,
      message: 'All affiliate tables are ready' 
    })
    
  } catch (error) {
    return NextResponse.json({ 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Check database connection and authentication.'
    }, { status: 500 })
  }
}