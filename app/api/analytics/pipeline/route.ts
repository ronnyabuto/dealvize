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
        message: 'Please sign in to access pipeline analytics'
      }, { status: 401 })
    }

    // Try to fetch real pipeline data  
    const { data: deals, error } = await supabase
      .from('deals')
      .select('status, value')
      .eq('user_id', user.id)
      .neq('status', 'Lost')

    if (error) {
      console.error('Pipeline query error:', error)
      return NextResponse.json({
        error: 'Failed to fetch pipeline data',
        message: error.message
      }, { status: 500 })
    }

    // Process real data - map actual deal statuses to pipeline stages
    const stageData = {
      'Lead': { count: 0, value: 0 },
      'In Progress': { count: 0, value: 0 },
      'Under Contract': { count: 0, value: 0 },
      'Closed': { count: 0, value: 0 }
    }

    // Process deals if any exist
    if (deals && deals.length > 0) {
      deals.forEach(deal => {
        const status = deal.status || 'Lead'
        
        if (stageData[status]) {
          stageData[status].count++
          stageData[status].value += deal.value || 0
        }
      })
    }

    return NextResponse.json({
      pipeline: {
        labels: ['Leads', 'In Progress', 'Under Contract', 'Closed'],
        data: [
          stageData['Lead'].count,
          stageData['In Progress'].count,
          stageData['Under Contract'].count,
          stageData['Closed'].count
        ],
        values: [
          stageData['Lead'].value,
          stageData['In Progress'].value,
          stageData['Under Contract'].value,
          stageData['Closed'].value
        ],
        colors: ['#ef4444', '#f97316', '#eab308', '#22c55e']
      }
    })

  } catch (error) {
    console.error('Pipeline analytics error:', error)
    
    // Return empty data on any error
    return NextResponse.json({
      pipeline: {
        labels: ['Leads', 'In Progress', 'Under Contract', 'Closed'],
        data: [0, 0, 0, 0],
        values: [0, 0, 0, 0],
        colors: ['#ef4444', '#f97316', '#eab308', '#22c55e']
      }
    })
  }
}