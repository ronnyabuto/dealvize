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
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Save,
  Play,
  Settings,
  Filter,
  BarChart3,
  Table,
  PieChart,
  TrendingUp,
  Database,
  Columns,
  SortAsc,
  Eye,
  Trash2,
  Copy,
  Download,
  FileText,
  Calendar,
  Users,
  DollarSign,
  MessageSquare,
  Phone
} from "lucide-react"

interface ReportBuilderProps {
  onSave?: (report: any) => void
  onPreview?: (report: any) => void
  initialReport?: any
}

const DATA_SOURCES = [
  { 
    table: 'clients', 
    name: 'Clients', 
    icon: Users,
    fields: [
      { name: 'id', type: 'uuid', label: 'Client ID' },
      { name: 'first_name', type: 'text', label: 'First Name' },
      { name: 'last_name', type: 'text', label: 'Last Name' },
      { name: 'email', type: 'text', label: 'Email' },
      { name: 'phone', type: 'text', label: 'Phone' },
      { name: 'lead_score', type: 'number', label: 'Lead Score' },
      { name: 'lead_status', type: 'text', label: 'Lead Status' },
      { name: 'lead_source', type: 'text', label: 'Lead Source' },
      { name: 'created_at', type: 'datetime', label: 'Created Date' },
      { name: 'last_contact_date', type: 'datetime', label: 'Last Contact' }
    ]
  },
  { 
    table: 'deals', 
    name: 'Deals', 
    icon: DollarSign,
    fields: [
      { name: 'id', type: 'uuid', label: 'Deal ID' },
      { name: 'title', type: 'text', label: 'Title' },
      { name: 'value', type: 'number', label: 'Value' },
      { name: 'status', type: 'text', label: 'Status' },
      { name: 'probability', type: 'number', label: 'Probability' },
      { name: 'expected_close_date', type: 'date', label: 'Expected Close' },
      { name: 'created_at', type: 'datetime', label: 'Created Date' },
      { name: 'closed_at', type: 'datetime', label: 'Closed Date' }
    ]
  },
  { 
    table: 'tasks', 
    name: 'Tasks', 
    icon: FileText,
    fields: [
      { name: 'id', type: 'uuid', label: 'Task ID' },
      { name: 'title', type: 'text', label: 'Title' },
      { name: 'status', type: 'text', label: 'Status' },
      { name: 'priority', type: 'text', label: 'Priority' },
      { name: 'task_type', type: 'text', label: 'Type' },
      { name: 'due_date', type: 'date', label: 'Due Date' },
      { name: 'completed_at', type: 'datetime', label: 'Completed Date' },
      { name: 'created_at', type: 'datetime', label: 'Created Date' }
    ]
  },
  { 
    table: 'messages', 
    name: 'Messages', 
    icon: MessageSquare,
    fields: [
      { name: 'id', type: 'uuid', label: 'Message ID' },
      { name: 'direction', type: 'text', label: 'Direction' },
      { name: 'status', type: 'text', label: 'Status' },
      { name: 'message_type', type: 'text', label: 'Type' },
      { name: 'priority', type: 'text', label: 'Priority' },
      { name: 'created_at', type: 'datetime', label: 'Created Date' },
      { name: 'sent_at', type: 'datetime', label: 'Sent Date' }
    ]
  },
  { 
    table: 'call_logs', 
    name: 'Call Logs', 
    icon: Phone,
    fields: [
      { name: 'id', type: 'uuid', label: 'Call ID' },
      { name: 'call_type', type: 'text', label: 'Call Type' },
      { name: 'outcome', type: 'text', label: 'Outcome' },
      { name: 'duration_seconds', type: 'number', label: 'Duration (seconds)' },
      { name: 'cost', type: 'number', label: 'Cost' },
      { name: 'call_start_time', type: 'datetime', label: 'Start Time' },
      { name: 'call_end_time', type: 'datetime', label: 'End Time' }
    ]
  }
]

const CHART_TYPES = [
  { value: 'table', label: 'Table', icon: Table },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'line', label: 'Line Chart', icon: TrendingUp },
  { value: 'pie', label: 'Pie Chart', icon: PieChart },
  { value: 'donut', label: 'Donut Chart', icon: PieChart },
  { value: 'dashboard', label: 'Dashboard', icon: BarChart3 }
]

const AGGREGATION_TYPES = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' }
]

const FILTER_OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'like', label: 'Contains' },
  { value: 'in', label: 'In list' }
]

export function ReportBuilder({ onSave, onPreview, initialReport }: ReportBuilderProps) {
  const [report, setReport] = useState({
    name: '',
    description: '',
    report_type: 'table',
    data_sources: [],
    filters: {},
    grouping: {},
    sorting: [],
    chart_config: {},
    ...initialReport
  })

  const [selectedDataSource, setSelectedDataSource] = useState('')
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const addDataSource = (tableInfo: any) => {
    const newSource = {
      table: tableInfo.table,
      fields: [],
      aggregations: [],
      limit: 100
    }
    
    setReport((prev: any) => ({
      ...prev,
      data_sources: [...prev.data_sources, newSource]
    }))
  }

  const updateDataSource = (index: number, updates: any) => {
    setReport((prev: any) => ({
      ...prev,
      data_sources: prev.data_sources.map((source: any, i: number) =>
        i === index ? { ...source, ...updates } : source
      )
    }))
  }

  const removeDataSource = (index: number) => {
    setReport((prev: any) => ({
      ...prev,
      data_sources: prev.data_sources.filter((_: any, i: number) => i !== index)
    }))
  }

  const addFilter = (table: string) => {
    setReport((prev: any) => ({
      ...prev,
      filters: {
        ...prev.filters,
        [table]: {
          ...(prev.filters[table] || {}),
          [`field_${Date.now()}`]: { operator: 'eq', value: '' }
        }
      }
    }))
  }

  const updateFilter = (table: string, field: string, updates: any) => {
    setReport((prev: any) => ({
      ...prev,
      filters: {
        ...prev.filters,
        [table]: {
          ...prev.filters[table],
          [field]: { ...prev.filters[table]?.[field], ...updates }
        }
      }
    }))
  }

  const removeFilter = (table: string, field: string) => {
    setReport((prev: any) => {
      const newFilters = { ...prev.filters }
      if (newFilters[table]) {
        delete newFilters[table][field]
        if (Object.keys(newFilters[table]).length === 0) {
          delete newFilters[table]
        }
      }
      return { ...prev, filters: newFilters }
    })
  }

  const handlePreview = async () => {
    setIsLoading(true)
    setIsPreviewMode(true)
    
    try {
      const response = await fetch('/api/report-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...report, name: report.name || 'Preview Report' })
      })
      
      if (response.ok) {
        const { report: savedReport } = await response.json()
        
        // Get report data
        const dataResponse = await fetch(`/api/report-builder?id=${savedReport.id}&include_data=true`)
        const { data } = await dataResponse.json()
        
        setPreviewData(data)
        onPreview?.(savedReport)
        
        // Clean up preview report
        await fetch(`/api/report-builder?id=${savedReport.id}`, { method: 'DELETE' })
      }
    } catch (error) {
      console.error('Preview failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!report.name.trim()) {
      alert('Please enter a report name')
      return
    }
    
    setIsLoading(true)
    
    try {
      const method = initialReport?.id ? 'PUT' : 'POST'
      const url = initialReport?.id ? `/api/report-builder?id=${initialReport.id}` : '/api/report-builder'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      })
      
      if (response.ok) {
        const { report: savedReport } = await response.json()
        onSave?.(savedReport)
      }
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Report Builder</h2>
          <p className="text-gray-600">Create custom reports and dashboards</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={isLoading || report.data_sources.length === 0}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !report.name.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-3 space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Report Settings</CardTitle>
              <CardDescription>Configure basic report information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name</Label>
                  <Input
                    id="report-name"
                    value={report.name}
                    onChange={(e) => setReport((prev: any) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter report name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select
                    value={report.report_type}
                    onValueChange={(value) => setReport((prev: any) => ({ ...prev, report_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center">
                            <type.icon className="h-4 w-4 mr-2" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-description">Description</Label>
                <Textarea
                  id="report-description"
                  value={report.description}
                  onChange={(e) => setReport((prev: any) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this report shows"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Data Sources</CardTitle>
                  <CardDescription>Select tables and fields for your report</CardDescription>
                </div>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Source
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Add Data Source</SheetTitle>
                      <SheetDescription>
                        Choose a table to add as a data source for your report
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 mt-6">
                      {DATA_SOURCES.map((source) => (
                        <Card
                          key={source.table}
                          className="cursor-pointer hover:border-blue-300 transition-colors"
                          onClick={() => addDataSource(source)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <source.icon className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">{source.name}</h4>
                                <p className="text-sm text-gray-600">
                                  {source.fields.length} available fields
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </CardHeader>
            <CardContent>
              {report.data_sources.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No data sources added yet</p>
                  <p className="text-sm text-gray-500">Add a data source to start building your report</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.data_sources.map((source: any, index: number) => (
                    <DataSourceConfig
                      key={index}
                      source={source}
                      sourceInfo={DATA_SOURCES.find((s: any) => s.table === source.table)}
                      onUpdate={(updates: any) => updateDataSource(index, updates)}
                      onRemove={() => removeDataSource(index)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          {report.data_sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Add conditions to filter your data</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={report.data_sources[0]?.table || ''}>
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${report.data_sources.length}, minmax(0, 1fr))` }}>
                    {report.data_sources.map((source: any) => {
                      const sourceInfo = DATA_SOURCES.find((s: any) => s.table === source.table)
                      return (
                        <TabsTrigger key={source.table} value={source.table} className="flex items-center">
                          {sourceInfo && <sourceInfo.icon className="h-4 w-4 mr-1" />}
                          {sourceInfo?.name}
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>

                  {report.data_sources.map((source: any) => (
                    <TabsContent key={source.table} value={source.table} className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Filters for {DATA_SOURCES.find((s: any) => s.table === source.table)?.name}</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addFilter(source.table)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Filter
                        </Button>
                      </div>

                      {report.filters[source.table] && Object.entries(report.filters[source.table]).map(([field, filter]: [string, any]) => (
                        <FilterConfig
                          key={field}
                          table={source.table}
                          field={field}
                          filter={filter}
                          availableFields={DATA_SOURCES.find((s: any) => s.table === source.table)?.fields || []}
                          onUpdate={(updates: any) => updateFilter(source.table, field, updates)}
                          onRemove={() => removeFilter(source.table, field)}
                        />
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-gray-600">{report.name || 'Untitled Report'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <Badge variant="outline">
                    {CHART_TYPES.find(t => t.value === report.report_type)?.label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Data Sources</Label>
                  <div className="space-y-1">
                    {report.data_sources.map((source: any, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {DATA_SOURCES.find((s: any) => s.table === source.table)?.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                {Object.keys(report.filters).length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Filters Applied</Label>
                    <p className="text-sm text-gray-600">
                      {Object.values(report.filters).reduce((acc: number, filters: any) => acc + Object.keys(filters).length, 0)} active
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chart Configuration */}
          {report.report_type !== 'table' && (
            <Card>
              <CardHeader>
                <CardTitle>Chart Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartConfig
                  reportType={report.report_type}
                  config={report.chart_config}
                  dataSources={report.data_sources}
                  availableFields={DATA_SOURCES}
                  onChange={(config: any) => setReport((prev: any) => ({ ...prev, chart_config: config }))}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewMode && (
        <Dialog open={isPreviewMode} onOpenChange={setIsPreviewMode}>
          <DialogContent className="max-w-6xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Report Preview</DialogTitle>
              <DialogDescription>
                Preview of "{report.name}"
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {previewData && (
                <ReportPreview
                  reportType={report.report_type}
                  data={previewData}
                  config={report}
                />
              )}
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewMode(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Data Source Configuration Component
function DataSourceConfig({ source, sourceInfo, onUpdate, onRemove }: any) {
  const [selectedFields, setSelectedFields] = useState(source.fields || [])

  useEffect(() => {
    onUpdate({ fields: selectedFields })
  }, [selectedFields])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {sourceInfo && <sourceInfo.icon className="h-5 w-5" />}
            <div>
              <CardTitle className="text-lg">{sourceInfo?.name}</CardTitle>
              <CardDescription>Configure fields and options</CardDescription>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Select Fields</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {sourceInfo?.fields.map((field: any) => (
                <div key={field.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${source.table}-${field.name}`}
                    checked={selectedFields.includes(field.name)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedFields((prev: string[]) => [...prev, field.name])
                      } else {
                        setSelectedFields((prev: string[]) => prev.filter((f: string) => f !== field.name))
                      }
                    }}
                  />
                  <Label
                    htmlFor={`${source.table}-${field.name}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Row Limit</Label>
              <Input
                type="number"
                value={source.limit || 100}
                onChange={(e) => onUpdate({ limit: parseInt(e.target.value) || 100 })}
                min="1"
                max="1000"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Filter Configuration Component  
function FilterConfig({ table, field, filter, availableFields, onUpdate, onRemove }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-medium">Filter</h5>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Field</Label>
            <Select
              value={filter.field || ''}
              onValueChange={(value) => onUpdate({ field: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((f: any) => (
                  <SelectItem key={f.name} value={f.name}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs">Operator</Label>
            <Select
              value={filter.operator || 'eq'}
              onValueChange={(value) => onUpdate({ operator: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs">Value</Label>
            <Input
              value={filter.value || ''}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder="Filter value"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Chart Configuration Component
function ChartConfig({ reportType, config, dataSources, availableFields, onChange }: any) {
  return (
    <div className="space-y-4">
      {reportType === 'bar' || reportType === 'line' ? (
        <>
          <div>
            <Label className="text-sm font-medium">X-Axis Field</Label>
            <Select
              value={config.x_axis || ''}
              onValueChange={(value) => onChange({ ...config, x_axis: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select X-axis field" />
              </SelectTrigger>
              <SelectContent>
                {dataSources.flatMap((source: any) => 
                  availableFields.find((af: any) => af.table === source.table)?.fields
                    .filter((f: any) => source.fields.includes(f.name))
                    .map((field: any) => (
                      <SelectItem key={`${source.table}.${field.name}`} value={field.name}>
                        {field.label}
                      </SelectItem>
                    )) || []
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Y-Axis Field</Label>
            <Select
              value={config.y_axis || ''}
              onValueChange={(value) => onChange({ ...config, y_axis: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Y-axis field" />
              </SelectTrigger>
              <SelectContent>
                {dataSources.flatMap((source: any) => 
                  availableFields.find((af: any) => af.table === source.table)?.fields
                    .filter((f: any) => source.fields.includes(f.name) && f.type === 'number')
                    .map((field: any) => (
                      <SelectItem key={`${source.table}.${field.name}`} value={field.name}>
                        {field.label}
                      </SelectItem>
                    )) || []
                )}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : reportType === 'pie' || reportType === 'donut' ? (
        <div>
          <Label className="text-sm font-medium">Group By Field</Label>
          <Select
            value={config.field || ''}
            onValueChange={(value) => onChange({ ...config, field: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select field to group by" />
            </SelectTrigger>
            <SelectContent>
              {dataSources.flatMap((source: any) => 
                availableFields.find((af: any) => af.table === source.table)?.fields
                  .filter((f: any) => source.fields.includes(f.name))
                  .map((field: any) => (
                    <SelectItem key={`${source.table}.${field.name}`} value={field.name}>
                      {field.label}
                    </SelectItem>
                  )) || []
              )}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  )
}

// Report Preview Component
function ReportPreview({ reportType, data, config }: any) {
  if (!data) return <div>Loading...</div>

  const firstTableData = Object.values(data)[0] as any
  const tableData = firstTableData?.data || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{config.name}</h3>
        <Badge>{reportType.charAt(0).toUpperCase() + reportType.slice(1)}</Badge>
      </div>
      
      {config.description && (
        <p className="text-gray-600">{config.description}</p>
      )}
      
      {reportType === 'table' ? (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {tableData[0] && Object.keys(tableData[0]).map((key) => (
                    <th key={key} className="px-4 py-2 text-left text-sm font-medium">
                      {key.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.slice(0, 10).map((row: any, index: number) => (
                  <tr key={index} className="border-t">
                    {Object.values(row).map((value: any, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-2 text-sm">
                        {value?.toString() || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tableData.length > 10 && (
            <div className="p-2 text-sm text-gray-500 text-center border-t">
              Showing first 10 of {tableData.length} records
            </div>
          )}
        </div>
      ) : (
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Chart preview would appear here</p>
            <p className="text-sm text-gray-500">Displaying {tableData.length} data points</p>
          </div>
        </div>
      )}
    </div>
  )
}