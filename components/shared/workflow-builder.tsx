"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Zap, Plus, Play, Pause, Copy, Trash2, Settings, Clock, CheckCircle, XCircle, ArrowRight, ArrowDown, Mail, MessageSquare, Calendar, FileText, Globe, GitBranch, User, Target, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface WorkflowStep {
  id: string
  step_type: string
  step_config: any
  conditions?: any[]
  delay?: number
  required?: boolean
}

interface Workflow {
  id: string
  name: string
  description?: string
  category: string
  trigger_config: any
  workflow_steps: WorkflowStep[]
  settings: any
  is_active: boolean
  created_at: string
  updated_at?: string
  stats?: {
    total_executions: number
    successful_executions: number
    failed_executions: number
    success_rate: number
    avg_execution_time: number
    last_execution?: string
  }
}

const STEP_TYPES = [
  { value: 'send_email', label: 'Send Email', icon: Mail, description: 'Send an email to the contact' },
  { value: 'send_sms', label: 'Send SMS', icon: MessageSquare, description: 'Send an SMS message' },
  { value: 'create_task', label: 'Create Task', icon: Target, description: 'Create a task for follow-up' },
  { value: 'update_field', label: 'Update Field', icon: Settings, description: 'Update entity fields' },
  { value: 'create_note', label: 'Create Note', icon: FileText, description: 'Add a note to the record' },
  { value: 'webhook', label: 'Webhook', icon: Globe, description: 'Send data to external system' },
  { value: 'wait', label: 'Wait', icon: Clock, description: 'Add a delay before next step' },
  { value: 'conditional_branch', label: 'Conditional Branch', icon: GitBranch, description: 'Branch based on conditions' },
  { value: 'assign_lead', label: 'Assign Lead', icon: User, description: 'Assign lead to team member' },
  { value: 'schedule_meeting', label: 'Schedule Meeting', icon: Calendar, description: 'Schedule a meeting' }
]

const TRIGGER_TYPES = [
  { value: 'lead_created', label: 'Lead Created', description: 'When a new lead is added' },
  { value: 'deal_stage_changed', label: 'Deal Stage Changed', description: 'When a deal moves to a specific stage' },
  { value: 'client_status_changed', label: 'Client Status Changed', description: 'When client status changes' },
  { value: 'form_submitted', label: 'Form Submitted', description: 'When a form is submitted' },
  { value: 'email_opened', label: 'Email Opened', description: 'When an email is opened' },
  { value: 'time_based', label: 'Time-Based', description: 'Based on time intervals or dates' },
  { value: 'manual', label: 'Manual Trigger', description: 'Manually triggered workflows' }
]

export function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showStepDialog, setShowStepDialog] = useState(false)
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null)
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    category: 'lead_nurturing',
    trigger_type: 'lead_created',
    trigger_config: {}
  })
  const [newStep, setNewStep] = useState({
    step_type: 'send_email',
    step_config: {},
    conditions: [] as any[],
    delay: 0,
    required: true
  })

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/workflows')
      if (!response.ok) throw new Error('Failed to fetch workflows')
      
      const data = await response.json()
      setWorkflows(data.workflows || [])
    } catch (error) {
      console.error('Error fetching workflows:', error)
      toast.error('Failed to load workflows')
    } finally {
      setLoading(false)
    }
  }

  const createWorkflow = async () => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWorkflow.name,
          description: newWorkflow.description,
          category: newWorkflow.category,
          trigger_config: {
            trigger_type: newWorkflow.trigger_type,
            ...newWorkflow.trigger_config
          },
          workflow_steps: [],
          settings: {},
          is_active: false
        })
      })

      if (!response.ok) throw new Error('Failed to create workflow')

      const data = await response.json()
      toast.success('Workflow created successfully')
      
      setShowCreateDialog(false)
      setNewWorkflow({
        name: '',
        description: '',
        category: 'lead_nurturing',
        trigger_type: 'lead_created',
        trigger_config: {}
      })
      
      await fetchWorkflows()
      setSelectedWorkflow(data.workflow)
    } catch (error) {
      console.error('Error creating workflow:', error)
      toast.error('Failed to create workflow')
    }
  }

  const updateWorkflow = async (workflowId: string, updates: any) => {
    try {
      const response = await fetch(`/api/workflows?id=${workflowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) throw new Error('Failed to update workflow')

      toast.success('Workflow updated successfully')
      await fetchWorkflows()
    } catch (error) {
      console.error('Error updating workflow:', error)
      toast.error('Failed to update workflow')
    }
  }

  const toggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      const action = isActive ? 'pause' : 'activate'
      const response = await fetch(`/api/workflows?id=${workflowId}&action=${action}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (!response.ok) throw new Error(`Failed to ${action} workflow`)

      toast.success(`Workflow ${isActive ? 'paused' : 'activated'}`)
      await fetchWorkflows()
    } catch (error) {
      console.error('Error toggling workflow:', error)
      toast.error('Failed to update workflow status')
    }
  }

  const duplicateWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows?id=${workflowId}&action=duplicate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (!response.ok) throw new Error('Failed to duplicate workflow')

      toast.success('Workflow duplicated successfully')
      await fetchWorkflows()
    } catch (error) {
      console.error('Error duplicating workflow:', error)
      toast.error('Failed to duplicate workflow')
    }
  }

  const deleteWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows?id=${workflowId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete workflow')

      toast.success('Workflow deleted successfully')
      await fetchWorkflows()
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(null)
      }
    } catch (error) {
      console.error('Error deleting workflow:', error)
      toast.error('Failed to delete workflow')
    }
  }

  const addStep = async () => {
    if (!selectedWorkflow) return

    const stepId = `step_${Date.now()}`
    const step: WorkflowStep = {
      id: stepId,
      ...newStep
    }

    const updatedSteps = [...selectedWorkflow.workflow_steps, step]
    
    await updateWorkflow(selectedWorkflow.id, {
      workflow_steps: updatedSteps
    })

    setSelectedWorkflow({
      ...selectedWorkflow,
      workflow_steps: updatedSteps
    })

    setShowStepDialog(false)
    setNewStep({
      step_type: 'send_email',
      step_config: {},
      conditions: [],
      delay: 0,
      required: true
    })
  }

  const updateStep = async (stepIndex: number, updatedStep: WorkflowStep) => {
    if (!selectedWorkflow) return

    const updatedSteps = [...selectedWorkflow.workflow_steps]
    updatedSteps[stepIndex] = updatedStep

    await updateWorkflow(selectedWorkflow.id, {
      workflow_steps: updatedSteps
    })

    setSelectedWorkflow({
      ...selectedWorkflow,
      workflow_steps: updatedSteps
    })
  }

  const removeStep = async (stepIndex: number) => {
    if (!selectedWorkflow) return

    const updatedSteps = selectedWorkflow.workflow_steps.filter((_, index) => index !== stepIndex)
    
    await updateWorkflow(selectedWorkflow.id, {
      workflow_steps: updatedSteps
    })

    setSelectedWorkflow({
      ...selectedWorkflow,
      workflow_steps: updatedSteps
    })
  }

  const getStepIcon = (stepType: string) => {
    const stepTypeInfo = STEP_TYPES.find(type => type.value === stepType)
    return stepTypeInfo?.icon || Settings
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600' : 'text-gray-500'
  }

  const formatExecutionTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Advanced Workflow Automation
              </CardTitle>
              <CardDescription>
                Create complex multi-step workflows with conditions, delays, and branching logic
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workflow
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Workflow</DialogTitle>
                    <DialogDescription>
                      Set up a new automated workflow
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Workflow Name *</Label>
                      <Input
                        id="name"
                        value={newWorkflow.name}
                        onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})}
                        placeholder="e.g., New Lead Nurturing"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newWorkflow.description}
                        onChange={(e) => setNewWorkflow({...newWorkflow, description: e.target.value})}
                        placeholder="Describe what this workflow does"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={newWorkflow.category} onValueChange={(value) => setNewWorkflow({...newWorkflow, category: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead_nurturing">Lead Nurturing</SelectItem>
                            <SelectItem value="deal_management">Deal Management</SelectItem>
                            <SelectItem value="client_onboarding">Client Onboarding</SelectItem>
                            <SelectItem value="follow_up">Follow-up</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Trigger</Label>
                        <Select value={newWorkflow.trigger_type} onValueChange={(value) => setNewWorkflow({...newWorkflow, trigger_type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRIGGER_TYPES.map((trigger) => (
                              <SelectItem key={trigger.value} value={trigger.value}>
                                {trigger.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createWorkflow} disabled={!newWorkflow.name}>
                      Create Workflow
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={fetchWorkflows}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="workflows" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="workflows">All Workflows</TabsTrigger>
              <TabsTrigger value="builder">Workflow Builder</TabsTrigger>
            </TabsList>

            <TabsContent value="workflows" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {workflows.map((workflow) => (
                  <Card key={workflow.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedWorkflow(workflow)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${workflow.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {workflow.name}
                          </CardTitle>
                          <CardDescription className="text-xs">{workflow.description}</CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleWorkflow(workflow.id, workflow.is_active)
                            }}
                          >
                            {workflow.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicateWorkflow(workflow.id)
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteWorkflow(workflow.id)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {workflow.category.replace('_', ' ')}
                        </Badge>
                        <Badge variant={workflow.is_active ? 'default' : 'secondary'} className="text-xs">
                          {workflow.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="text-sm">
                        <p className="text-muted-foreground mb-1">Trigger: {workflow.trigger_config.trigger_type?.replace('_', ' ')}</p>
                        <p className="text-muted-foreground">Steps: {workflow.workflow_steps.length}</p>
                      </div>

                      {workflow.stats && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Success Rate</span>
                            <span className="font-medium">{workflow.stats.success_rate}%</span>
                          </div>
                          <Progress value={workflow.stats.success_rate} className="h-1" />
                          
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Executions</p>
                              <p className="font-medium">{workflow.stats.total_executions}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Success</p>
                              <p className="font-medium text-green-600">{workflow.stats.successful_executions}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Failed</p>
                              <p className="font-medium text-red-600">{workflow.stats.failed_executions}</p>
                            </div>
                          </div>

                          {workflow.stats.last_execution && (
                            <p className="text-xs text-muted-foreground">
                              Last run: {new Date(workflow.stats.last_execution).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {workflows.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No workflows created yet</p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Workflow
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="builder" className="space-y-6">
              {selectedWorkflow ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedWorkflow.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedWorkflow.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={selectedWorkflow.is_active}
                        onCheckedChange={() => toggleWorkflow(selectedWorkflow.id, selectedWorkflow.is_active)}
                      />
                      <span className="text-sm">{selectedWorkflow.is_active ? 'Active' : 'Paused'}</span>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Workflow Steps</CardTitle>
                      <CardDescription>
                        Configure the sequence of actions for this workflow
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {selectedWorkflow.workflow_steps.map((step, index) => {
                          const StepIcon = getStepIcon(step.step_type)
                          const stepType = STEP_TYPES.find(t => t.value === step.step_type)

                          return (
                            <div key={step.id} className="flex items-center gap-4 p-4 border rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <StepIcon className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{stepType?.label || step.step_type}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {stepType?.description || 'Custom step'}
                                  </p>
                                  {step.delay && step.delay > 0 && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {step.delay}s delay
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingStep(step)
                                    setNewStep({
                                      step_type: step.step_type,
                                      step_config: step.step_config,
                                      conditions: step.conditions || [],
                                      delay: step.delay || 0,
                                      required: step.required !== false
                                    })
                                    setShowStepDialog(true)
                                  }}
                                >
                                  <Settings className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeStep(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              {index < selectedWorkflow.workflow_steps.length - 1 && (
                                <ArrowDown className="h-4 w-4 text-muted-foreground absolute left-8 -bottom-2" />
                              )}
                            </div>
                          )
                        })}
                      </div>

                      <Dialog open={showStepDialog} onOpenChange={setShowStepDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Step
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{editingStep ? 'Edit Step' : 'Add New Step'}</DialogTitle>
                            <DialogDescription>
                              Configure the step action and conditions
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Step Type</Label>
                              <Select value={newStep.step_type} onValueChange={(value) => setNewStep({...newStep, step_type: value})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STEP_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      <div className="flex items-center gap-2">
                                        <type.icon className="h-4 w-4" />
                                        {type.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Delay (seconds)</Label>
                                <Input
                                  type="number"
                                  value={newStep.delay}
                                  onChange={(e) => setNewStep({...newStep, delay: parseInt(e.target.value) || 0})}
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <Switch
                                    checked={newStep.required}
                                    onCheckedChange={(checked) => setNewStep({...newStep, required: checked})}
                                  />
                                  Required Step
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  If unchecked, workflow continues even if this step fails
                                </p>
                              </div>
                            </div>

                            {/* Step-specific configuration would go here */}
                            <div className="space-y-2">
                              <Label>Step Configuration</Label>
                              <Textarea
                                value={JSON.stringify(newStep.step_config, null, 2)}
                                onChange={(e) => {
                                  try {
                                    const config = JSON.parse(e.target.value)
                                    setNewStep({...newStep, step_config: config})
                                  } catch (error) {
                                    // Invalid JSON, ignore for now
                                  }
                                }}
                                placeholder={`{
  "template_id": "welcome_email",
  "subject": "Welcome {{first_name}}!"
}`}
                                className="h-32 font-mono text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {
                              setShowStepDialog(false)
                              setEditingStep(null)
                            }}>
                              Cancel
                            </Button>
                            <Button onClick={addStep}>
                              {editingStep ? 'Update Step' : 'Add Step'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Select a workflow to start building</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a workflow from the list or create a new one to begin
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}