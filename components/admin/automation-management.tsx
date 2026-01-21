/**
 * Admin Email Automation Management Component
 * ConvertKit-style interface for managing email sequences across all tenants
 */

"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Mail,
  Play,
  Pause,
  Users,
  TrendingUp,
  Activity,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Settings,
  BarChart3,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface EmailSequence {
  id: string
  sequence_name: string
  description: string
  trigger_type: string
  target_audience: string
  is_active: boolean
  created_at: string
  updated_at: string
  profiles: {
    first_name: string
    last_name: string
    email: string
  }
  step_count: number
  analytics: {
    total_enrollments: number
    active_enrollments: number
    completed_enrollments: number
    completion_rate: number
    total_messages_sent: number
    delivery_rate: number
  }
}

interface Analytics {
  overview: {
    total_sequences: number
    active_sequences: number
    total_enrollments: number
    completion_rate: number
    total_messages_sent: number
    delivery_rate: number
  }
  daily_metrics: Array<{
    date: string
    enrollments: number
    messages_sent: number
    delivery_rate: number
  }>
  sequence_performance: Array<{
    id: string
    name: string
    completion_rate: number
    delivery_rate: number
    enrollments: number
    is_active: boolean
  }>
}

export function AutomationManagement() {
  const [sequences, setSequences] = useState<EmailSequence[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load sequences and analytics in parallel
      const [sequencesRes, analyticsRes] = await Promise.all([
        fetch(`/api/admin/automation/sequences?status=${statusFilter}&search=${searchTerm}`, {
          credentials: 'include'
        }),
        fetch('/api/admin/automation/analytics?range=30d', {
          credentials: 'include'
        })
      ])

      if (sequencesRes.ok) {
        const sequencesData = await sequencesRes.json()
        setSequences(sequencesData.sequences || [])
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData)
      }

    } catch (error) {
      console.error('Failed to load automation data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load automation data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSequenceToggle = async (sequence: EmailSequence) => {
    if (!sequence) return

    try {
      setActionLoading(sequence.id)

      const response = await fetch(`/api/admin/automation/sequences?id=${sequence.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          is_active: !sequence.is_active,
          pause_all_enrollments: !sequence.is_active ? false : true // Pause enrollments when disabling
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update sequence')
      }

      toast({
        title: 'Success',
        description: `Sequence ${!sequence.is_active ? 'enabled' : 'disabled'} successfully`
      })

      await loadData() // Reload data
      setSelectedSequence(null)
      setAlertOpen(false)

    } catch (error) {
      console.error('Failed to toggle sequence:', error)
      toast({
        title: 'Error',
        description: 'Failed to update sequence status',
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const filteredSequences = sequences.filter(sequence => {
    const matchesSearch = sequence.sequence_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sequence.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sequence.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && sequence.is_active) ||
                         (statusFilter === 'inactive' && !sequence.is_active)
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        Loading automation data...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Overview Cards */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Automation</h1>
          <p className="text-muted-foreground">Manage email sequences across all tenants</p>
        </div>
        <Button>
          <Mail className="h-4 w-4 mr-2" />
          Create Sequence
        </Button>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.active_sequences}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.overview.total_sequences} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.total_enrollments}</div>
              <p className="text-xs text-muted-foreground">
                Across all sequences
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.completion_rate}%</div>
              <p className="text-xs text-muted-foreground">
                Average across sequences
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.overview.delivery_rate}%</div>
              <p className="text-xs text-muted-foreground">
                {analytics.overview.total_messages_sent} messages sent
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="sequences" className="w-full">
        <TabsList>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="sequences" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search sequences, users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sequences</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sequences Table */}
          <Card>
            <CardHeader>
              <CardTitle>Email Sequences ({filteredSequences.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sequence</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrollments</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSequences.map((sequence) => (
                    <TableRow key={sequence.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sequence.sequence_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {sequence.step_count} steps • {sequence.trigger_type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {sequence.profiles?.first_name} {sequence.profiles?.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sequence.is_active ? 'default' : 'secondary'}>
                          {sequence.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{sequence.analytics.total_enrollments}</div>
                          <div className="text-muted-foreground">
                            {sequence.analytics.active_enrollments} active
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="text-sm font-medium">
                            {sequence.analytics.completion_rate}%
                          </span>
                          {sequence.analytics.completion_rate >= 80 ? (
                            <CheckCircle className="h-3 w-3 text-green-500 ml-1" />
                          ) : sequence.analytics.completion_rate >= 50 ? (
                            <AlertTriangle className="h-3 w-3 text-yellow-500 ml-1" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500 ml-1" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {sequence.analytics.delivery_rate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {new Date(sequence.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedSequence(sequence)
                              setDialogOpen(true)
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedSequence(sequence)
                              setAlertOpen(true)
                            }}>
                              {sequence.is_active ? (
                                <>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Enable
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredSequences.length === 0 && (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No sequences found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your filters'
                      : 'No email sequences have been created yet'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Analytics charts will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Sequences</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sequence Name</TableHead>
                      <TableHead>Enrollments</TableHead>
                      <TableHead>Completion Rate</TableHead>
                      <TableHead>Delivery Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.sequence_performance.slice(0, 10).map((seq) => (
                      <TableRow key={seq.id}>
                        <TableCell className="font-medium">{seq.name}</TableCell>
                        <TableCell>{seq.enrollments}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            seq.completion_rate >= 80 ? 'text-green-600' :
                            seq.completion_rate >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {seq.completion_rate}%
                          </span>
                        </TableCell>
                        <TableCell>{seq.delivery_rate}%</TableCell>
                        <TableCell>
                          <Badge variant={seq.is_active ? 'default' : 'secondary'}>
                            {seq.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Sequence Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedSequence?.sequence_name}</DialogTitle>
            <DialogDescription>
              Sequence details and analytics
            </DialogDescription>
          </DialogHeader>
          {selectedSequence && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Owner</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSequence.profiles?.first_name} {selectedSequence.profiles?.last_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Trigger Type</label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedSequence.trigger_type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{selectedSequence.analytics.total_enrollments}</div>
                  <div className="text-sm text-muted-foreground">Total Enrollments</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{selectedSequence.analytics.completion_rate}%</div>
                  <div className="text-sm text-muted-foreground">Completion Rate</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{selectedSequence.analytics.delivery_rate}%</div>
                  <div className="text-sm text-muted-foreground">Delivery Rate</div>
                </div>
              </div>

              {selectedSequence.description && (
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground">{selectedSequence.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedSequence?.is_active ? 'Disable' : 'Enable'} Sequence?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSequence?.is_active 
                ? 'This will disable the sequence and pause all active enrollments. Users will not receive further emails from this sequence.'
                : 'This will enable the sequence and allow new enrollments.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSequence && handleSequenceToggle(selectedSequence)}
              disabled={!!actionLoading}
            >
              {actionLoading === selectedSequence?.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {selectedSequence?.is_active ? 'Disable' : 'Enable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}