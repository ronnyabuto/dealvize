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

    // Get all meetings for the period
    const { data: meetings, error } = await supabase
      .from('video_meetings')
      .select(`
        *,
        attendees:meeting_attendees(*)
      `)
      .eq('user_id', user.id)
      .gte('scheduled_start_time', startDate.toISOString())
      .lte('scheduled_start_time', endDate.toISOString())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!meetings || meetings.length === 0) {
      return NextResponse.json({
        summary: {
          total_meetings: 0,
          completed_meetings: 0,
          cancelled_meetings: 0,
          no_show_meetings: 0,
          total_duration_minutes: 0,
          average_duration: 0,
          attendance_rate: 0,
          completion_rate: 0
        },
        meeting_volume_by_day: [],
        platform_breakdown: [],
        status_breakdown: [],
        attendance_trends: [],
        popular_time_slots: []
      })
    }

    // Calculate summary metrics
    const totalMeetings = meetings.length
    const completedMeetings = meetings.filter(m => m.status === 'completed').length
    const cancelledMeetings = meetings.filter(m => m.status === 'cancelled').length
    const noShowMeetings = meetings.filter(m => m.status === 'no_show').length

    const totalDurationMinutes = meetings
      .filter(m => m.actual_start_time && m.actual_end_time)
      .reduce((sum, meeting) => {
        const duration = Math.round(
          (new Date(meeting.actual_end_time).getTime() - new Date(meeting.actual_start_time).getTime()) / 1000 / 60
        )
        return sum + duration
      }, 0)

    const averageDuration = completedMeetings > 0 ? Math.round(totalDurationMinutes / completedMeetings) : 0

    const totalInvited = meetings.reduce((sum, meeting) => sum + (meeting.attendees?.length || 0), 0)
    const totalJoined = meetings.reduce((sum, meeting) => {
      return sum + (meeting.attendees?.filter(a => a.joined_at).length || 0)
    }, 0)
    const attendanceRate = totalInvited > 0 ? Math.round((totalJoined / totalInvited) * 100) : 0

    const completionRate = totalMeetings > 0 ? Math.round((completedMeetings / totalMeetings) * 100) : 0

    const meetingVolumeByDay = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayMeetingsCount = meetings.filter(meeting => 
        meeting.scheduled_start_time.split('T')[0] === dateStr
      ).length

      meetingVolumeByDay.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        meetings: dayMeetingsCount
      })
    }

    // Platform breakdown
    const platformGroups = meetings.reduce((acc, meeting) => {
      acc[meeting.meeting_platform] = (acc[meeting.meeting_platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const platformBreakdown = Object.entries(platformGroups).map(([platform, count]) => ({
      platform: platform.charAt(0).toUpperCase() + platform.slice(1),
      count,
      percentage: Math.round((count / totalMeetings) * 100)
    }))

    // Status breakdown
    const statusGroups = meetings.reduce((acc, meeting) => {
      acc[meeting.status] = (acc[meeting.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const statusBreakdown = Object.entries(statusGroups).map(([status, count]) => ({
      status: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      percentage: Math.round((count / totalMeetings) * 100)
    }))

    // Popular time slots analysis
    const timeSlotGroups = meetings.reduce((acc, meeting) => {
      const hour = new Date(meeting.scheduled_start_time).getHours()
      const timeSlot = `${hour}:00`
      acc[timeSlot] = (acc[timeSlot] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const popularTimeSlots = Object.entries(timeSlotGroups)
      .map(([timeSlot, count]) => ({
        time_slot: timeSlot,
        meeting_count: count,
        percentage: Math.round((count / totalMeetings) * 100)
      }))
      .sort((a, b) => b.meeting_count - a.meeting_count)
      .slice(0, 5)

    const attendanceTrends = []
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayMeetings = meetings.filter(meeting => 
        new Date(meeting.scheduled_start_time).getDay() === dayIndex
      )
      
      const dayInvited = dayMeetings.reduce((sum, meeting) => sum + (meeting.attendees?.length || 0), 0)
      const dayJoined = dayMeetings.reduce((sum, meeting) => {
        return sum + (meeting.attendees?.filter(a => a.joined_at).length || 0)
      }, 0)
      
      attendanceTrends.push({
        day: daysOfWeek[dayIndex],
        meetings: dayMeetings.length,
        invited: dayInvited,
        joined: dayJoined,
        attendance_rate: dayInvited > 0 ? Math.round((dayJoined / dayInvited) * 100) : 0
      })
    }

    return NextResponse.json({
      summary: {
        total_meetings: totalMeetings,
        completed_meetings: completedMeetings,
        cancelled_meetings: cancelledMeetings,
        no_show_meetings: noShowMeetings,
        total_duration_minutes: totalDurationMinutes,
        average_duration: averageDuration,
        attendance_rate: attendanceRate,
        completion_rate: completionRate
      },
      meeting_volume_by_day: meetingVolumeByDay,
      platform_breakdown: platformBreakdown,
      status_breakdown: statusBreakdown,
      attendance_trends: attendanceTrends,
      popular_time_slots: popularTimeSlots,
      period: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        days: date_range
      }
    })
  } catch (error) {
    console.error('Error fetching meeting analytics:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}