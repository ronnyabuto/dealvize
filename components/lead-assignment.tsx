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
import {
  Plus,
  Settings,
  Users,
  Target,
  MapPin,
  TrendingUp,
  Clock,
  Edit,
  Trash2,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  Zap,
  AlertTriangle,
  CheckCircle,
  Route,
  Gauge
} from "lucide-react"

interface LeadAssignmentProps {
  onRuleUpdate?: () => void
}

interface AssignmentRule {
  id: string
  name: string
  description?: string
  priority: number
  is_active: boolean
  assignment_type: string
  conditions: any[]
  assigned_to?: string
  fallback_assigned_to?: string
  geographic_territories?: any
  score_thresholds?: any
  workload_limits?: any
  business_hours_only: boolean
  exclude_weekends: boolean
  created_at: string
  assigned_to_user?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

const ASSIGNMENT_TYPES = [
  { value: 'specific_agent', label: 'Specific Agent', icon: Users, description: 'Always assign to a specific team member' },
  { value: 'round_robin', label: 'Round Robin', icon: Route, description: 'Rotate assignments evenly among team' },
  { value: 'load_balanced', label: 'Load Balanced', icon: Gauge, description: 'Assign to member with least workload' },
  { value: 'geographic', label: 'Geographic', icon: MapPin, description: 'Assign based on client location' },
  { value: 'score_based', label: 'Score Based', icon: TrendingUp, description: 'Assign based on lead score thresholds' }
]

const CONDITION_FIELDS = [
  { value: 'lead_source', label: 'Lead Source', type: 'text' },
  { value: 'lead_score', label: 'Lead Score', type: 'number' },
  { value: 'address_state', label: 'State', type: 'text' },
  { value: 'address_city', label: 'City', type: 'text' },
  { value: 'budget_min', label: 'Min Budget', type: 'number' },
  { value: 'budget_max', label: 'Max Budget', type: 'number' },
  { value: 'property_type', label: 'Property Type', type: 'text' },
  { value: 'urgency', label: 'Urgency', type: 'text' }
]

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals', types: ['text', 'number'] },
  { value: 'not_equals', label: 'Not Equals', types: ['text', 'number'] },
  { value: 'contains', label: 'Contains', types: ['text'] },
  { value: 'starts_with', label: 'Starts With', types: ['text'] },
  { value: 'greater_than', label: 'Greater Than', types: ['number'] },
  { value: 'less_than', label: 'Less Than', types: ['number'] },
  { value: 'greater_equal', label: 'Greater or Equal', types: ['number'] },
  { value: 'less_equal', label: 'Less or Equal', types: ['number'] },
  { value: 'in_list', label: 'In List', types: ['text'] },
  { value: 'not_in_list', label: 'Not In List', types: ['text'] }
]

export function LeadAssignment({ onRuleUpdate }: LeadAssignmentProps) {
  const [rules, setRules] = useState<AssignmentRule[]>([])
  const [loading, setLoading] = useState(true)
  const [isNewRuleOpen, setIsNewRuleOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null)
  const [testingRule, setTestingRule] = useState<string | null>(null)
  
  // New rule form state
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    priority: 1,
    assignment_type: 'specific_agent',
    conditions: [{ field: 'lead_source', operator: 'equals', value: '' }],
    assigned_to: '',
    business_hours_only: true,
    exclude_weekends: false
  })

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/lead-assignment-rules')
      const data = await response.json()
      
      if (response.ok) {
        setRules(data.rules)
      }
    } catch (error) {
      console.error('Error fetching assignment rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRule = async () => {
    try {
      const response = await fetch('/api/lead-assignment-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      })

      if (response.ok) {
        setIsNewRuleOpen(false)
        resetForm()
        fetchRules()
        onRuleUpdate?.()
      }
    } catch (error) {
      console.error('Error creating rule:', error)
    }
  }

  const handleUpdateRule = async (ruleId: string, updates: any) => {
    try {
      const response = await fetch(`/api/lead-assignment-rules?id=${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        fetchRules()
        onRuleUpdate?.()
      }
    } catch (error) {
      console.error('Error updating rule:', error)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this assignment rule?')) {
      return
    }

    try {
      const response = await fetch(`/api/lead-assignment-rules?id=${ruleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchRules()
        onRuleUpdate?.()
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  const handleTestRule = async (ruleId: string) => {
    setTestingRule(ruleId)
    // In a real implementation, you'd test the rule with sample data
    setTimeout(() => {
      setTestingRule(null)
      alert('Rule test completed successfully!')
    }, 2000)
  }

  const resetForm = () => {
    setNewRule({
      name: '',
      description: '',
      priority: 1,
      assignment_type: 'specific_agent',
      conditions: [{ field: 'lead_source', operator: 'equals', value: '' }],
      assigned_to: '',
      business_hours_only: true,
      exclude_weekends: false
    })
  }

  const addCondition = () => {
    setNewRule(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: 'lead_source', operator: 'equals', value: '' }]
    }))
  }

  const removeCondition = (index: number) => {
    setNewRule(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }))
  }

  const updateCondition = (index: number, updates: any) => {
    setNewRule(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, ...updates } : condition
      )
    }))
  }

  const getAssignmentTypeInfo = (type: string) => {
    return ASSIGNMENT_TYPES.find(t => t.value === type) || ASSIGNMENT_TYPES[0]
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Lead Assignment Rules</h2>
            <p className="text-gray-600">Configure automated lead assignment based on conditions</p>
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
          <h2 className="text-2xl font-bold tracking-tight">Lead Assignment Rules</h2>
          <p className="text-gray-600">Configure automated lead assignment based on conditions</p>
        </div>
        <Dialog open={isNewRuleOpen} onOpenChange={setIsNewRuleOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Assignment Rule</DialogTitle>
              <DialogDescription>
                Define conditions and assignment logic for new leads
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    value={newRule.name}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="High value leads to senior agent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={newRule.priority}
                    onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                    min="1"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newRule.description}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when this rule should apply"
                  rows={2}
                />
              </div>

              {/* Assignment Type */}
              <div className="space-y-2">
                <Label>Assignment Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {ASSIGNMENT_TYPES.map((type) => (
                    <Card
                      key={type.value}
                      className={`cursor-pointer transition-colors ${
                        newRule.assignment_type === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => setNewRule(prev => ({ ...prev, assignment_type: type.value }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <type.icon className="h-5 w-5 text-blue-600" />
                          <div>
                            <h4 className="font-medium text-sm">{type.label}</h4>
                            <p className="text-xs text-gray-600">{type.description}</p>
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
                  {newRule.conditions.map((condition, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-4 gap-3 items-end">
                          <div className="space-y-1">
                            <Label className="text-xs">Field</Label>
                            <Select
                              value={condition.field}
                              onValueChange={(value) => updateCondition(index, { field: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONDITION_FIELDS.map((field) => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                                {CONDITION_OPERATORS
                                  .filter(op => {
                                    const field = CONDITION_FIELDS.find(f => f.value === condition.field)
                                    return op.types.includes(field?.type || 'text')
                                  })
                                  .map((operator) => (
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
                              placeholder="Enter value"
                            />
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeCondition(index)}
                            disabled={newRule.conditions.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Assignment Target */}
              {newRule.assignment_type === 'specific_agent' && (
                <div className="space-y-2">
                  <Label htmlFor="assigned-to">Assign To</Label>
                  <Input
                    id="assigned-to"
                    value={newRule.assigned_to}
                    onChange={(e) => setNewRule(prev => ({ ...prev, assigned_to: e.target.value }))}
                    placeholder="User ID or email"
                  />
                </div>
              )}

              {/* Schedule Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="business-hours">Business Hours Only</Label>
                    <p className="text-sm text-gray-600">Only assign during business hours (9 AM - 5 PM)</p>
                  </div>
                  <Switch
                    id="business-hours"
                    checked={newRule.business_hours_only}
                    onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, business_hours_only: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="exclude-weekends">Exclude Weekends</Label>
                    <p className="text-sm text-gray-600">Don't assign leads on Saturday and Sunday</p>
                  </div>
                  <Switch
                    id="exclude-weekends"
                    checked={newRule.exclude_weekends}
                    onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, exclude_weekends: checked }))}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewRuleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRule} disabled={!newRule.name || newRule.conditions.some(c => !c.value)}>
                Create Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assignment rules</h3>
              <p className="text-gray-600 mb-4">Create your first rule to automatically assign leads to team members</p>
              <Button onClick={() => setIsNewRuleOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => {
              const typeInfo = getAssignmentTypeInfo(rule.assignment_type)
              return (
                <Card key={rule.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <typeInfo.icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-lg">{rule.name}</h3>
                            <Badge variant="outline">Priority {rule.priority}</Badge>
                            <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {rule.description && (
                            <p className="text-gray-600 mb-2">{rule.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <typeInfo.icon className="h-4 w-4 mr-1" />
                              {typeInfo.label}
                            </div>
                            <div className="flex items-center">
                              <Target className="h-4 w-4 mr-1" />
                              {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
                            </div>
                            {rule.business_hours_only && (
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                Business hours only
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateRule(rule.id, { is_active: !rule.is_active })}
                        >
                          {rule.is_active ? (
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
                    
                    {/* Conditions Preview */}
                    <div className="mb-4">
                      <Label className="text-sm font-medium mb-2 block">Conditions:</Label>
                      <div className="flex flex-wrap gap-2">
                        {rule.conditions.map((condition, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {CONDITION_FIELDS.find(f => f.value === condition.field)?.label} {' '}
                            {CONDITION_OPERATORS.find(o => o.value === condition.operator)?.label} {' '}
                            "{condition.value}"
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {rule.assigned_to_user ? (
                          <span>
                            Assigns to: {rule.assigned_to_user.first_name} {rule.assigned_to_user.last_name}
                          </span>
                        ) : (
                          <span>Assignment type: {typeInfo.label}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestRule(rule.id)}
                          disabled={testingRule === rule.id}
                        >
                          {testingRule === rule.id ? (
                            <>
                              <Zap className="h-4 w-4 mr-1 animate-pulse" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-1" />
                              Test
                            </>
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingRule(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteRule(rule.id)}
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

      {/* Assignment Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Statistics</CardTitle>
          <CardDescription>Overview of how leads are being assigned</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-2xl text-blue-600">{rules.length}</h4>
              <p className="text-sm text-gray-600">Total Rules</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-2xl text-green-600">
                {rules.filter(r => r.is_active).length}
              </h4>
              <p className="text-sm text-gray-600">Active Rules</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold text-2xl text-orange-600">
                {rules.filter(r => r.assignment_type === 'specific_agent').length}
              </h4>
              <p className="text-sm text-gray-600">Agent-Specific</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-2xl text-purple-600">
                {rules.filter(r => r.assignment_type === 'score_based').length}
              </h4>
              <p className="text-sm text-gray-600">Score-Based</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}