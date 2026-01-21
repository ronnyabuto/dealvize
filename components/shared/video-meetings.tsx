"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Video,
  Calendar,
  Users,
  Clock,
  ExternalLink,
  Copy,
  Settings,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Monitor,
  Webcam,
  Mic,
  MicOff,
  VideoIcon,
  VideoOff,
  Share,
  MessageSquare
} from "lucide-react"

interface VideoMeetingsProps {
  clientId?: string
  dealId?: string
}

interface Meeting {
  id: string
  title: string
  description?: string
  scheduled_start_time: string
  scheduled_end_time: string
  actual_start_time?: string
  actual_end_time?: string
  meeting_platform: string
  meeting_url: string
  meeting_id: string
  meeting_password?: string
  host_url: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  auto_record: boolean
  waiting_room_enabled: boolean
  password_required: boolean
  meeting_notes?: string
  follow_up_required: boolean
  follow_up_date?: string
  client?: {
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
    value: string
  }
  attendees?: {
    id: string
    attendee_email: string
    attendee_name: string
    status: string
    joined_at?: string
    left_at?: string
  }[]
}

const MEETING_PLATFORMS = [
  { value: 'zoom', label: 'Zoom', icon: Video },
  { value: 'meet', label: 'Google Meet', icon: Video },
  { value: 'teams', label: 'Microsoft Teams', icon: Video },
  { value: 'custom', label: 'Custom Platform', icon: Monitor }
]

const MEETING_STATUSES = [
  { value: 'scheduled', label: 'Scheduled', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'green' },
  { value: 'completed', label: 'Completed', color: 'emerald' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
  { value: 'no_show', label: 'No Show', color: 'orange' }
]

export function VideoMeetings({ clientId, dealId }: VideoMeetingsProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [filter, setFilter] = useState({
    status: '',
    platform: '',
    date_range: '30'
  })

  // Form state for new meeting
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    scheduled_start_time: '',
    scheduled_end_time: '',
    meeting_platform: 'zoom',
    attendees: [] as string[],
    auto_record: false,
    waiting_room_enabled: true,
    password_required: true,
    send_invitations: true
  })

  useEffect(() => {
    fetchMeetings()
    fetchAnalytics()
  }, [clientId, dealId, filter])

  const fetchMeetings = async () => {
    try {
      const params = new URLSearchParams()
      if (clientId) params.append('client_id', clientId)
      if (dealId) params.append('deal_id', dealId)
      if (filter.status) params.append('status', filter.status)
      if (filter.platform) params.append('platform', filter.platform)
      
      const response = await fetch(`/api/video-meetings?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setMeetings(data.meetings)
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams({ date_range: filter.date_range })
      if (clientId) params.append('client_id', clientId)
      
      const response = await fetch(`/api/meeting-analytics?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const handleCreateMeeting = async () => {
    try {
      const meetingData = {
        ...newMeeting,
        client_id: clientId || null,
        deal_id: dealId || null,
        attendees: newMeeting.attendees.filter(email => email.trim())
      }

      const response = await fetch('/api/video-meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData)
      })

      if (response.ok) {
        setIsNewMeetingOpen(false)
        setNewMeeting({
          title: '',
          description: '',
          scheduled_start_time: '',
          scheduled_end_time: '',
          meeting_platform: 'zoom',
          attendees: [],
          auto_record: false,
          waiting_room_enabled: true,
          password_required: true,
          send_invitations: true
        })
        fetchMeetings()
      }
    } catch (error) {
      console.error('Error creating meeting:', error)
    }
  }

  const handleUpdateMeetingStatus = async (meetingId: string, status: string, notes?: string) => {
    try {
      const updateData: any = { status }
      
      if (status === 'in_progress') {
        updateData.actual_start_time = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.actual_end_time = new Date().toISOString()
        if (notes) updateData.meeting_notes = notes
      }

      const response = await fetch(`/api/video-meetings?id=${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        fetchMeetings()
      }
    } catch (error) {
      console.error('Error updating meeting:', error)
    }
  }

  const copyMeetingUrl = (url: string) => {
    navigator.clipboard.writeText(url)
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = MEETING_STATUSES.find(s => s.value === status)
    return (
      <Badge variant="outline" className={`text-${statusInfo?.color}-600 border-${statusInfo?.color}-200`}>
        {statusInfo?.label || status}
      </Badge>
    )
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getPlatformIcon = (platform: string) => {
    const platformInfo = MEETING_PLATFORMS.find(p => p.value === platform)
    const Icon = platformInfo?.icon || Video
    return <Icon className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Video Meetings</h2>
            <p className="text-gray-600">Schedule and manage video meetings with clients</p>
          </div>
        </div>
        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Video Meetings</h2>
          <p className="text-gray-600">Schedule and manage video meetings with clients</p>
        </div>
        <Dialog open={isNewMeetingOpen} onOpenChange={setIsNewMeetingOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
              <DialogDescription>
                Create a new video meeting and send invitations
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Property walkthrough"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select
                    value={newMeeting.meeting_platform}
                    onValueChange={(value) => setNewMeeting(prev => ({ ...prev, meeting_platform: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEETING_PLATFORMS.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          <div className="flex items-center">
                            <platform.icon className="h-4 w-4 mr-2" />
                            {platform.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Meeting agenda and notes"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="datetime-local"
                    value={newMeeting.scheduled_start_time}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, scheduled_start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="datetime-local"
                    value={newMeeting.scheduled_end_time}
                    onChange={(e) => setNewMeeting(prev => ({ ...prev, scheduled_end_time: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Attendee Emails</Label>
                <div className="space-y-2">
                  {newMeeting.attendees.map((email, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        value={email}
                        onChange={(e) => {
                          const updatedAttendees = [...newMeeting.attendees]
                          updatedAttendees[index] = e.target.value
                          setNewMeeting(prev => ({ ...prev, attendees: updatedAttendees }))
                        }}
                        placeholder="client@example.com"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updatedAttendees = newMeeting.attendees.filter((_, i) => i !== index)
                          setNewMeeting(prev => ({ ...prev, attendees: updatedAttendees }))
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewMeeting(prev => ({ ...prev, attendees: [...prev.attendees, ''] }))}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Attendee
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-record">Auto Record</Label>
                  <Switch
                    id="auto-record"
                    checked={newMeeting.auto_record}
                    onCheckedChange={(checked) => setNewMeeting(prev => ({ ...prev, auto_record: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="waiting-room">Waiting Room</Label>
                  <Switch
                    id="waiting-room"
                    checked={newMeeting.waiting_room_enabled}
                    onCheckedChange={(checked) => setNewMeeting(prev => ({ ...prev, waiting_room_enabled: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password-required">Password Required</Label>
                  <Switch
                    id="password-required"
                    checked={newMeeting.password_required}
                    onCheckedChange={(checked) => setNewMeeting(prev => ({ ...prev, password_required: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="send-invitations">Send Invitations</Label>
                  <Switch
                    id="send-invitations"
                    checked={newMeeting.send_invitations}
                    onCheckedChange={(checked) => setNewMeeting(prev => ({ ...prev, send_invitations: checked }))}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewMeetingOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMeeting} disabled={!newMeeting.title || !newMeeting.scheduled_start_time}>
                Schedule Meeting
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Meetings</p>
                  <p className="text-2xl font-bold">{analytics.summary.total_meetings}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold">{analytics.summary.completion_rate}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold">{analytics.summary.attendance_rate}%</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold">{analytics.summary.average_duration}m</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="meetings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="meetings" className="space-y-4">
          {/* Filters */}
          <div className="flex space-x-4">
            <Select value={filter.status} onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {MEETING_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filter.platform} onValueChange={(value) => setFilter(prev => ({ ...prev, platform: value }))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {MEETING_PLATFORMS.map((platform) => (
                  <SelectItem key={platform.value} value={platform.value}>
                    {platform.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meetings List */}
          <div className="space-y-4">
            {meetings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Video className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No meetings scheduled</h3>
                  <p className="text-gray-600 mb-4">Schedule your first video meeting with a client</p>
                  <Button onClick={() => setIsNewMeetingOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </CardContent>
              </Card>
            ) : (
              meetings.map((meeting) => (
                <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {getPlatformIcon(meeting.meeting_platform)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{meeting.title}</h3>
                          {meeting.description && (
                            <p className="text-gray-600 mt-1">{meeting.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDateTime(meeting.scheduled_start_time)} - {formatDateTime(meeting.scheduled_end_time)}
                            </div>
                            {meeting.client && (
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {meeting.client.first_name} {meeting.client.last_name}
                              </div>
                            )}
                            {meeting.attendees && meeting.attendees.length > 0 && (
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {meeting.attendees.length} attendees
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(meeting.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {meeting.status === 'scheduled' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateMeetingStatus(meeting.id, 'in_progress')}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(meeting.meeting_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Join
                            </Button>
                          </>
                        )}
                        
                        {meeting.status === 'in_progress' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateMeetingStatus(meeting.id, 'completed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyMeetingUrl(meeting.meeting_url)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Link
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {meeting.meeting_password && (
                          <Badge variant="outline">
                            Password: {meeting.meeting_password}
                          </Badge>
                        )}
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent>
                            <SheetHeader>
                              <SheetTitle>Meeting Details</SheetTitle>
                              <SheetDescription>
                                View and manage meeting information
                              </SheetDescription>
                            </SheetHeader>
                            <MeetingDetails meeting={meeting} onUpdate={fetchMeetings} />
                          </SheetContent>
                        </Sheet>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          {analytics && <MeetingAnalytics analytics={analytics} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Meeting Details Component
function MeetingDetails({ meeting, onUpdate }: { meeting: Meeting, onUpdate: () => void }) {
  const [notes, setNotes] = useState(meeting.meeting_notes || '')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSaveNotes = async () => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/video-meetings?id=${meeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_notes: notes })
      })

      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Meeting Info */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Meeting URL</Label>
          <div className="flex items-center space-x-2 mt-1">
            <Input value={meeting.meeting_url} readOnly />
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(meeting.meeting_url)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {meeting.meeting_password && (
          <div>
            <Label className="text-sm font-medium">Password</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input value={meeting.meeting_password} readOnly />
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(meeting.meeting_password || '')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div>
          <Label className="text-sm font-medium">Platform</Label>
          <p className="text-sm text-gray-600 mt-1 capitalize">
            {meeting.meeting_platform}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Auto Record</Label>
            <p className="text-sm text-gray-600 mt-1">
              {meeting.auto_record ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">Waiting Room</Label>
            <p className="text-sm text-gray-600 mt-1">
              {meeting.waiting_room_enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
      </div>

      {/* Attendees */}
      {meeting.attendees && meeting.attendees.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2 block">Attendees</Label>
          <div className="space-y-2">
            {meeting.attendees.map((attendee) => (
              <div key={attendee.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{attendee.attendee_name}</p>
                    <p className="text-xs text-gray-600">{attendee.attendee_email}</p>
                  </div>
                </div>
                <Badge variant={attendee.joined_at ? 'default' : 'outline'}>
                  {attendee.joined_at ? 'Joined' : 'Invited'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meeting Notes */}
      <div>
        <Label htmlFor="notes" className="text-sm font-medium">Meeting Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add meeting notes and follow-up items..."
          rows={6}
          className="mt-1"
        />
        <Button
          onClick={handleSaveNotes}
          disabled={isUpdating}
          className="mt-2"
          size="sm"
        >
          {isUpdating ? 'Saving...' : 'Save Notes'}
        </Button>
      </div>
    </div>
  )
}

// Meeting Analytics Component
function MeetingAnalytics({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-6">
      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.platform_breakdown.map((platform: any) => (
              <div key={platform.platform} className="flex items-center justify-between">
                <span className="font-medium">{platform.platform}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{platform.count} meetings</span>
                  <Badge variant="outline">{platform.percentage}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Popular Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Time Slots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.popular_time_slots.map((slot: any, index: number) => (
              <div key={slot.time_slot} className="flex items-center justify-between">
                <span className="font-medium">{slot.time_slot}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{slot.meeting_count} meetings</span>
                  <Badge variant="outline">{slot.percentage}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.status_breakdown.map((status: any) => (
              <div key={status.status} className="flex items-center justify-between">
                <span className="font-medium">{status.status}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{status.count} meetings</span>
                  <Badge variant="outline">{status.percentage}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}