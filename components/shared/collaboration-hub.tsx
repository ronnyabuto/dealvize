"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  Users, Plus, MessageSquare, Bell, Activity, Settings, Send, 
  MoreVertical, Edit, Trash2, Reply, Heart, ThumbsUp, 
  Smile, AtSign, Paperclip, Hash, Search, Filter, Star,
  Clock, CheckCircle, AlertCircle, User, Video, Phone
} from "lucide-react"
import { toast } from "sonner"

interface Message {
  id: string
  content: string
  message_type: string
  sender_id: string
  sender: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  workspace_id?: string
  entity_type?: string
  entity_id?: string
  created_at: string
  edited_at?: string
  is_edited?: boolean
  parent_message_id?: string
  mentions?: string[]
  attachments?: any[]
  reactions?: any[]
  replies?: Message[]
}

interface Workspace {
  id: string
  name: string
  description?: string
  workspace_type: string
  entity_type?: string
  entity_id?: string
  is_public: boolean
  created_by: string
  created_at: string
  members?: any[]
  recent_messages?: Message[]
}

interface Activity {
  id: string
  user_id: string
  user: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  workspace_id?: string
  entity_type?: string
  entity_id?: string
  activity_type: string
  activity_data: any
  is_system: boolean
  created_at: string
}

interface Notification {
  id: string
  sender_id?: string
  sender?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  recipient_id: string
  notification_type: string
  title: string
  message?: string
  entity_type?: string
  entity_id?: string
  action_url?: string
  metadata: any
  is_read: boolean
  created_at: string
}

export function CollaborationHub() {
  const [activeTab, setActiveTab] = useState('messages')
  const [messages, setMessages] = useState<Message[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('')
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false)
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: '',
    workspace_type: 'general',
    is_public: false
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchWorkspaces()
    fetchNotifications()
    fetchActivities()
  }, [])

  useEffect(() => {
    if (selectedWorkspace) {
      fetchMessages()
    }
  }, [selectedWorkspace])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/collaboration?type=workspaces')
      if (!response.ok) throw new Error('Failed to fetch workspaces')
      
      const data = await response.json()
      setWorkspaces(data.workspaces || [])
      
      if (data.workspaces?.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(data.workspaces[0].id)
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error)
      toast.error('Failed to load workspaces')
    }
  }

  const fetchMessages = async () => {
    if (!selectedWorkspace) return

    try {
      const response = await fetch(`/api/collaboration?type=messages&workspace_id=${selectedWorkspace}`)
      if (!response.ok) throw new Error('Failed to fetch messages')
      
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    }
  }

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/collaboration?type=activities')
      if (!response.ok) throw new Error('Failed to fetch activities')
      
      const data = await response.json()
      setActivities(data.activities || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
      toast.error('Failed to load activities')
    }
  }

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/collaboration?type=notifications')
      if (!response.ok) throw new Error('Failed to fetch notifications')
      
      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Failed to load notifications')
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedWorkspace) return

    setLoading(true)
    try {
      const response = await fetch('/api/collaboration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'message',
          workspace_id: selectedWorkspace,
          content: newMessage,
          message_type: 'text'
        })
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()
      setMessages(prev => [data.message, ...prev])
      setNewMessage('')
      
      toast.success('Message sent')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const createWorkspace = async () => {
    if (!newWorkspace.name.trim()) return

    try {
      const response = await fetch('/api/collaboration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'workspace',
          ...newWorkspace
        })
      })

      if (!response.ok) throw new Error('Failed to create workspace')

      const data = await response.json()
      toast.success('Workspace created successfully')
      
      setShowCreateWorkspace(false)
      setNewWorkspace({
        name: '',
        description: '',
        workspace_type: 'general',
        is_public: false
      })
      
      await fetchWorkspaces()
      setSelectedWorkspace(data.workspace.id)
    } catch (error) {
      console.error('Error creating workspace:', error)
      toast.error('Failed to create workspace')
    }
  }

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/collaboration?type=notification&id=${notificationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_read: true })
      })

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString()
    }
  }

  const getActivityIcon = (activityType: string) => {
    const iconMap: { [key: string]: any } = {
      message_sent: MessageSquare,
      workspace_created: Users,
      member_added: User,
      file_uploaded: Paperclip,
      task_created: CheckCircle,
      call_started: Phone,
      meeting_scheduled: Video
    }
    return iconMap[activityType] || Activity
  }

  const getNotificationIcon = (notificationType: string) => {
    const iconMap: { [key: string]: any } = {
      mention: AtSign,
      message: MessageSquare,
      workspace_invite: Users,
      task_assigned: CheckCircle,
      reminder: Clock
    }
    return iconMap[notificationType] || Bell
  }

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Collaboration Hub
              </CardTitle>
              <CardDescription>
                Real-time team collaboration and communication
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showCreateWorkspace} onOpenChange={setShowCreateWorkspace}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Workspace
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Workspace</DialogTitle>
                    <DialogDescription>
                      Set up a new collaborative workspace
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="workspace-name">Workspace Name *</Label>
                      <Input
                        id="workspace-name"
                        value={newWorkspace.name}
                        onChange={(e) => setNewWorkspace({...newWorkspace, name: e.target.value})}
                        placeholder="e.g., Project Alpha Team"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workspace-description">Description</Label>
                      <Textarea
                        id="workspace-description"
                        value={newWorkspace.description}
                        onChange={(e) => setNewWorkspace({...newWorkspace, description: e.target.value})}
                        placeholder="Describe the purpose of this workspace"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Workspace Type</Label>
                        <Select value={newWorkspace.workspace_type} onValueChange={(value) => setNewWorkspace({...newWorkspace, workspace_type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                            <SelectItem value="deal">Deal</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 flex flex-col justify-end">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="public-workspace"
                            checked={newWorkspace.is_public}
                            onCheckedChange={(checked) => setNewWorkspace({...newWorkspace, is_public: checked})}
                          />
                          <Label htmlFor="public-workspace">Public Workspace</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateWorkspace(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createWorkspace} disabled={!newWorkspace.name}>
                      Create Workspace
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="notifications" className="relative">
                Notifications
                {unreadNotificationsCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 px-1 min-w-[1.2rem] h-5">
                    {unreadNotificationsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
            </TabsList>

            <TabsContent value="messages" className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          {workspace.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px] p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className="flex items-start gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={message.sender.avatar_url} />
                            <AvatarFallback>
                              {message.sender.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{message.sender.full_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(message.created_at)}
                              </span>
                              {message.is_edited && (
                                <Badge variant="outline" className="text-xs">edited</Badge>
                              )}
                            </div>
                            
                            <div className="text-sm bg-muted p-2 rounded-md">
                              {message.content}
                            </div>

                            {message.reactions && message.reactions.length > 0 && (
                              <div className="flex items-center gap-1">
                                {message.reactions.map((reaction: any, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {reaction.reaction_type}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40">
                              <div className="space-y-1">
                                <Button variant="ghost" size="sm" className="w-full justify-start">
                                  <Reply className="h-3 w-3 mr-2" />
                                  Reply
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start">
                                  <Heart className="h-3 w-3 mr-2" />
                                  React
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start">
                                  <Edit className="h-3 w-3 mr-2" />
                                  Edit
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  <Separator />
                  
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                      />
                      <Button onClick={sendMessage} disabled={loading || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {activities.map((activity) => {
                    const ActivityIcon = getActivityIcon(activity.activity_type)
                    
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <ActivityIcon className="h-4 w-4 text-primary" />
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{activity.user.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(activity.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {getActivityDescription(activity.activity_type, activity.activity_data)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Notifications</h3>
                <Button variant="outline" size="sm" onClick={() => {
                  notifications.filter(n => !n.is_read).forEach(n => markNotificationAsRead(n.id))
                }}>
                  Mark All Read
                </Button>
              </div>
              
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const NotificationIcon = getNotificationIcon(notification.notification_type)
                    
                    return (
                      <div 
                        key={notification.id} 
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted ${
                          !notification.is_read ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <NotificationIcon className="h-4 w-4 text-primary" />
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{notification.title}</span>
                            {!notification.is_read && (
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          
                          {notification.message && (
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                          )}
                          
                          <div className="flex items-center gap-2">
                            {notification.sender && (
                              <span className="text-xs text-muted-foreground">
                                from {notification.sender.full_name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="workspaces" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workspaces.map((workspace) => (
                  <Card key={workspace.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          {workspace.name}
                        </CardTitle>
                        <Badge variant="outline" className="capitalize">
                          {workspace.workspace_type}
                        </Badge>
                      </div>
                      {workspace.description && (
                        <CardDescription>{workspace.description}</CardDescription>
                      )}
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Members</span>
                        <span className="font-medium">{workspace.members?.length || 0}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Recent Messages</span>
                        <span className="font-medium">{workspace.recent_messages?.length || 0}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant={workspace.is_public ? 'secondary' : 'outline'}>
                          {workspace.is_public ? 'Public' : 'Private'}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => setSelectedWorkspace(workspace.id)}>
                          Open
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function getActivityDescription(activityType: string, activityData: any) {
  switch (activityType) {
    case 'message_sent':
      return `sent a message: "${activityData.content_preview}"`
    case 'workspace_created':
      return `created a new workspace`
    case 'member_added':
      return `added a new member to the workspace`
    case 'file_uploaded':
      return `uploaded a file: ${activityData.filename}`
    case 'task_created':
      return `created a new task: ${activityData.task_title}`
    case 'call_started':
      return `started a call`
    case 'meeting_scheduled':
      return `scheduled a meeting for ${activityData.meeting_date}`
    default:
      return `performed an action`
  }
}