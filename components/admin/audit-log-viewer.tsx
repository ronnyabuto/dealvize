/**
 * Advanced Audit Log Viewer Component
 * Enterprise-grade activity monitoring with filtering, search, and export
 */

"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Building,
  Activity,
  MoreHorizontal,
  RefreshCw,
  FileText,
  Settings,
  Loader2,
  X
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_id?: string
  user_id: string
  tenant_id?: string
  details?: string
  metadata: Record<string, any>
  severity: 'low' | 'medium' | 'high' | 'critical'
  success: boolean
  ip_address?: string
  user_agent?: string
  created_at: string
  user?: {
    id: string
    first_name: string
    last_name: string
    email: string
    avatar_url?: string
  }
  tenant?: {
    id: string
    name: string
    domain: string
  }
}

interface AuditFilters {
  action?: string
  entity_type?: string
  user_id?: string
  tenant_id?: string
  severity?: string
  success?: boolean
  start_date?: Date
  end_date?: Date
  search?: string
  ip_address?: string
}

interface AuditSummary {
  total_events: number
  success_rate: number
  top_actions: Array<{ action: string; count: number }>
  entity_types: Array<{ entity_type: string; count: number }>
  severity_distribution: Record<string, number>
  top_users: Array<{ user_id: string; activity_count: number }>
  unique_users: number
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [filters, setFilters] = useState<AuditFilters>({})
  const [availableFilters, setAvailableFilters] = useState<{
    actions: string[]
    entity_types: string[]
    severities: string[]
  }>({ actions: [], entity_types: [], severities: [] })
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [exportLoading, setExportLoading] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadAuditLogs()
  }, [currentPage, filters])

  const loadAuditLogs = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50'
      })

      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            params.append(key, value.toISOString())
          } else {
            params.append(key, value.toString())
          }
        }
      })

      if (searchTerm.trim()) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/admin/audit?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
      setSummary(data.summary)
      setAvailableFilters(data.filters)
      setTotalPages(data.pagination?.totalPages || 1)

    } catch (error) {
      console.error('Failed to load audit logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof AuditFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
    setCurrentPage(1)
  }

  const handleExport = async (format: 'json' | 'csv' | 'xlsx') => {
    try {
      setExportLoading(format)

      const params = new URLSearchParams()
      params.append('export_format', format)

      // Add current filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (value instanceof Date) {
            params.append(key, value.toISOString())
          } else {
            params.append(key, value.toString())
          }
        }
      })

      if (searchTerm.trim()) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/admin/audit?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Handle file download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${format}.${format === 'xlsx' ? 'xlsx' : format === 'csv' ? 'csv' : 'json'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Success',
        description: `Audit logs exported as ${format.toUpperCase()}`
      })

    } catch (error) {
      console.error('Export failed:', error)
      toast({
        title: 'Error',
        description: 'Failed to export audit logs',
        variant: 'destructive'
      })
    } finally {
      setExportLoading(null)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('login') || action.includes('auth')) return <User className="h-4 w-4" />
    if (action.includes('create') || action.includes('add')) return <CheckCircle className="h-4 w-4" />
    if (action.includes('delete') || action.includes('remove')) return <AlertTriangle className="h-4 w-4" />
    if (action.includes('update') || action.includes('edit')) return <Settings className="h-4 w-4" />
    return <Activity className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Monitor system activity and user actions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadAuditLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('json')} disabled={!!exportLoading}>
                {exportLoading === 'json' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')} disabled={!!exportLoading}>
                {exportLoading === 'csv' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')} disabled={!!exportLoading}>
                {exportLoading === 'xlsx' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Filters</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search actions, entities, details..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                      onKeyPress={(e) => e.key === 'Enter' && loadAuditLogs()}
                    />
                  </div>
                </div>
                <Button onClick={loadAuditLogs} disabled={loading}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Action</Label>
                  <Select value={filters.action || 'all'} onValueChange={(value) => handleFilterChange('action', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {availableFilters.actions.map(action => (
                        <SelectItem key={action} value={action}>{action}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Entity Type</Label>
                  <Select value={filters.entity_type || 'all'} onValueChange={(value) => handleFilterChange('entity_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {availableFilters.entity_types.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Severity</Label>
                  <Select value={filters.severity || 'all'} onValueChange={(value) => handleFilterChange('severity', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={filters.success?.toString() || 'all'} onValueChange={(value) => handleFilterChange('success', value === 'all' ? undefined : value === 'true')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="true">Success</SelectItem>
                      <SelectItem value="false">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.start_date ? format(filters.start_date, 'PPP') : 'Select start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.start_date}
                        onSelect={(date) => handleFilterChange('start_date', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.end_date ? format(filters.end_date, 'PPP') : 'Select end date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.end_date}
                        onSelect={(date) => handleFilterChange('end_date', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Logs ({summary?.total_events || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  Loading audit logs...
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead className="w-[50px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <span className="font-medium">{log.action}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{log.entity_type}</div>
                              {log.entity_id && (
                                <div className="text-muted-foreground text-xs">
                                  ID: {log.entity_id.substring(0, 8)}...
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {log.user ? (
                                <div>
                                  <div>{log.user.first_name} {log.user.last_name}</div>
                                  <div className="text-muted-foreground text-xs">{log.user.email}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">System</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.success ? 'default' : 'destructive'}>
                              {log.success ? 'Success' : 'Failed'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(log.severity)}>
                              {log.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLog(log)
                                setDialogOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {logs.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No audit logs found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your filters or date range
                      </p>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.total_events}</div>
                  <p className="text-xs text-muted-foreground">
                    {summary.success_rate}% successful
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.unique_users}</div>
                  <p className="text-xs text-muted-foreground">
                    Unique users with activity
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.success_rate}%</div>
                  <p className="text-xs text-muted-foreground">
                    Operation success rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Entity Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.entity_types.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Different entity types
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Log Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit event
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Timestamp</Label>
                  <p className="text-sm">{format(new Date(selectedLog.created_at), 'PPP pp')}</p>
                </div>
                <div>
                  <Label>Action</Label>
                  <p className="text-sm font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <Label>Entity Type</Label>
                  <p className="text-sm">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <Label>Entity ID</Label>
                  <p className="text-sm font-mono">{selectedLog.entity_id || 'N/A'}</p>
                </div>
                <div>
                  <Label>User</Label>
                  <p className="text-sm">
                    {selectedLog.user 
                      ? `${selectedLog.user.first_name} ${selectedLog.user.last_name} (${selectedLog.user.email})`
                      : 'System'
                    }
                  </p>
                </div>
                <div>
                  <Label>IP Address</Label>
                  <p className="text-sm font-mono">{selectedLog.ip_address || 'N/A'}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={selectedLog.success ? 'default' : 'destructive'}>
                    {selectedLog.success ? 'Success' : 'Failed'}
                  </Badge>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Badge className={getSeverityColor(selectedLog.severity)}>
                    {selectedLog.severity}
                  </Badge>
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <Label>Details</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <p className="text-sm">{selectedLog.details}</p>
                  </div>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <Label>Metadata</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <Label>User Agent</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <p className="text-xs break-all">{selectedLog.user_agent}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}