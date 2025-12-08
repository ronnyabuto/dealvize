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
  MessageSquare, Play, Pause, Plus, Settings, Clock,
  CheckCircle, AlertCircle, Loader2, Send, Trash2,
  Calendar, Bell, Gift, Users, Zap, Phone
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface SMSAutomation {
  id: string
  automation_name: string
  description?: string
  automation_type: 'appointment_reminder' | 'follow_up' | 'welcome' | 'birthday' | 'nurturing'
  trigger_conditions: any
  template_id: string
  schedule_type: 'relative' | 'absolute'
  schedule_value: string
  target_audience: 'all' | 'buyers' | 'sellers'
  is_active: boolean
  created_at: string
  template?: {
    id: string
    name: string
    message_content: string
  }
  messages_sent: number
}

interface SMSTemplate {
  id: string
  name: string
  category: string
  message_content: string
  variables: string[]
  is_system: boolean
  usage_count: number
}

const automationTypeLabels = {
  appointment_reminder: 'Appointment Reminder',
  follow_up: 'Follow Up',
  welcome: 'Welcome Message',
  birthday: 'Birthday Greeting',
  nurturing: 'Nurturing'
}

const automationTypeIcons = {
  appointment_reminder: Calendar,
  follow_up: MessageSquare,
  welcome: Users,
  birthday: Gift,
  nurturing: Zap
}

const automationTypeColors = {
  appointment_reminder: 'bg-blue-100 text-blue-800',
  follow_up: 'bg-green-100 text-green-800',
  welcome: 'bg-purple-100 text-purple-800',
  birthday: 'bg-pink-100 text-pink-800',
  nurturing: 'bg-orange-100 text-orange-800'
}

export function SMSAutomation() {
  const [automations, setAutomations] = useState<SMSAutomation[]>([])
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [createAutomationOpen, setCreateAutomationOpen] = useState(false)
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false)
  const [selectedAutomation, setSelectedAutomation] = useState<SMSAutomation | null>(null)
  
  // Forms
  const [newAutomation, setNewAutomation] = useState({
    automation_name: '',
    description: '',
    automation_type: 'follow_up' as const,
    template_id: '',
    schedule_value: '24',
    target_audience: 'all' as const
  })
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'general',
    message_content: '',
    variables: [] as string[]
  })
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState("automations")

  useEffect(() => {
    fetchAutomations()
    fetchTemplates()
  }, [])

  const fetchAutomations = async () => {
    try {
      const response = await fetch('/api/sms-automation')
      if (response.ok) {
        const data = await response.json()
        setAutomations(data.automations || [])
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load SMS automations' })
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/sms-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const handleCreateAutomation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newAutomation.automation_name.trim() || !newAutomation.template_id) {
      setMessage({ type: 'error', text: 'Automation name and template are required' })
      return
    }

    setActionLoading('create-automation')
    try {
      const response = await fetch('/api/sms-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAutomation)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'SMS automation created successfully' })
        setCreateAutomationOpen(false)
        setNewAutomation({
          automation_name: '',
          description: '',
          automation_type: 'follow_up',
          template_id: '',
          schedule_value: '24',
          target_audience: 'all'
        })
        fetchAutomations()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to create automation' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create automation' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newTemplate.name.trim() || !newTemplate.message_content.trim()) {
      setMessage({ type: 'error', text: 'Template name and message content are required' })
      return
    }

    setActionLoading('create-template')
    try {
      const response = await fetch('/api/sms-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'SMS template created successfully' })
        setCreateTemplateOpen(false)
        setNewTemplate({
          name: '',
          category: 'general',
          message_content: '',
          variables: []
        })
        fetchTemplates()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to create template' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create template' })
    } finally {
      setActionLoading(null)
    }
  }

  const toggleAutomationStatus = async (automationId: string, isActive: boolean) => {
    setActionLoading(automationId)
    try {
      const response = await fetch(`/api/sms-automation?id=${automationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })

      if (response.ok) {
        fetchAutomations()
        setMessage({ 
          type: 'success', 
          text: `Automation ${!isActive ? 'activated' : 'paused'}` 
        })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to update automation' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update automation' })
    } finally {
      setActionLoading(null)
    }
  }

  const getAutomationTypeInfo = (type: string) => {
    const IconComponent = automationTypeIcons[type as keyof typeof automationTypeIcons] || MessageSquare
    const label = automationTypeLabels[type as keyof typeof automationTypeLabels] || type
    const color = automationTypeColors[type as keyof typeof automationTypeColors] || 'bg-gray-100 text-gray-800'
    
    return { IconComponent, label, color }
  }

  const getScheduleDescription = (automation: SMSAutomation) => {
    const value = parseInt(automation.schedule_value) || 0
    
    switch (automation.automation_type) {
      case 'appointment_reminder':
        return `${value} hours before appointment`
      case 'follow_up':
        return `${value} days after last contact`
      case 'welcome':
        return `${value} hours after signup`
      case 'birthday':
        return 'On birthday'
      case 'nurturing':
        return `Every ${value} days`
      default:
        return automation.schedule_value
    }
  }

  const getCharacterCount = (text: string) => {
    const count = text.length
    const smsLimit = 160
    const color = count > smsLimit ? 'text-red-600' : count > smsLimit * 0.8 ? 'text-yellow-600' : 'text-gray-500'
    return { count, color, segments: Math.ceil(count / smsLimit) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading SMS automation...</span>
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">SMS Automation</h2>
          <p className="text-muted-foreground">Automate your SMS communication with smart workflows</p>
        </div>

        <div className="flex space-x-2">
          <Dialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create SMS Template</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template_name">Template Name</Label>
                    <Input
                      id="template_name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter template name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="template_category">Category</Label>
                    <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="birthday">Birthday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="message_content">Message Content</Label>
                  <Textarea
                    id="message_content"
                    value={newTemplate.message_content}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, message_content: e.target.value }))}
                    placeholder="Hi {{client_first_name}}, this is a reminder..."
                    rows={4}
                    maxLength={320}
                    required
                  />
                  <div className={`text-xs mt-1 ${getCharacterCount(newTemplate.message_content).color}`}>
                    {getCharacterCount(newTemplate.message_content).count}/320 characters 
                    ({getCharacterCount(newTemplate.message_content).segments} SMS{getCharacterCount(newTemplate.message_content).segments > 1 ? ' messages' : ' message'})
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  <strong>Available variables:</strong> {`{client_first_name}`}, {`{client_name}`}, {`{appointment_date}`}, {`{agent_name}`}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setCreateTemplateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading === 'create-template'}>
                    {actionLoading === 'create-template' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Template'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={createAutomationOpen} onOpenChange={setCreateAutomationOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Automation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create SMS Automation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateAutomation} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="automation_name">Automation Name</Label>
                    <Input
                      id="automation_name"
                      value={newAutomation.automation_name}
                      onChange={(e) => setNewAutomation(prev => ({ ...prev, automation_name: e.target.value }))}
                      placeholder="Enter automation name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="automation_type">Automation Type</Label>
                    <Select value={newAutomation.automation_type} onValueChange={(value) => setNewAutomation(prev => ({ ...prev, automation_type: value as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appointment_reminder">Appointment Reminder</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="welcome">Welcome Message</SelectItem>
                        <SelectItem value="birthday">Birthday Greeting</SelectItem>
                        <SelectItem value="nurturing">Nurturing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newAutomation.description}
                    onChange={(e) => setNewAutomation(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this automation does..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template_id">SMS Template</Label>
                    <Select value={newAutomation.template_id} onValueChange={(value) => setNewAutomation(prev => ({ ...prev, template_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                            {template.is_system && <Badge variant="outline" className="ml-2">System</Badge>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="target_audience">Target Audience</Label>
                    <Select value={newAutomation.target_audience} onValueChange={(value) => setNewAutomation(prev => ({ ...prev, target_audience: value as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Clients</SelectItem>
                        <SelectItem value="buyers">Buyers Only</SelectItem>
                        <SelectItem value="sellers">Sellers Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="schedule_value">Schedule</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="schedule_value"
                      type="number"
                      min="1"
                      value={newAutomation.schedule_value}
                      onChange={(e) => setNewAutomation(prev => ({ ...prev, schedule_value: e.target.value }))}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600">
                      {newAutomation.automation_type === 'appointment_reminder' && 'hours before appointment'}
                      {newAutomation.automation_type === 'follow_up' && 'days after last contact'}
                      {newAutomation.automation_type === 'welcome' && 'hours after signup'}
                      {newAutomation.automation_type === 'nurturing' && 'days between messages'}
                      {newAutomation.automation_type === 'birthday' && '(sent on birthday)'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setCreateAutomationOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading === 'create-automation'}>
                    {actionLoading === 'create-automation' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Automation'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="space-y-4">
          {automations.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No SMS automations</h3>
                  <p className="text-gray-500 mb-4">Create your first SMS automation to engage with clients automatically.</p>
                  <Button onClick={() => setCreateAutomationOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Automation
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {automations.map((automation) => {
                const typeInfo = getAutomationTypeInfo(automation.automation_type)
                return (
                  <Card key={automation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <typeInfo.IconComponent className="h-5 w-5" />
                            <h3 className="font-semibold text-lg">{automation.automation_name}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{automation.description}</p>
                          <div className="flex items-center space-x-2">
                            <Badge className={typeInfo.color}>
                              {typeInfo.label}
                            </Badge>
                            <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                              {automation.is_active ? 'Active' : 'Paused'}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleAutomationStatus(automation.id, automation.is_active)}
                          disabled={actionLoading === automation.id}
                        >
                          {actionLoading === automation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : automation.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-gray-600">
                            <Clock className="h-4 w-4 mr-1" />
                            {getScheduleDescription(automation)}
                          </span>
                          <span className="flex items-center text-gray-600">
                            <Send className="h-4 w-4 mr-1" />
                            {automation.messages_sent} sent
                          </span>
                        </div>

                        {automation.template && (
                          <div className="border rounded p-3 bg-gray-50">
                            <h4 className="text-sm font-medium mb-1">Template: {automation.template.name}</h4>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {automation.template.message_content}
                            </p>
                          </div>
                        )}

                        <div className="text-xs text-gray-500">
                          Created {formatDistanceToNow(new Date(automation.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No SMS templates</h3>
                  <p className="text-gray-500 mb-4">Create reusable SMS templates for your automations.</p>
                  <Button onClick={() => setCreateTemplateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{template.name}</h3>
                        <Badge variant="outline" className="text-xs mb-2">
                          {template.category}
                        </Badge>
                        {template.is_system && (
                          <Badge variant="secondary" className="text-xs ml-1">
                            System
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {template.message_content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{getCharacterCount(template.message_content).count} chars</span>
                      <span>{template.usage_count} uses</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}