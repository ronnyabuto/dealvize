'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  MessageSquare, 
  Mail, 
  Megaphone, 
  HeadphonesIcon,
  Send,
  Users,
  Calendar,
  AlertTriangle,
  Eye
} from 'lucide-react'
import { getStatusColor, getPriorityColor } from '@/lib/utils/ui-helpers'

interface CommunicationCenterProps {
  totalUsers?: number
}

export function CommunicationCenter({ totalUsers = 0 }: CommunicationCenterProps) {
  const [activeTab, setActiveTab] = useState('notifications')
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    type: 'info',
    targetAudience: 'all',
    priority: 'medium',
    scheduled: false,
    scheduledTime: ''
  })
  
  const [emailData, setEmailData] = useState({
    subject: '',
    content: '',
    recipientType: 'all',
    scheduled: false,
    scheduledTime: ''
  })

  const [maintenanceData, setMaintenanceData] = useState({
    title: '',
    description: '',
    startTime: '',
    estimatedDuration: '',
    affectedServices: [] as string[],
    severity: 'medium'
  })

  const supportTickets: any[] = []

  const handleSendNotification = async () => {
    // Implementation would connect to your notification system
    console.log('Sending notification:', notificationData)
    // Reset form
    setNotificationData({
      title: '',
      message: '',
      type: 'info',
      targetAudience: 'all',
      priority: 'medium',
      scheduled: false,
      scheduledTime: ''
    })
  }

  const handleSendEmail = async () => {
    // Implementation would connect to your email system
    console.log('Sending email blast:', emailData)
    // Reset form
    setEmailData({
      subject: '',
      content: '',
      recipientType: 'all',
      scheduled: false,
      scheduledTime: ''
    })
  }

  const handleScheduleMaintenance = async () => {
    // Implementation would create maintenance window
    console.log('Scheduling maintenance:', maintenanceData)
    // Reset form
    setMaintenanceData({
      title: '',
      description: '',
      startTime: '',
      estimatedDuration: '',
      affectedServices: [],
      severity: 'medium'
    })
  }


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Communication Center
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email Blast</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Maintenance</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <HeadphonesIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Support</span>
            </TabsTrigger>
          </TabsList>

          {/* In-App Notifications */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notif-title">Notification Title</Label>
                  <Input
                    id="notif-title"
                    value={notificationData.title}
                    onChange={(e) => setNotificationData({...notificationData, title: e.target.value})}
                    placeholder="Important system update"
                  />
                </div>
                <div>
                  <Label htmlFor="notif-message">Message</Label>
                  <Textarea
                    id="notif-message"
                    value={notificationData.message}
                    onChange={(e) => setNotificationData({...notificationData, message: e.target.value})}
                    placeholder="Your notification message here..."
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notif-type">Type</Label>
                  <Select value={notificationData.type} onValueChange={(value) => setNotificationData({...notificationData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="target-audience">Target Audience</Label>
                  <Select value={notificationData.targetAudience} onValueChange={(value) => setNotificationData({...notificationData, targetAudience: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users ({totalUsers})</SelectItem>
                      <SelectItem value="admins">Admins Only</SelectItem>
                      <SelectItem value="active">Active Users</SelectItem>
                      <SelectItem value="premium">Premium Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="schedule-notif"
                    checked={notificationData.scheduled}
                    onCheckedChange={(checked) => setNotificationData({...notificationData, scheduled: checked})}
                  />
                  <Label htmlFor="schedule-notif">Schedule for later</Label>
                </div>

                {notificationData.scheduled && (
                  <div>
                    <Label htmlFor="schedule-time">Schedule Time</Label>
                    <Input
                      id="schedule-time"
                      type="datetime-local"
                      value={notificationData.scheduledTime}
                      onChange={(e) => setNotificationData({...notificationData, scheduledTime: e.target.value})}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <Button onClick={handleSendNotification} className="w-full bg-dealvize-teal hover:bg-dealvize-teal/90">
              <Send className="h-4 w-4 mr-2" />
              {notificationData.scheduled ? 'Schedule Notification' : 'Send Notification'}
            </Button>
          </TabsContent>

          {/* Email Blast */}
          <TabsContent value="email" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-subject">Email Subject</Label>
                <Input
                  id="email-subject"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                  placeholder="Important platform update"
                />
              </div>
              
              <div>
                <Label htmlFor="email-content">Email Content</Label>
                <Textarea
                  id="email-content"
                  value={emailData.content}
                  onChange={(e) => setEmailData({...emailData, content: e.target.value})}
                  placeholder="Your email content here... (HTML supported)"
                  rows={8}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email-recipients">Recipients</Label>
                  <Select value={emailData.recipientType} onValueChange={(value) => setEmailData({...emailData, recipientType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users ({totalUsers})</SelectItem>
                      <SelectItem value="subscribed">Newsletter Subscribers</SelectItem>
                      <SelectItem value="inactive">Inactive Users</SelectItem>
                      <SelectItem value="trial">Trial Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="schedule-email"
                    checked={emailData.scheduled}
                    onCheckedChange={(checked) => setEmailData({...emailData, scheduled: checked})}
                  />
                  <Label htmlFor="schedule-email">Schedule for later</Label>
                </div>
              </div>

              {emailData.scheduled && (
                <div>
                  <Label htmlFor="email-schedule-time">Schedule Time</Label>
                  <Input
                    id="email-schedule-time"
                    type="datetime-local"
                    value={emailData.scheduledTime}
                    onChange={(e) => setEmailData({...emailData, scheduledTime: e.target.value})}
                  />
                </div>
              )}
            </div>
            
            <Button onClick={handleSendEmail} className="w-full bg-dealvize-teal hover:bg-dealvize-teal/90">
              <Mail className="h-4 w-4 mr-2" />
              {emailData.scheduled ? 'Schedule Email' : 'Send Email Blast'}
            </Button>
          </TabsContent>

          {/* Maintenance Announcements */}
          <TabsContent value="maintenance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="maint-title">Maintenance Title</Label>
                  <Input
                    id="maint-title"
                    value={maintenanceData.title}
                    onChange={(e) => setMaintenanceData({...maintenanceData, title: e.target.value})}
                    placeholder="Scheduled System Maintenance"
                  />
                </div>
                
                <div>
                  <Label htmlFor="maint-description">Description</Label>
                  <Textarea
                    id="maint-description"
                    value={maintenanceData.description}
                    onChange={(e) => setMaintenanceData({...maintenanceData, description: e.target.value})}
                    placeholder="Database optimization and server updates..."
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="maint-start">Start Time</Label>
                  <Input
                    id="maint-start"
                    type="datetime-local"
                    value={maintenanceData.startTime}
                    onChange={(e) => setMaintenanceData({...maintenanceData, startTime: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="maint-duration">Estimated Duration</Label>
                  <Select value={maintenanceData.estimatedDuration} onValueChange={(value) => setMaintenanceData({...maintenanceData, estimatedDuration: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30min">30 minutes</SelectItem>
                      <SelectItem value="1hour">1 hour</SelectItem>
                      <SelectItem value="2hours">2 hours</SelectItem>
                      <SelectItem value="4hours">4 hours</SelectItem>
                      <SelectItem value="8hours">8 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="maint-severity">Severity</Label>
                  <Select value={maintenanceData.severity} onValueChange={(value) => setMaintenanceData({...maintenanceData, severity: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Minor updates</SelectItem>
                      <SelectItem value="medium">Medium - Partial downtime</SelectItem>
                      <SelectItem value="high">High - Full downtime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Button onClick={handleScheduleMaintenance} className="w-full bg-yellow-600 hover:bg-yellow-700">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Maintenance
            </Button>
          </TabsContent>

          {/* Support Tickets */}
          <TabsContent value="support" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Support Tickets</h3>
              <Badge variant="outline" className="bg-blue-50">
                {supportTickets.filter(t => t.status === 'open').length} Open
              </Badge>
            </div>
            
            <div className="space-y-3">
              {supportTickets.map((ticket) => (
                <Card key={ticket.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(ticket.status)}`}></div>
                      <div>
                        <p className="font-medium">{ticket.subject}</p>
                        <p className="text-sm text-gray-500">by {ticket.user} • {ticket.created}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}