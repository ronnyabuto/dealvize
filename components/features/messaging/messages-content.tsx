"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Mail, MessageSquare, Phone, Calendar, Star, Archive, 
  Search, Plus, Reply, Forward, Trash2, Filter,
  Clock, CheckCircle, AlertCircle, Loader2, Send
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Message {
  id: string
  subject?: string
  content: string
  direction: 'inbound' | 'outbound'
  status: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  is_read: boolean
  is_starred: boolean
  is_archived: boolean
  created_at: string
  sent_at?: string
  sender_name?: string
  sender_email?: string
  recipient_name?: string
  recipient_email?: string
  channel: {
    name: string
    display_name: string
    icon: string
    color: string
  }
  client?: {
    first_name: string
    last_name: string
    email: string
  }
  deal?: {
    title: string
    status: string
    value: number
  }
  reply_count?: number
}

interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
  body_text: string
  body_html?: string
  variables: string[]
  is_system: boolean
}

interface CommunicationChannel {
  id: string
  name: string
  display_name: string
  icon: string
  color: string
}

const channelIcons: Record<string, any> = {
  email: Mail,
  sms: MessageSquare,
  phone: Phone,
  meeting: Calendar,
  whatsapp: MessageSquare,
  social: MessageSquare,
  note: MessageSquare
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  read: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  bounced: 'bg-red-100 text-red-800'
}

export function MessagesContent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [channels, setChannels] = useState<CommunicationChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  
  // Filters
  const [activeTab, setActiveTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [channelFilter, setChannelFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")

  // Compose form
  const [composeData, setComposeData] = useState({
    channel_id: '',
    client_id: '',
    deal_id: '',
    subject: '',
    content: '',
    recipient_email: '',
    recipient_name: '',
    priority: 'normal' as const,
    template_id: ''
  })
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Template management
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'general',
    subject: '',
    body_text: ''
  })

  useEffect(() => {
    fetchMessages()
    fetchTemplates()
    fetchChannels()
  }, [activeTab, searchTerm, channelFilter, statusFilter, priorityFilter])

  const fetchMessages = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (channelFilter && channelFilter !== 'all') params.append('channel', channelFilter)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter) params.append('priority', priorityFilter)
      
      // Apply tab-specific filters
      if (activeTab === 'unread') params.append('is_read', 'false')
      if (activeTab === 'starred') params.append('is_starred', 'true')
      if (activeTab === 'archived') params.append('is_archived', 'true')
      if (activeTab === 'sent') params.append('direction', 'outbound')

      const response = await fetch(`/api/messages?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load messages' })
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/email-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/communication-channels')
      if (response.ok) {
        const data = await response.json()
        setChannels(data.channels || [])
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error)
    }
  }

  const handleMessageAction = async (messageId: string, action: string, value?: any) => {
    setActionLoading(messageId)
    try {
      const updateData: any = {}
      
      switch (action) {
        case 'mark_read':
          updateData.is_read = true
          break
        case 'mark_unread':
          updateData.is_read = false
          break
        case 'star':
          updateData.is_starred = true
          break
        case 'unstar':
          updateData.is_starred = false
          break
        case 'archive':
          updateData.is_archived = true
          break
        case 'unarchive':
          updateData.is_archived = false
          break
      }

      const response = await fetch(`/api/messages?id=${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        fetchMessages()
        setMessage({ type: 'success', text: `Message ${action.replace('_', ' ')}d successfully` })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || `Failed to ${action} message` })
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to ${action} message` })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    
    setActionLoading(messageId)
    try {
      const response = await fetch(`/api/messages?id=${messageId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchMessages()
        setMessage({ type: 'success', text: 'Message deleted successfully' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to delete message' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete message' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleComposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!composeData.content.trim()) {
      setMessage({ type: 'error', text: 'Message content is required' })
      return
    }

    setActionLoading('compose')
    try {
      // Get email channel
      const emailChannel = channels.find(c => c.name === 'email')
      if (!emailChannel) {
        setMessage({ type: 'error', text: 'Email channel not available' })
        return
      }

      const messageData = {
        ...composeData,
        channel_id: emailChannel.id,
        direction: 'outbound'
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Message sent successfully' })
        setComposeOpen(false)
        setComposeData({
          channel_id: '',
          client_id: '',
          deal_id: '',
          subject: '',
          content: '',
          recipient_email: '',
          recipient_name: '',
          priority: 'normal',
          template_id: ''
        })
        fetchMessages()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to send message' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send message' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId || templateId === 'none') return

    try {
      const response = await fetch('/api/email-templates/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          client_id: composeData.client_id || null,
          deal_id: composeData.deal_id || null
        })
      })

      if (response.ok) {
        const data = await response.json()
        setComposeData(prev => ({
          ...prev,
          subject: data.processed_template.subject,
          content: data.processed_template.body_text,
          template_id: templateId
        }))
      }
    } catch (error) {
      console.error('Failed to process template:', error)
    }
  }

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body_text) {
      setMessage({ type: 'error', text: 'Please fill in all template fields' })
      return
    }

    try {
      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Template created successfully' })
        fetchTemplates()
        setIsCreatingTemplate(false)
        setNewTemplate({ name: '', category: 'general', subject: '', body_text: '' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to create template' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create template' })
    }
  }

  const getChannelIcon = (channelName: string) => {
    const IconComponent = channelIcons[channelName] || MessageSquare
    return <IconComponent className="h-4 w-4" />
  }

  const filteredMessages = messages.filter(message => {
    if (activeTab === 'all') return !message.is_archived
    if (activeTab === 'unread') return !message.is_read && !message.is_archived
    if (activeTab === 'starred') return message.is_starred && !message.is_archived
    if (activeTab === 'archived') return message.is_archived
    if (activeTab === 'sent') return message.direction === 'outbound' && !message.is_archived
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading messages...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'bg-green-50 text-green-900 border-green-200' : ''}>
          {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Header with Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Compose Message</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleComposeSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipient_name">Recipient Name</Label>
                  <Input
                    id="recipient_name"
                    value={composeData.recipient_name}
                    onChange={(e) => setComposeData(prev => ({ ...prev, recipient_name: e.target.value }))}
                    placeholder="Enter recipient name"
                  />
                </div>
                <div>
                  <Label htmlFor="recipient_email">Recipient Email</Label>
                  <Input
                    id="recipient_email"
                    type="email"
                    value={composeData.recipient_email}
                    onChange={(e) => setComposeData(prev => ({ ...prev, recipient_email: e.target.value }))}
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template">Email Template</Label>
                  <Select value={composeData.template_id} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} {template.is_system && <Badge variant="outline" className="ml-2">System</Badge>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={composeData.priority} onValueChange={(value) => setComposeData(prev => ({ ...prev, priority: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={composeData.subject}
                  onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject"
                />
              </div>

              <div>
                <Label htmlFor="content">Message</Label>
                <Textarea
                  id="content"
                  value={composeData.content}
                  onChange={(e) => setComposeData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter your message..."
                  rows={8}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading === 'compose'}>
                  {actionLoading === 'compose' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Messages</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="starred">Starred</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
                  <p className="text-gray-500">No messages match your current filters.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((message) => (
                <Card 
                  key={message.id} 
                  className={`cursor-pointer hover:shadow-sm transition-shadow ${!message.is_read ? 'bg-blue-50 border-blue-200' : ''}`}
                  onClick={() => {
                    setSelectedMessage(message)
                    if (!message.is_read) {
                      handleMessageAction(message.id, 'mark_read')
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${message.channel.color === 'blue' ? 'bg-blue-600' : message.channel.color === 'green' ? 'bg-green-600' : message.channel.color === 'purple' ? 'bg-purple-600' : 'bg-gray-600'}`}>
                          {getChannelIcon(message.channel.name)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`font-medium ${!message.is_read ? 'font-bold' : ''}`}>
                              {message.direction === 'inbound' 
                                ? message.sender_name || message.sender_email || 'Unknown Sender'
                                : message.recipient_name || message.recipient_email || 'Unknown Recipient'
                              }
                            </span>
                            <Badge className={`text-xs ${priorityColors[message.priority]}`}>
                              {message.priority}
                            </Badge>
                            <Badge className={`text-xs ${statusColors[message.status as keyof typeof statusColors]}`}>
                              {message.status}
                            </Badge>
                            {message.client && (
                              <Badge variant="outline" className="text-xs">
                                {message.client.first_name} {message.client.last_name}
                              </Badge>
                            )}
                          </div>
                          
                          {message.subject && (
                            <div className={`text-sm mb-1 ${!message.is_read ? 'font-semibold' : 'text-gray-900'}`}>
                              {message.subject}
                            </div>
                          )}
                          
                          <div className="text-sm text-gray-600 line-clamp-2">
                            {message.content}
                          </div>
                          
                          <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {message.channel.display_name}
                            </Badge>
                            {message.deal && (
                              <span className="text-xs text-dealvize-teal">
                                Deal: {message.deal.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {message.is_starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMessageAction(message.id, message.is_starred ? 'unstar' : 'star')
                          }}
                          disabled={actionLoading === message.id}
                        >
                          {message.is_starred ? <Star className="h-4 w-4 text-yellow-500 fill-current" /> : <Star className="h-4 w-4" />}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMessageAction(message.id, message.is_archived ? 'unarchive' : 'archive')
                          }}
                          disabled={actionLoading === message.id}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteMessage(message.id)
                          }}
                          disabled={actionLoading === message.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Saved Templates</h3>
            <Button onClick={() => setIsCreatingTemplate(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Template
            </Button>
          </div>

          {/* Template Creation Dialog */}
          <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Email Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., Welcome Email"
                    value={newTemplate.name}
                    onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="template-category">Category</Label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={value => setNewTemplate({...newTemplate, category: value})}
                  >
                    <SelectTrigger id="template-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="welcome">Welcome</SelectItem>
                      <SelectItem value="deal_update">Deal Update</SelectItem>
                      <SelectItem value="property_alert">Property Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="template-subject">Subject Line</Label>
                  <Input
                    id="template-subject"
                    placeholder="e.g., Welcome to Our Service"
                    value={newTemplate.subject}
                    onChange={e => setNewTemplate({...newTemplate, subject: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="template-body">Email Body</Label>
                  <Textarea
                    id="template-body"
                    placeholder="Use {{client_name}}, {{deal_title}}, and other variables"
                    value={newTemplate.body_text}
                    onChange={e => setNewTemplate({...newTemplate, body_text: e.target.value})}
                    rows={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available variables: {`{{client_name}}`}, {`{{deal_title}}`}, {`{{agent_name}}`}, {`{{property_address}}`}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreatingTemplate(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTemplate}>
                    Save Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Templates Grid */}
          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
                  <p className="text-gray-500 mb-4">Create your first email template to speed up your communication.</p>
                  <Button onClick={() => setIsCreatingTemplate(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Create Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => (
                <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{template.name}</h4>
                      <Badge variant="outline" className="mt-1">
                        {template.category}
                      </Badge>
                    </div>
                    {template.is_system && (
                      <Badge className="bg-blue-100 text-blue-800">System</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-2">
                    Subject: {template.subject}
                  </p>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                    {template.body_text}
                  </p>
                  {template.variables && template.variables.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.variables.map((variable, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {'{'}{'{'}{variable}{'}'}{'}'}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setComposeData(prev => ({ ...prev, template_id: template.id }))
                        handleTemplateSelect(template.id)
                        setComposeOpen(true)
                      }}
                    >
                      <Send className="w-3 h-3 mr-1" /> Use Template
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${selectedMessage.channel.color === 'blue' ? 'bg-blue-600' : selectedMessage.channel.color === 'green' ? 'bg-green-600' : selectedMessage.channel.color === 'purple' ? 'bg-purple-600' : 'bg-gray-600'}`}>
                    {getChannelIcon(selectedMessage.channel.name)}
                  </div>
                  <span>{selectedMessage.subject || 'No Subject'}</span>
                </DialogTitle>
                <div className="flex items-center space-x-2">
                  <Badge className={`text-xs ${priorityColors[selectedMessage.priority]}`}>
                    {selectedMessage.priority}
                  </Badge>
                  <Badge className={`text-xs ${statusColors[selectedMessage.status as keyof typeof statusColors]}`}>
                    {selectedMessage.status}
                  </Badge>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>From:</strong> {selectedMessage.sender_name} &lt;{selectedMessage.sender_email}&gt;</div>
                  <div><strong>To:</strong> {selectedMessage.recipient_name} &lt;{selectedMessage.recipient_email}&gt;</div>
                  <div><strong>Date:</strong> {new Date(selectedMessage.created_at).toLocaleString()}</div>
                  {selectedMessage.client && (
                    <div><strong>Client:</strong> {selectedMessage.client.first_name} {selectedMessage.client.last_name}</div>
                  )}
                  {selectedMessage.deal && (
                    <div><strong>Deal:</strong> {selectedMessage.deal.title}</div>
                  )}
                </div>
              </div>
              
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-sm">
                  {selectedMessage.content}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setComposeData({
                      ...composeData,
                      recipient_email: selectedMessage.sender_email || '',
                      recipient_name: selectedMessage.sender_name || '',
                      subject: selectedMessage.subject ? `Re: ${selectedMessage.subject}` : '',
                      content: `\n\n--- Original Message ---\n${selectedMessage.content}`
                    })
                    setSelectedMessage(null)
                    setComposeOpen(true)
                  }}
                >
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setComposeData({
                      ...composeData,
                      subject: selectedMessage.subject ? `Fwd: ${selectedMessage.subject}` : '',
                      content: `\n\n--- Forwarded Message ---\nFrom: ${selectedMessage.sender_name} <${selectedMessage.sender_email}>\nDate: ${new Date(selectedMessage.created_at).toLocaleString()}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.content}`
                    })
                    setSelectedMessage(null)
                    setComposeOpen(true)
                  }}
                >
                  <Forward className="h-4 w-4 mr-2" />
                  Forward
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}