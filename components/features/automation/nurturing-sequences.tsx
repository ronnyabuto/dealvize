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
  Mail, Play, Pause, Plus, Settings, Users, Clock,
  CheckCircle, AlertCircle, Loader2, Send, Trash2,
  ArrowRight, Calendar, Target
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface NurturingSequence {
  id: string
  sequence_name: string
  description?: string
  trigger_type: 'manual' | 'lead_score_change' | 'new_lead' | 'stage_change'
  trigger_conditions: any
  target_audience: 'all' | 'buyers' | 'sellers' | 'specific_segment'
  is_active: boolean
  created_at: string
  updated_at: string
  sequence_steps: SequenceStep[]
  enrollment_count: number
}

interface SequenceStep {
  id: string
  step_number: number
  template_id: string
  delay_days: number
  delay_hours: number
  conditions: any
  is_active: boolean
  template?: {
    id: string
    name: string
    subject: string
  }
}

interface SequenceEnrollment {
  id: string
  client_id: string
  sequence_id: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  steps_completed: number
  enrolled_at: string
  next_step_at?: string
  client: {
    first_name: string
    last_name: string
    email: string
  }
  sequence: {
    sequence_name: string
  }
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  category: string
}

export function NurturingSequences() {
  const [sequences, setSequences] = useState<NurturingSequence[]>([])
  const [enrollments, setEnrollments] = useState<SequenceEnrollment[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedSequence, setSelectedSequence] = useState<NurturingSequence | null>(null)
  const [createSequenceOpen, setCreateSequenceOpen] = useState(false)
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false)
  
  // Forms
  const [newSequence, setNewSequence] = useState({
    sequence_name: '',
    description: '',
    trigger_type: 'manual' as const,
    target_audience: 'all' as const,
    sequence_steps: [] as any[]
  })
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState("sequences")

  useEffect(() => {
    fetchSequences()
    fetchTemplates()
    if (activeTab === 'enrollments') {
      fetchEnrollments()
    }
  }, [activeTab])

  const fetchSequences = async () => {
    try {
      const response = await fetch('/api/nurturing-sequences')
      if (response.ok) {
        const data = await response.json()
        setSequences(data.sequences || [])
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load nurturing sequences' })
    } finally {
      setLoading(false)
    }
  }

  const fetchEnrollments = async () => {
    try {
      const response = await fetch('/api/sequence-enrollments')
      if (response.ok) {
        const data = await response.json()
        setEnrollments(data.enrollments || [])
      }
    } catch (error) {
      console.error('Failed to fetch enrollments:', error)
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

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newSequence.sequence_name.trim()) {
      setMessage({ type: 'error', text: 'Sequence name is required' })
      return
    }

    setActionLoading('create')
    try {
      const response = await fetch('/api/nurturing-sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSequence)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Nurturing sequence created successfully' })
        setCreateSequenceOpen(false)
        setNewSequence({
          sequence_name: '',
          description: '',
          trigger_type: 'manual',
          target_audience: 'all',
          sequence_steps: []
        })
        fetchSequences()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to create sequence' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create sequence' })
    } finally {
      setActionLoading(null)
    }
  }

  const toggleSequenceStatus = async (sequenceId: string, isActive: boolean) => {
    setActionLoading(sequenceId)
    try {
      const response = await fetch(`/api/nurturing-sequences?id=${sequenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })

      if (response.ok) {
        fetchSequences()
        setMessage({ 
          type: 'success', 
          text: `Sequence ${!isActive ? 'activated' : 'paused'}` 
        })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to update sequence' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update sequence' })
    } finally {
      setActionLoading(null)
    }
  }

  const addSequenceStep = () => {
    setNewSequence(prev => ({
      ...prev,
      sequence_steps: [
        ...prev.sequence_steps,
        {
          template_id: '',
          delay_days: 1,
          delay_hours: 0,
          conditions: {},
          is_active: true
        }
      ]
    }))
  }

  const updateSequenceStep = (index: number, field: string, value: any) => {
    setNewSequence(prev => ({
      ...prev,
      sequence_steps: prev.sequence_steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }))
  }

  const removeSequenceStep = (index: number) => {
    setNewSequence(prev => ({
      ...prev,
      sequence_steps: prev.sequence_steps.filter((_, i) => i !== index)
    }))
  }

  const getTriggerTypeLabel = (type: string) => {
    const labels = {
      manual: 'Manual Enrollment',
      lead_score_change: 'Lead Score Change',
      new_lead: 'New Lead',
      stage_change: 'Deal Stage Change'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading nurturing sequences...</span>
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
          <h2 className="text-2xl font-bold tracking-tight">Email Nurturing</h2>
          <p className="text-muted-foreground">Automate your client communication with smart email sequences</p>
        </div>

        <Dialog open={createSequenceOpen} onOpenChange={setCreateSequenceOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Sequence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Create Nurturing Sequence</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSequence} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sequence_name">Sequence Name</Label>
                  <Input
                    id="sequence_name"
                    value={newSequence.sequence_name}
                    onChange={(e) => setNewSequence(prev => ({ ...prev, sequence_name: e.target.value }))}
                    placeholder="Enter sequence name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Select value={newSequence.target_audience} onValueChange={(value) => setNewSequence(prev => ({ ...prev, target_audience: value as any }))}>
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newSequence.description}
                  onChange={(e) => setNewSequence(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this sequence does..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="trigger_type">Trigger Type</Label>
                <Select value={newSequence.trigger_type} onValueChange={(value) => setNewSequence(prev => ({ ...prev, trigger_type: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Enrollment</SelectItem>
                    <SelectItem value="new_lead">New Lead</SelectItem>
                    <SelectItem value="lead_score_change">Lead Score Change</SelectItem>
                    <SelectItem value="stage_change">Deal Stage Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sequence Steps */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Email Steps</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSequenceStep}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>
                
                {newSequence.sequence_steps.map((step, index) => (
                  <Card key={index} className="mb-3">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline">Step {index + 1}</Badge>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeSequenceStep(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <Label>Email Template</Label>
                          <Select 
                            value={step.template_id} 
                            onValueChange={(value) => updateSequenceStep(index, 'template_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose template" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map(template => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Delay (Days)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={step.delay_days}
                            onChange={(e) => updateSequenceStep(index, 'delay_days', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCreateSequenceOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading === 'create'}>
                  {actionLoading === 'create' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Sequence'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="enrollments">Active Enrollments</TabsTrigger>
        </TabsList>

        <TabsContent value="sequences" className="space-y-4">
          {sequences.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No sequences created</h3>
                  <p className="text-gray-500 mb-4">Create your first email nurturing sequence to automate client communication.</p>
                  <Button onClick={() => setCreateSequenceOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Sequence
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sequences.map((sequence) => (
                <Card key={sequence.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{sequence.sequence_name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{sequence.description}</p>
                        <Badge variant="outline" className="text-xs">
                          {getTriggerTypeLabel(sequence.trigger_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={sequence.is_active ? 'default' : 'secondary'}>
                          {sequence.is_active ? 'Active' : 'Paused'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleSequenceStatus(sequence.id, sequence.is_active)}
                          disabled={actionLoading === sequence.id}
                        >
                          {actionLoading === sequence.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : sequence.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center text-gray-600">
                          <Send className="h-4 w-4 mr-1" />
                          {sequence.sequence_steps.length} steps
                        </span>
                        <span className="flex items-center text-gray-600">
                          <Users className="h-4 w-4 mr-1" />
                          {sequence.enrollment_count} enrolled
                        </span>
                      </div>

                      {sequence.sequence_steps.length > 0 && (
                        <div className="border rounded p-3 bg-gray-50">
                          <h4 className="text-sm font-medium mb-2">Email Steps:</h4>
                          <div className="space-y-1">
                            {sequence.sequence_steps.slice(0, 3).map((step, index) => (
                              <div key={step.id} className="flex items-center text-xs text-gray-600">
                                <ArrowRight className="h-3 w-3 mr-1" />
                                <span>Day {step.delay_days}: {step.template?.name || 'Template'}</span>
                              </div>
                            ))}
                            {sequence.sequence_steps.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{sequence.sequence_steps.length - 3} more steps
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Created {formatDistanceToNow(new Date(sequence.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-4">
          {enrollments.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active enrollments</h3>
                  <p className="text-gray-500">Clients will appear here when they're enrolled in nurturing sequences.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {enrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium">
                            {enrollment.client.first_name} {enrollment.client.last_name}
                          </div>
                          <div className="text-sm text-gray-600">{enrollment.client.email}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-sm">{enrollment.sequence.sequence_name}</div>
                          <div className="text-xs text-gray-600">
                            Step {enrollment.steps_completed + 1}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(enrollment.status)}>
                          {enrollment.status}
                        </Badge>
                        {enrollment.next_step_at && (
                          <div className="text-xs text-gray-600 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Next: {formatDistanceToNow(new Date(enrollment.next_step_at), { addSuffix: true })}
                          </div>
                        )}
                      </div>
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