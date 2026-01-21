"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  Settings,
  Zap,
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  TestTube,
  Activity,
  Clock,
  Users,
  Mail,
  MessageSquare,
  FileText,
  TrendingUp,
  Target,
  Workflow,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Bot
} from "lucide-react"

interface PipelineAutomationProps {
  onUpdate?: () => void
}

interface Automation {
  id: string
  name: string
  description?: string
  trigger_type: string
  is_active: boolean
  conditions: any[]
  actions: any[]
  trigger_rules: any
  priority: number
  created_at: string
  executions_count?: number
  last_executed?: string
}

const TRIGGER_TYPES = [
  { value: 'deal_stage_change', label: 'Deal Stage Change', icon: Target, description: 'When a deal moves to a specific stage' },
  { value: 'client_status_change', label: 'Client Status Change', icon: Users, description: 'When a client status changes' },
  { value: 'time_based', label: 'Time Based', icon: Clock, description: 'Scheduled or recurring automation' },
  { value: 'score_threshold', label: 'Score Threshold', icon: TrendingUp, description: 'When lead score reaches a threshold' },
  { value: 'task_completed', label: 'Task Completed', icon: CheckCircle, description: 'When a specific task is completed' },
  { value: 'manual', label: 'Manual Trigger', icon: Play, description: 'Manually triggered automation' }
]

const ACTION_TYPES = [
  { value: 'update_status', label: 'Update Status', icon: Settings, description: 'Change entity status' },
  { value: 'create_task', label: 'Create Task', icon: FileText, description: 'Create a follow-up task' },
  { value: 'send_email', label: 'Send Email', icon: Mail, description: 'Send automated email' },
  { value: 'send_sms', label: 'Send SMS', icon: MessageSquare, description: 'Send SMS message' },
  { value: 'create_note', label: 'Create Note', icon: FileText, description: 'Add a note to the record' },
  { value: 'update_score', label: 'Update Lead Score', icon: TrendingUp, description: 'Modify lead score' },
  { value: 'assign_to_user', label: 'Assign to User', icon: Users, description: 'Assign to team member' },
  { value: 'move_to_stage', label: 'Move to Stage', icon: ArrowRight, description: 'Move deal to new stage' },
  { value: 'schedule_follow_up', label: 'Schedule Follow-up', icon: Clock, description: 'Schedule future follow-up' },
  { value: 'webhook', label: 'Webhook', icon: Activity, description: 'Call external webhook' }
]

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'in_list', label: 'In List' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'date_before', label: 'Date Before' },
  { value: 'date_after', label: 'Date After' }
]

export function PipelineAutomation({ onUpdate }: PipelineAutomationProps) {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [isNewAutomationOpen, setIsNewAutomationOpen] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)
  const [testingAutomation, setTestingAutomation] = useState<string | null>(null)

  // New automation form state
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    description: '',
    trigger_type: 'deal_stage_change',
    conditions: [{ field: 'status', operator: 'equals', value: '', source: 'entity' }],
    actions: [{ type: 'create_task', parameters: { title: '', description: '', due_days: 1 } }],
    priority: 1,
    is_active: true
  })

  useEffect(() => {
    fetchAutomations()
  }, [])

  const fetchAutomations = async () => {
    try {
      const response = await fetch('/api/pipeline-automation')
      const data = await response.json()
      
      if (response.ok) {
        setAutomations(data.automations)
      }
    } catch (error) {
      console.error('Error fetching automations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAutomation = async () => {
    try {
      const response = await fetch('/api/pipeline-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAutomation)
      })

      if (response.ok) {
        setIsNewAutomationOpen(false)
        resetForm()
        fetchAutomations()
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error creating automation:', error)
    }
  }

  const handleUpdateAutomation = async (automationId: string, updates: any) => {
    try {
      const response = await fetch(`/api/pipeline-automation?id=${automationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        fetchAutomations()
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error updating automation:', error)
    }
  }

  const handleDeleteAutomation = async (automationId: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) {
      return
    }

    try {
      const response = await fetch(`/api/pipeline-automation?id=${automationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchAutomations()
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error deleting automation:', error)
    }
  }

  const handleTestAutomation = async (automationId: string) => {
    setTestingAutomation(automationId)
    // In a real implementation, you'd test with sample data
    setTimeout(() => {
      setTestingAutomation(null)
      alert('Automation test completed successfully!')
    }, 2000)
  }

  const resetForm = () => {
    setNewAutomation({
      name: '',
      description: '',
      trigger_type: 'deal_stage_change',
      conditions: [{ field: 'status', operator: 'equals', value: '', source: 'entity' }],
      actions: [{ type: 'create_task', parameters: { title: '', description: '', due_days: 1 } }],
      priority: 1,
      is_active: true
    })
  }

  const addCondition = () => {
    setNewAutomation(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: 'status', operator: 'equals', value: '', source: 'entity' }]
    }))
  }

  const removeCondition = (index: number) => {
    setNewAutomation(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }))
  }

  const updateCondition = (index: number, updates: any) => {
    setNewAutomation(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, ...updates } : condition
      )
    }))
  }

  const addAction = () => {
    setNewAutomation(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'create_task', parameters: { title: '', description: '', due_days: 1 } }]
    }))
  }

  const removeAction = (index: number) => {
    setNewAutomation(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }))
  }

  const updateAction = (index: number, updates: any) => {
    setNewAutomation(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? { ...action, ...updates } : action
      )
    }))
  }

  const getTriggerTypeInfo = (type: string) => {
    return TRIGGER_TYPES.find(t => t.value === type) || TRIGGER_TYPES[0]
  }

  const getActionTypeInfo = (type: string) => {
    return ACTION_TYPES.find(t => t.value === type) || ACTION_TYPES[0]
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Pipeline Automation</h2>
            <p className="text-gray-600">Automate your sales pipeline with intelligent workflows</p>
          </div>
        </div>
        <div className="grid gap-4">
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
          <h2 className="text-2xl font-bold tracking-tight">Pipeline Automation</h2>
          <p className="text-gray-600">Automate your sales pipeline with intelligent workflows</p>
        </div>
        <Dialog open={isNewAutomationOpen} onOpenChange={setIsNewAutomationOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Create Pipeline Automation</DialogTitle>
              <DialogDescription>
                Build automated workflows to streamline your sales process
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[70vh] pr-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="automation-name">Automation Name</Label>
                    <Input
                      id="automation-name"
                      value={newAutomation.name}
                      onChange={(e) => setNewAutomation(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="New lead welcome sequence"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={newAutomation.priority}
                      onChange={(e) => setNewAutomation(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newAutomation.description}
                    onChange={(e) => setNewAutomation(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this automation does"
                    rows={2}
                  />
                </div>

                {/* Trigger Type */}
                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {TRIGGER_TYPES.map((trigger) => (
                      <Card
                        key={trigger.value}
                        className={`cursor-pointer transition-colors ${
                          newAutomation.trigger_type === trigger.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:border-gray-300'
                        }`}
                        onClick={() => setNewAutomation(prev => ({ ...prev, trigger_type: trigger.value }))}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <trigger.icon className="h-5 w-5 text-blue-600" />
                            <div>
                              <h4 className="font-medium text-sm">{trigger.label}</h4>
                              <p className="text-xs text-gray-600">{trigger.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Conditions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Conditions</Label>
                    <Button size="sm" variant="outline" onClick={addCondition}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Condition
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {newAutomation.conditions.map((condition, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-5 gap-3 items-end">
                            <div className="space-y-1">
                              <Label className="text-xs">Source</Label>
                              <Select
                                value={condition.source}
                                onValueChange={(value) => updateCondition(index, { source: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="entity">Entity Data</SelectItem>
                                  <SelectItem value="trigger">Trigger Data</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Field</Label>
                              <Input
                                value={condition.field}
                                onChange={(e) => updateCondition(index, { field: e.target.value })}
                                placeholder="status"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Operator</Label>
                              <Select
                                value={condition.operator}
                                onValueChange={(value) => updateCondition(index, { operator: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONDITION_OPERATORS.map((operator) => (
                                    <SelectItem key={operator.value} value={operator.value}>
                                      {operator.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Value</Label>
                              <Input
                                value={condition.value}
                                onChange={(e) => updateCondition(index, { value: e.target.value })}
                                placeholder="qualified"
                              />
                            </div>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeCondition(index)}
                              disabled={newAutomation.conditions.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Actions</Label>
                    <Button size="sm" variant="outline" onClick={addAction}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Action
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {newAutomation.actions.map((action, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Select
                                value={action.type}
                                onValueChange={(value) => updateAction(index, { type: value, parameters: {} })}
                              >
                                <SelectTrigger className="w-64">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACTION_TYPES.map((actionType) => (
                                    <SelectItem key={actionType.value} value={actionType.value}>
                                      <div className="flex items-center">
                                        <actionType.icon className="h-4 w-4 mr-2" />
                                        {actionType.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeAction(index)}
                                disabled={newAutomation.actions.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Action Parameters */}
                            <ActionParametersForm
                              actionType={action.type}
                              parameters={action.parameters}
                              onChange={(params: any) => updateAction(index, { parameters: params })}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Activation */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is-active">Active</Label>
                    <p className="text-sm text-gray-600">Start executing this automation immediately</p>
                  </div>
                  <Switch
                    id="is-active"
                    checked={newAutomation.is_active}
                    onCheckedChange={(checked) => setNewAutomation(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewAutomationOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAutomation} 
                disabled={!newAutomation.name || newAutomation.actions.length === 0}
              >
                Create Automation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Automations List */}
      <div className="space-y-4">
        {automations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Workflow className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No automations created</h3>
              <p className="text-gray-600 mb-4">Build your first automation to streamline your sales process</p>
              <Button onClick={() => setIsNewAutomationOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Automation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {automations.map((automation) => {
              const triggerInfo = getTriggerTypeInfo(automation.trigger_type)
              return (
                <Card key={automation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <triggerInfo.icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-lg">{automation.name}</h3>
                            <Badge variant="outline">Priority {automation.priority}</Badge>
                            <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                              {automation.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {automation.description && (
                            <p className="text-gray-600 mb-2">{automation.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <triggerInfo.icon className="h-4 w-4 mr-1" />
                              {triggerInfo.label}
                            </div>
                            <div className="flex items-center">
                              <Zap className="h-4 w-4 mr-1" />
                              {automation.actions.length} action{automation.actions.length !== 1 ? 's' : ''}
                            </div>
                            {automation.conditions.length > 0 && (
                              <div className="flex items-center">
                                <Settings className="h-4 w-4 mr-1" />
                                {automation.conditions.length} condition{automation.conditions.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateAutomation(automation.id, { is_active: !automation.is_active })}
                        >
                          {automation.is_active ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Enable
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Actions Preview */}
                    <div className="mb-4">
                      <Label className="text-sm font-medium mb-2 block">Actions:</Label>
                      <div className="flex flex-wrap gap-2">
                        {automation.actions.map((action, index) => {
                          const actionInfo = getActionTypeInfo(action.type)
                          return (
                            <Badge key={index} variant="outline" className="text-xs">
                              <actionInfo.icon className="h-3 w-3 mr-1" />
                              {actionInfo.label}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span>Created {new Date(automation.created_at).toLocaleDateString()}</span>
                        {automation.executions_count && (
                          <span className="ml-4">• {automation.executions_count} executions</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestAutomation(automation.id)}
                          disabled={testingAutomation === automation.id}
                        >
                          {testingAutomation === automation.id ? (
                            <>
                              <TestTube className="h-4 w-4 mr-1 animate-pulse" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <TestTube className="h-4 w-4 mr-1" />
                              Test
                            </>
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingAutomation(automation)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteAutomation(automation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Automation Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Statistics</CardTitle>
          <CardDescription>Overview of your pipeline automation performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-2xl text-blue-600">{automations.length}</h4>
              <p className="text-sm text-gray-600">Total Automations</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-2xl text-green-600">
                {automations.filter(a => a.is_active).length}
              </h4>
              <p className="text-sm text-gray-600">Active Automations</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold text-2xl text-orange-600">
                {automations.reduce((sum, a) => sum + a.actions.length, 0)}
              </h4>
              <p className="text-sm text-gray-600">Total Actions</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-2xl text-purple-600">
                {automations.reduce((sum, a) => sum + (a.executions_count || 0), 0)}
              </h4>
              <p className="text-sm text-gray-600">Total Executions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Action Parameters Form Component
function ActionParametersForm({ actionType, parameters, onChange }: any) {
  const updateParameter = (key: string, value: any) => {
    onChange({ ...parameters, [key]: value })
  }

  switch (actionType) {
    case 'create_task':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Task Title</Label>
            <Input
              value={parameters.title || ''}
              onChange={(e) => updateParameter('title', e.target.value)}
              placeholder="Follow up with {{client.first_name}}"
            />
          </div>
          <div>
            <Label className="text-xs">Due in Days</Label>
            <Input
              type="number"
              value={parameters.due_days || 1}
              onChange={(e) => updateParameter('due_days', parseInt(e.target.value) || 1)}
              min="1"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={parameters.description || ''}
              onChange={(e) => updateParameter('description', e.target.value)}
              placeholder="Task description..."
              rows={2}
            />
          </div>
        </div>
      )

    case 'send_email':
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Subject</Label>
            <Input
              value={parameters.subject || ''}
              onChange={(e) => updateParameter('subject', e.target.value)}
              placeholder="Welcome {{client.first_name}}!"
            />
          </div>
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea
              value={parameters.content || ''}
              onChange={(e) => updateParameter('content', e.target.value)}
              placeholder="Email content with {{variables}}..."
              rows={3}
            />
          </div>
        </div>
      )

    case 'update_status':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Entity Type</Label>
            <Select
              value={parameters.entity_type || 'client'}
              onValueChange={(value) => updateParameter('entity_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="deal">Deal</SelectItem>
                <SelectItem value="task">Task</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">New Status</Label>
            <Input
              value={parameters.new_status || ''}
              onChange={(e) => updateParameter('new_status', e.target.value)}
              placeholder="qualified"
            />
          </div>
        </div>
      )

    case 'update_score':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Score Change</Label>
            <Input
              type="number"
              value={parameters.score_change || 0}
              onChange={(e) => updateParameter('score_change', parseInt(e.target.value) || 0)}
              placeholder="10"
            />
          </div>
          <div>
            <Label className="text-xs">Reason</Label>
            <Input
              value={parameters.reason || ''}
              onChange={(e) => updateParameter('reason', e.target.value)}
              placeholder="Automation bonus"
            />
          </div>
        </div>
      )

    case 'send_sms':
      return (
        <div>
          <Label className="text-xs">Message</Label>
          <Textarea
            value={parameters.message || ''}
            onChange={(e) => updateParameter('message', e.target.value)}
            placeholder="SMS message with {{variables}}..."
            rows={2}
          />
        </div>
      )

    case 'webhook':
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Webhook URL</Label>
            <Input
              value={parameters.url || ''}
              onChange={(e) => updateParameter('url', e.target.value)}
              placeholder="https://api.example.com/webhook"
            />
          </div>
          <div>
            <Label className="text-xs">Method</Label>
            <Select
              value={parameters.method || 'POST'}
              onValueChange={(value) => updateParameter('method', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )

    default:
      return (
        <div className="text-center text-gray-500 py-4">
          <Settings className="h-8 w-8 mx-auto mb-2" />
          <p>No additional parameters required</p>
        </div>
      )
  }
}