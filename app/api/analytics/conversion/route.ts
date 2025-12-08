import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to access conversion analytics'
      }, { status: 401 })
    }

    // Try to fetch real conversion data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { data: deals, error } = await supabase
      .from('deals')
      .select('stage, status, created_at, updated_at')
      .eq('user_id', user.id)
      .gte('updated_at', thirtyDaysAgo)

    if (error) {
      console.error('Conversion query error:', error)
      return NextResponse.json({
        error: 'Failed to fetch conversion data',
        message: error.message
      }, { status: 500 })
    }

    // Process data into weekly conversion rates
    const weeklyData = Array(4).fill(null).map(() => ({
      total_prospects: 0,
      qualified: 0,
      negotiating: 0,
      won: 0
    }))

    const now = new Date()
    
    // Process deals if any exist
    if (deals && deals.length > 0) {
      deals.forEach(deal => {
        const dealDate = new Date(deal.updated_at)
        const weekDiff = Math.floor((now.getTime() - dealDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
        
        if (weekDiff >= 0 && weekDiff < 4) {
          const weekIndex = 3 - weekDiff
          weeklyData[weekIndex].total_prospects++
          
          const stage = deal.stage?.toLowerCase() || 'prospect'
          const status = deal.status?.toLowerCase()
          
          if (status === 'won') {
            weeklyData[weekIndex].won++
          } else if (stage.includes('negotiat') || stage.includes('closing')) {
            weeklyData[weekIndex].negotiating++
          } else if (stage.includes('qualified') || stage.includes('demo')) {
            weeklyData[weekIndex].qualified++
          }
        }
      })
    }

    // Calculate conversion rates
    const prospect_to_qualified = weeklyData.map(week => 
      week.total_prospects > 0 ? Math.round((week.qualified / week.total_prospects) * 100) : 0
    )
    
    const qualified_to_negotiating = weeklyData.map(week =>
      week.qualified > 0 ? Math.round((week.negotiating / week.qualified) * 100) : 0
    )
    
    const negotiating_to_won = weeklyData.map(week =>
      week.negotiating > 0 ? Math.round((week.won / week.negotiating) * 100) : 0
    )
    
    const overall_rate = weeklyData.map(week =>
      week.total_prospects > 0 ? Math.round((week.won / week.total_prospects) * 100) : 0
    )

    return NextResponse.json({
      conversion: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        prospect_to_qualified,
        qualified_to_negotiating,
        negotiating_to_won,
        overall_rate
      }
    })

  } catch (error) {
    console.error('Conversion analytics error:', error)
    
    // Return empty data on any error
    return NextResponse.json({
      conversion: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        prospect_to_qualified: [0, 0, 0, 0],
        qualified_to_negotiating: [0, 0, 0, 0],
        negotiating_to_won: [0, 0, 0, 0],
        overall_rate: [0, 0, 0, 0]
      }
    })
  }
}