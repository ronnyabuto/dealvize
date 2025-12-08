import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const client_id = searchParams.get('client_id')
    const deal_id = searchParams.get('deal_id')
    const status = searchParams.get('status')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit

    let query = supabase
      .from('video_meetings')
      .select(`
        *,
        client:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value),
        attendees:meeting_attendees(
          id,
          attendee_email,
          attendee_name,
          status,
          joined_at,
          left_at
        )
      `)
      .eq('user_id', user.id)
      .order('scheduled_start_time', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (client_id) query = query.eq('client_id', client_id)
    if (deal_id) query = query.eq('deal_id', deal_id)
    if (status) query = query.eq('status', status)
    if (date_from) query = query.gte('scheduled_start_time', date_from)
    if (date_to) query = query.lte('scheduled_start_time', date_to)

    const { data: meetings, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('video_meetings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Apply same filters to count query
    if (client_id) countQuery = countQuery.eq('client_id', client_id)
    if (deal_id) countQuery = countQuery.eq('deal_id', deal_id)
    if (status) countQuery = countQuery.eq('status', status)
    if (date_from) countQuery = countQuery.gte('scheduled_start_time', date_from)
    if (date_to) countQuery = countQuery.lte('scheduled_start_time', date_to)

    const { count } = await countQuery

    return NextResponse.json({
      meetings: meetings || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching video meetings:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      client_id,
      deal_id,
      title,
      description,
      scheduled_start_time,
      scheduled_end_time,
      meeting_platform = 'zoom', // zoom, meet, teams, custom
      attendees = [], // Array of email addresses
      send_invitations = true,
      auto_record = false,
      waiting_room_enabled = true,
      password_required = false,
      meeting_password
    } = body

    // Validate required fields
    if (!title || !scheduled_start_time || !scheduled_end_time) {
      return NextResponse.json({
        error: 'Title, start time, and end time are required'
      }, { status: 400 })
    }

    // Validate client exists if client_id provided
    if (client_id) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, email')
        .eq('id', client_id)
        .eq('user_id', user.id)
        .single()

      if (clientError || !client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }

      // Add client email to attendees if not already included
      if (client.email && !attendees.includes(client.email)) {
        attendees.push(client.email)
      }
    }

    // Generate meeting room details
    const meetingRoom = await generateMeetingRoom(meeting_platform, {
      title,
      description,
      start_time: scheduled_start_time,
      end_time: scheduled_end_time,
      auto_record,
      waiting_room_enabled,
      password_required,
      password: meeting_password
    })

    // Create meeting record
    const { data: meeting, error } = await supabase
      .from('video_meetings')
      .insert({
        user_id: user.id,
        client_id,
        deal_id,
        title,
        description,
        scheduled_start_time,
        scheduled_end_time,
        meeting_platform,
        meeting_url: meetingRoom.join_url,
        meeting_id: meetingRoom.meeting_id,
        meeting_password: meetingRoom.password,
        host_url: meetingRoom.host_url,
        auto_record,
        waiting_room_enabled,
        password_required,
        status: 'scheduled'
      })
      .select(`
        *,
        client:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Add attendees to meeting_attendees table
    if (attendees.length > 0) {
      const attendeeRecords = attendees.map((email: string) => ({
        user_id: user.id,
        meeting_id: meeting.id,
        attendee_email: email,
        attendee_name: email.split('@')[0], // Extract name from email
        status: 'invited'
      }))

      await supabase
        .from('meeting_attendees')
        .insert(attendeeRecords)
    }

    // Send calendar invitations if requested
    if (send_invitations && attendees.length > 0) {
      await sendMeetingInvitations({
        meeting,
        attendees,
        user_email: user.email
      })
    }

    // Create follow-up task
    await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        client_id,
        deal_id,
        title: `Video Meeting: ${title}`,
        description: `Scheduled meeting for ${new Date(scheduled_start_time).toLocaleString()}`,
        task_type: 'meeting',
        due_date: scheduled_start_time,
        priority: 'high',
        status: 'pending',
        metadata: {
          meeting_id: meeting.id,
          meeting_url: meetingRoom.join_url,
          auto_generated: true
        }
      })

    // Record activity for lead scoring
    if (client_id) {
      await supabase
        .from('lead_activities')
        .insert({
          user_id: user.id,
          client_id,
          activity_type: 'meeting_scheduled',
          activity_data: {
            meeting_id: meeting.id,
            meeting_title: title,
            platform: meeting_platform,
            scheduled_start: scheduled_start_time
          },
          score_awarded: 20, // High value activity
          source: 'video_meeting'
        })
    }

    return NextResponse.json({ meeting }, { status: 201 })
  } catch (error) {
    console.error('Error creating video meeting:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const meetingId = searchParams.get('id')
    const body = await request.json()

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 })
    }

    const {
      title,
      description,
      scheduled_start_time,
      scheduled_end_time,
      status,
      actual_start_time,
      actual_end_time,
      meeting_notes,
      follow_up_required,
      follow_up_date
    } = body

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (scheduled_start_time) updateData.scheduled_start_time = scheduled_start_time
    if (scheduled_end_time) updateData.scheduled_end_time = scheduled_end_time
    if (status) updateData.status = status
    if (actual_start_time) updateData.actual_start_time = actual_start_time
    if (actual_end_time) updateData.actual_end_time = actual_end_time
    if (meeting_notes !== undefined) updateData.meeting_notes = meeting_notes
    if (typeof follow_up_required === 'boolean') updateData.follow_up_required = follow_up_required
    if (follow_up_date) updateData.follow_up_date = follow_up_date

    const { data: meeting, error } = await supabase
      .from('video_meetings')
      .update(updateData)
      .eq('id', meetingId)
      .eq('user_id', user.id)
      .select(`
        *,
        client:clients(id, first_name, last_name, email, phone),
        deal:deals(id, title, status, value),
        attendees:meeting_attendees(
          id,
          attendee_email,
          attendee_name,
          status,
          joined_at,
          left_at
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create follow-up task if required
    if (follow_up_required && follow_up_date && meeting.client_id) {
      await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          client_id: meeting.client_id,
          deal_id: meeting.deal_id,
          title: `Follow up on meeting: ${meeting.title}`,
          description: meeting_notes ? `Meeting notes: ${meeting_notes}` : undefined,
          task_type: 'follow_up',
          due_date: follow_up_date,
          priority: 'medium',
          status: 'pending'
        })
    }

    // Record meeting completion activity
    if (status === 'completed' && meeting.client_id) {
      const duration = actual_start_time && actual_end_time ? 
        Math.round((new Date(actual_end_time).getTime() - new Date(actual_start_time).getTime()) / 1000 / 60) : 0

      await supabase
        .from('lead_activities')
        .insert({
          user_id: user.id,
          client_id: meeting.client_id,
          activity_type: 'meeting_completed',
          activity_data: {
            meeting_id: meeting.id,
            meeting_title: meeting.title,
            duration_minutes: duration,
            platform: meeting.meeting_platform,
            has_notes: !!meeting_notes
          },
          score_awarded: 25, // Completed meeting is high value
          source: 'video_meeting'
        })
    }

    return NextResponse.json({ meeting })
  } catch (error) {
    console.error('Error updating video meeting:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const meetingId = searchParams.get('id')

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 })
    }

    // Delete attendees first
    await supabase
      .from('meeting_attendees')
      .delete()
      .eq('meeting_id', meetingId)

    // Delete the meeting
    const { error } = await supabase
      .from('video_meetings')
      .delete()
      .eq('id', meetingId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting video meeting:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

// Generate meeting room details for different platforms
async function generateMeetingRoom(platform: string, options: any) {
  const meetingId = generateMeetingId()
  const password = options.password_required ? generatePassword() : null

  switch (platform) {
    case 'zoom':
      // In production, integrate with Zoom API
      return {
        meeting_id: meetingId,
        join_url: `https://zoom.us/j/${meetingId}${password ? `?pwd=${password}` : ''}`,
        host_url: `https://zoom.us/s/${meetingId}?role=1`,
        password: password
      }
    
    case 'meet':
      // In production, integrate with Google Meet API
      const meetCode = generateMeetCode()
      return {
        meeting_id: meetCode,
        join_url: `https://meet.google.com/${meetCode}`,
        host_url: `https://meet.google.com/${meetCode}`,
        password: null // Google Meet doesn't use passwords
      }
    
    case 'teams':
      // In production, integrate with Microsoft Teams API
      return {
        meeting_id: meetingId,
        join_url: `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${meetingId}`,
        host_url: `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${meetingId}`,
        password: password
      }
    
    default:
      return {
        meeting_id: meetingId,
        join_url: `https://example.com/meeting/${meetingId}`,
        host_url: `https://example.com/meeting/${meetingId}/host`,
        password: password
      }
  }
}

function generateMeetingId(): string {
  return Math.random().toString().substr(2, 11)
}

function generateMeetCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let result = ''
  for (let i = 0; i < 3; i++) {
    if (i > 0) result += '-'
    for (let j = 0; j < 4; j++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }
  return result
}

function generatePassword(): string {
  return Math.random().toString(36).slice(-8)
}

async function sendMeetingInvitations(data: any) {
  // In production, integrate with email service to send calendar invitations
  console.log('Sending meeting invitations:', {
    meeting: data.meeting.title,
    attendees: data.attendees,
    start_time: data.meeting.scheduled_start_time
  })
  
  // Simulate successful sending
  return { success: true }
}