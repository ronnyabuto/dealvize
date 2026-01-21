import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const date_range = parseInt(searchParams.get('date_range') || '30')
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - date_range)

    // Get all call logs for the period
    const { data: callLogs, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('call_start_time', startDate.toISOString())
      .lte('call_start_time', endDate.toISOString())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!callLogs || callLogs.length === 0) {
      return NextResponse.json({
        summary: {
          total_calls: 0,
          answered_calls: 0,
          missed_calls: 0,
          total_duration_minutes: 0,
          average_call_duration: 0,
          answer_rate: 0,
          total_cost: 0
        },
        call_volume_by_day: [],
        outcome_breakdown: [],
        call_type_breakdown: { inbound: 0, outbound: 0 },
        peak_hours: [],
        top_contacts: []
      })
    }

    // Calculate summary metrics
    const totalCalls = callLogs.length
    const answeredCalls = callLogs.filter(call => call.outcome === 'answered').length
    const missedCalls = callLogs.filter(call => call.outcome === 'no_answer' || call.outcome === 'busy').length
    const totalDurationSeconds = callLogs.reduce((sum, call) => sum + (call.duration_seconds || 0), 0)
    const totalDurationMinutes = Math.round(totalDurationSeconds / 60)
    const averageCallDuration = answeredCalls > 0 ? Math.round((totalDurationSeconds / answeredCalls) / 60) : 0
    const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0
    const totalCost = callLogs.reduce((sum, call) => sum + (call.cost || 0), 0)

    const callVolumeByDay = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayCallsCount = callLogs.filter(call => 
        call.call_start_time.split('T')[0] === dateStr
      ).length

      callVolumeByDay.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        calls: dayCallsCount
      })
    }

    // Outcome breakdown
    const outcomeGroups = callLogs.reduce((acc, call) => {
      acc[call.outcome] = (acc[call.outcome] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const outcomeBreakdown = Object.entries(outcomeGroups).map(([outcome, count]) => {
      const callCount = count as number
      return {
        outcome,
        count: callCount,
        percentage: Math.round((callCount / totalCalls) * 100)
      }
    })

    // Call type breakdown
    const callTypeBreakdown = {
      inbound: callLogs.filter(call => call.call_type === 'inbound').length,
      outbound: callLogs.filter(call => call.call_type === 'outbound').length
    }

    // Peak hours analysis
    const hourGroups = callLogs.reduce((acc, call) => {
      const hour = new Date(call.call_start_time).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const peakHours = Object.entries(hourGroups)
      .map(([hour, count]) => {
        const callCount = count as number
        return {
          hour: parseInt(hour),
          hour_display: formatHour(parseInt(hour)),
          calls: callCount
        }
      })
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5)

    const clientGroups = callLogs
      .filter(call => call.client_id)
      .reduce((acc, call) => {
        const key = call.client_id!
        if (!acc[key]) {
          acc[key] = { count: 0, duration: 0 }
        }
        acc[key].count++
        acc[key].duration += call.duration_seconds || 0
        return acc
      }, {} as Record<string, { count: number; duration: number }>)

    // Get client names for top contacts
    const topClientIds = Object.entries(clientGroups)
      .sort(([,a], [,b]) => (b as any).count - (a as any).count)
      .slice(0, 10)
      .map(([clientId]) => clientId)

    let topContacts: any[] = []
    if (topClientIds.length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone')
        .in('id', topClientIds)

      topContacts = topClientIds.map(clientId => {
        const client = clients?.find(c => c.id === clientId)
        const stats = clientGroups[clientId]
        return {
          client_id: clientId,
          name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
          phone: client?.phone,
          call_count: stats.count,
          total_duration_minutes: Math.round(stats.duration / 60)
        }
      }).filter(contact => contact.name !== 'Unknown')
    }

    return NextResponse.json({
      summary: {
        total_calls: totalCalls,
        answered_calls: answeredCalls,
        missed_calls: missedCalls,
        total_duration_minutes: totalDurationMinutes,
        average_call_duration: averageCallDuration,
        answer_rate: answerRate,
        total_cost: Math.round(totalCost * 100) / 100
      },
      call_volume_by_day: callVolumeByDay,
      outcome_breakdown: outcomeBreakdown,
      call_type_breakdown: callTypeBreakdown,
      peak_hours: peakHours,
      top_contacts: topContacts,
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        days: date_range
      }
    })
  } catch (error) {
    console.error('Error fetching call analytics:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM'
  if (hour === 12) return '12:00 PM'
  if (hour < 12) return `${hour}:00 AM`
  return `${hour - 12}:00 PM`
}