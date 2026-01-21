import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const type = searchParams.get('type') // 'messages', 'activities', 'notifications', 'workspaces'
    const workspace_id = searchParams.get('workspace_id') ?? undefined
    const entity_type = searchParams.get('entity_type') ?? undefined
    const entity_id = searchParams.get('entity_id') ?? undefined

    switch (type) {
      case 'messages':
        return await getMessages(supabase, user.id, workspace_id, entity_type, entity_id)
      case 'activities':
        return await getActivities(supabase, user.id, workspace_id, entity_type, entity_id)
      case 'notifications':
        return await getNotifications(supabase, user.id)
      case 'workspaces':
        return await getWorkspaces(supabase, user.id)
      default:
        return await getCollaborationOverview(supabase, user.id)
    }
  } catch (error) {
    console.error('Error fetching collaboration data:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()
    const { type } = body

    switch (type) {
      case 'message':
        return await createMessage(supabase, user.id, body)
      case 'workspace':
        return await createWorkspace(supabase, user.id, body)
      case 'activity':
        return await createActivity(supabase, user.id, body)
      case 'notification':
        return await createNotification(supabase, user.id, body)
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error creating collaboration item:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const body = await request.json()
    
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 })
    }

    switch (type) {
      case 'message':
        return await updateMessage(supabase, user.id, id, body)
      case 'workspace':
        return await updateWorkspace(supabase, user.id, id, body)
      case 'notification':
        return await updateNotification(supabase, user.id, id, body)
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating collaboration item:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

async function getMessages(supabase: any, userId: string, workspaceId?: string, entityType?: string, entityId?: string) {
  let query = supabase
    .from('collaboration_messages')
    .select(`
      *,
      sender:users!collaboration_messages_sender_id_fkey(
        id, email, full_name, avatar_url
      ),
      reactions:collaboration_message_reactions(
        id, reaction_type, user_id,
        user:users(id, email, full_name)
      ),
      replies:collaboration_messages!parent_message_id(
        id, content, created_at, sender_id,
        sender:users(id, email, full_name, avatar_url)
      )
    `)
    .or(`workspace_id.eq.${workspaceId},participants.cs.{${userId}}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (entityType && entityId) {
    query = query.eq('entity_type', entityType).eq('entity_id', entityId)
  }

  const { data: messages, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ messages: messages || [] })
}

async function getActivities(supabase: any, userId: string, workspaceId?: string, entityType?: string, entityId?: string) {
  let query = supabase
    .from('collaboration_activities')
    .select(`
      *,
      user:users!collaboration_activities_user_id_fkey(
        id, email, full_name, avatar_url
      )
    `)
    .or(`workspace_id.eq.${workspaceId},user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100)

  if (entityType && entityId) {
    query = query.eq('entity_type', entityType).eq('entity_id', entityId)
  }

  const { data: activities, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ activities: activities || [] })
}

async function getNotifications(supabase: any, userId: string) {
  const { data: notifications, error } = await supabase
    .from('collaboration_notifications')
    .select(`
      *,
      sender:users!collaboration_notifications_sender_id_fkey(
        id, email, full_name, avatar_url
      )
    `)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ notifications: notifications || [] })
}

async function getWorkspaces(supabase: any, userId: string) {
  const { data: workspaces, error } = await supabase
    .from('collaboration_workspaces')
    .select(`
      *,
      members:collaboration_workspace_members(
        user_id, role, joined_at,
        user:users(id, email, full_name, avatar_url)
      ),
      recent_messages:collaboration_messages(
        id, content, created_at, sender_id,
        sender:users(id, email, full_name)
      )
    `)
    .or(`created_by.eq.${userId},id.in.(${await getUserWorkspaceIds(supabase, userId)})`)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ workspaces: workspaces || [] })
}

async function getCollaborationOverview(supabase: any, userId: string) {
  const [messagesResult, activitiesResult, notificationsResult, workspacesResult] = await Promise.all([
    supabase
      .from('collaboration_messages')
      .select('id')
      .or(`sender_id.eq.${userId},participants.cs.{${userId}}`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    
    supabase
      .from('collaboration_activities')
      .select('id, activity_type')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    
    supabase
      .from('collaboration_notifications')
      .select('id')
      .eq('recipient_id', userId)
      .eq('is_read', false),
    
    supabase
      .from('collaboration_workspaces')
      .select('id')
      .or(`created_by.eq.${userId},id.in.(${await getUserWorkspaceIds(supabase, userId)})`)
  ])

  return NextResponse.json({
    overview: {
      messages_today: messagesResult.data?.length || 0,
      activities_today: activitiesResult.data?.length || 0,
      unread_notifications: notificationsResult.data?.length || 0,
      total_workspaces: workspacesResult.data?.length || 0
    }
  })
}

async function createMessage(supabase: any, userId: string, data: any) {
  const {
    workspace_id,
    entity_type,
    entity_id,
    content,
    message_type = 'text',
    parent_message_id,
    mentions = [],
    attachments = []
  } = data

  // Validate required fields
  if (!content || (!workspace_id && (!entity_type || !entity_id))) {
    return NextResponse.json({
      error: 'Content and either workspace_id or entity details are required'
    }, { status: 400 })
  }

  const { data: message, error } = await supabase
    .from('collaboration_messages')
    .insert({
      sender_id: userId,
      workspace_id,
      entity_type,
      entity_id,
      content,
      message_type,
      parent_message_id,
      mentions,
      attachments,
      created_at: new Date().toISOString()
    })
    .select(`
      *,
      sender:users!collaboration_messages_sender_id_fkey(
        id, email, full_name, avatar_url
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Create notifications for mentions
  if (mentions.length > 0) {
    await createMentionNotifications(supabase, userId, message.id, mentions, content)
  }

  // Create activity log
  await createActivity(supabase, userId, {
    type: 'activity',
    workspace_id,
    entity_type,
    entity_id,
    activity_type: 'message_sent',
    activity_data: {
      message_id: message.id,
      content_preview: content.substring(0, 100)
    }
  })

  return NextResponse.json({ message }, { status: 201 })
}

async function createWorkspace(supabase: any, userId: string, data: any) {
  const {
    name,
    description,
    workspace_type = 'project', // 'project', 'deal', 'client', 'general'
    entity_type,
    entity_id,
    is_public = false,
    initial_members = []
  } = data

  if (!name) {
    return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
  }

  const { data: workspace, error } = await supabase
    .from('collaboration_workspaces')
    .insert({
      name,
      description,
      workspace_type,
      entity_type,
      entity_id,
      is_public,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Add creator as admin member
  await supabase
    .from('collaboration_workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: 'admin',
      joined_at: new Date().toISOString()
    })

  // Add initial members
  if (initial_members.length > 0) {
    const memberInserts = initial_members.map((memberId: string) => ({
      workspace_id: workspace.id,
      user_id: memberId,
      role: 'member',
      joined_at: new Date().toISOString()
    }))

    await supabase
      .from('collaboration_workspace_members')
      .insert(memberInserts)
  }

  return NextResponse.json({ workspace }, { status: 201 })
}

async function createActivity(supabase: any, userId: string, data: any) {
  const {
    workspace_id,
    entity_type,
    entity_id,
    activity_type,
    activity_data = {},
    is_system = false
  } = data

  const { data: activity, error } = await supabase
    .from('collaboration_activities')
    .insert({
      user_id: userId,
      workspace_id,
      entity_type,
      entity_id,
      activity_type,
      activity_data,
      is_system,
      created_at: new Date().toISOString()
    })
    .select(`
      *,
      user:users!collaboration_activities_user_id_fkey(
        id, email, full_name, avatar_url
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ activity }, { status: 201 })
}

async function createNotification(supabase: any, userId: string, data: any) {
  const {
    recipient_id,
    notification_type,
    title,
    message,
    entity_type,
    entity_id,
    action_url,
    metadata = {}
  } = data

  if (!recipient_id || !notification_type || !title) {
    return NextResponse.json({
      error: 'recipient_id, notification_type, and title are required'
    }, { status: 400 })
  }

  const { data: notification, error } = await supabase
    .from('collaboration_notifications')
    .insert({
      sender_id: userId,
      recipient_id,
      notification_type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
      metadata,
      is_read: false,
      created_at: new Date().toISOString()
    })
    .select(`
      *,
      sender:users!collaboration_notifications_sender_id_fkey(
        id, email, full_name, avatar_url
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ notification }, { status: 201 })
}

async function updateMessage(supabase: any, userId: string, messageId: string, data: any) {
  const { content, is_edited = true } = data

  const { data: message, error } = await supabase
    .from('collaboration_messages')
    .update({
      content,
      is_edited,
      edited_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .eq('sender_id', userId) // Only allow editing own messages
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ message })
}

async function updateWorkspace(supabase: any, userId: string, workspaceId: string, data: any) {
  const updateData = {
    ...data,
    updated_at: new Date().toISOString()
  }

  // Check if user has permission to update workspace
  const { data: member } = await supabase
    .from('collaboration_workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!member || !['admin', 'moderator'].includes(member.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { data: workspace, error } = await supabase
    .from('collaboration_workspaces')
    .update(updateData)
    .eq('id', workspaceId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ workspace })
}

async function updateNotification(supabase: any, userId: string, notificationId: string, data: any) {
  const { data: notification, error } = await supabase
    .from('collaboration_notifications')
    .update(data)
    .eq('id', notificationId)
    .eq('recipient_id', userId) // Only allow updating own notifications
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ notification })
}

// Helper functions
async function getUserWorkspaceIds(supabase: any, userId: string) {
  const { data: memberships } = await supabase
    .from('collaboration_workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)

  return memberships?.map((m: any) => m.workspace_id).join(',') || ''
}

async function createMentionNotifications(supabase: any, senderId: string, messageId: string, mentions: string[], content: string) {
  const notifications = mentions.map(mentionedUserId => ({
    sender_id: senderId,
    recipient_id: mentionedUserId,
    notification_type: 'mention',
    title: 'You were mentioned in a message',
    message: content.substring(0, 200),
    entity_type: 'message',
    entity_id: messageId,
    metadata: {
      message_id: messageId
    },
    is_read: false,
    created_at: new Date().toISOString()
  }))

  await supabase
    .from('collaboration_notifications')
    .insert(notifications)
}