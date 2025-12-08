// Consolidated chat types - eliminates duplicates across components

export interface Message {
  id: string
  conversation_id?: string
  sender_id?: string
  sender_name?: string
  sender_email?: string
  recipient_name?: string
  recipient_email?: string
  content: string
  message_type: 'text' | 'html' | 'file' | 'image' | 'system'
  direction: 'inbound' | 'outbound'
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'failed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_read: boolean
  is_starred: boolean
  is_archived: boolean
  attachments: Array<{
    url: string
    filename: string
    contentType: string
    size: number
  }>
  created_at: string
  updated_at: string
  sent_at?: string
  read_at?: string
  subject?: string
  metadata?: Record<string, any>
}

export interface Conversation {
  id: string
  title?: string
  customer_id?: string
  deal_id?: string
  assigned_agent_id?: string
  channel_type: string
  status: 'open' | 'assigned' | 'resolved' | 'closed' | 'archived'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  message_count: number
  created_at: string
  updated_at: string
  first_response_at?: string
  resolved_at?: string
  customer?: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone?: string
  }
  deal?: {
    id: string
    title: string
    status: string
    value: number
  }
  last_message?: Message
}

export interface ChatContact {
  id: string
  name: string
  type: 'client' | 'agent' | 'ai'
  avatar?: string
  status: 'online' | 'offline' | 'away'
  lastMessage?: string
  lastMessageTime?: string
  unreadCount: number
}

export interface CommunicationChannel {
  id: string
  name: string
  display_name: string
  icon: string
  color: string
  is_active: boolean
  configuration?: Record<string, any>
}

export interface MessageTemplate {
  id: string
  name: string
  category: string
  subject: string
  content: string
  variables: string[]
  is_system: boolean
}

// Simplified real-time types
export interface TypingIndicator {
  conversation_id: string
  user_id: string
  user_name: string
  is_typing: boolean
  timestamp: number
}

export interface PresenceState {
  user_id: string
  status: 'online' | 'away' | 'offline'
  last_seen?: string
}