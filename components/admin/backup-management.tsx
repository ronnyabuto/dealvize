'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Database, Download, Upload, Trash2, Clock, CheckCircle, 
  XCircle, AlertTriangle, Settings, Play, Pause 
} from 'lucide-react'

interface BackupMetadata {
  id: string
  type: 'full' | 'incremental'
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime: string
  endTime?: string
  duration?: number
  size?: number
  tables: string[]
  recordCount: Record<string, number>
  location: string
  error?: string
}

export function BackupManagement() {
  const [backups, setBackups] = useState<BackupMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeOperation, setActiveOperation] = useState<string | null>(null)

  useEffect(() => {
    fetchBackups()
  }, [])

  const fetchBackups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backup')
      
      if (!response.ok) {
        throw new Error('Failed to fetch backups')
      }
      
      const result = await response.json()
      setBackups(result.backups || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups')
    } finally {
      setLoading(false)
    }
  }

  const createBackup = async (type: 'full' | 'incremental') => {
    try {
      setActiveOperation('creating')
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type,
          sinceTimestamp: type === 'incremental' ? getLastBackupTimestamp() : undefined
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create backup')
      }

      // Refresh backup list
      await fetchBackups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup')
    } finally {
      setActiveOperation(null)
    }
  }

  const cleanupBackups = async () => {
    try {
      setActiveOperation('cleaning')
      const response = await fetch('/api/backup/cleanup', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to cleanup backups')
      }

      await fetchBackups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup backups')
    } finally {
      setActiveOperation(null)
    }
  }

  const getLastBackupTimestamp = () => {
    const completedBackups = backups.filter(b => b.status === 'completed')
    if (completedBackups.length === 0) return new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const latest = completedBackups.reduce((latest, backup) => 
      new Date(backup.endTime || backup.startTime) > new Date(latest.endTime || latest.startTime) 
        ? backup 
        : latest
    )
    
    return latest.endTime || latest.startTime
  }

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${bytes} bytes`
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default' as const,
      failed: 'destructive' as const,
      running: 'secondary' as const,
      pending: 'outline' as const
    }
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>Loading backup information...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Backup Management</h2>
          <p className="text-gray-600">Create, restore, and manage database backups</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => createBackup('incremental')}
            disabled={!!activeOperation}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            Incremental Backup
          </Button>
          <Button 
            onClick={() => createBackup('full')}
            disabled={!!activeOperation}
          >
            <Database className="h-4 w-4 mr-2" />
            Full Backup
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {activeOperation && (
        <Alert>
          <Settings className="h-4 w-4 animate-spin" />
          <AlertDescription>
            {activeOperation === 'creating' && 'Creating backup...'}
            {activeOperation === 'cleaning' && 'Cleaning up old backups...'}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="backups" className="space-y-6">
        <TabsList>
          <TabsTrigger value="backups">Backup History</TabsTrigger>
          <TabsTrigger value="restore">Restore</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Backup History</h3>
            <Button 
              onClick={cleanupBackups}
              disabled={!!activeOperation}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Old Backups
            </Button>
          </div>

          <div className="grid gap-4">
            {backups.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Database className="h-8 w-8 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No backups found</p>
                </CardContent>
              </Card>
            ) : (
              backups.map((backup) => (
                <Card key={backup.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(backup.status)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{backup.id}</h4>
                            {getStatusBadge(backup.status)}
                            <Badge variant="outline">{backup.type}</Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Started: {new Date(backup.startTime).toLocaleString()}
                            {backup.endTime && (
                              <>
                                {' • '}
                                Completed: {new Date(backup.endTime).toLocaleString()}
                              </>
                            )}
                          </div>
                          {backup.duration && (
                            <div className="text-sm text-gray-600">
                              Duration: {formatDuration(backup.duration)}
                              {backup.size && (
                                <>
                                  {' • '}
                                  Size: {formatSize(backup.size)}
                                </>
                              )}
                            </div>
                          )}
                          {backup.error && (
                            <div className="text-sm text-red-600 mt-1">
                              Error: {backup.error}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right text-sm">
                          <div className="font-medium">
                            {Object.values(backup.recordCount).reduce((a, b) => a + b, 0)} records
                          </div>
                          <div className="text-gray-600">
                            {backup.tables.length} tables
                          </div>
                        </div>
                        {backup.status === 'completed' && (
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>

                    {backup.status === 'running' && (
                      <div className="mt-4">
                        <Progress value={50} className="w-full" />
                        <div className="text-xs text-gray-600 mt-1">
                          Creating backup...
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="restore">
          <Card>
            <CardHeader>
              <CardTitle>Restore Database</CardTitle>
              <CardDescription>
                Restore your database from a previous backup. This operation should be used with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Restoring a backup will overwrite existing data. Make sure to create a backup before proceeding.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Backup</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a backup to restore" />
                    </SelectTrigger>
                    <SelectContent>
                      {backups
                        .filter(b => b.status === 'completed')
                        .map(backup => (
                          <SelectItem key={backup.id} value={backup.id}>
                            {backup.id} - {new Date(backup.startTime).toLocaleString()}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline">
                    <Play className="h-4 w-4 mr-2" />
                    Test Restore (Dry Run)
                  </Button>
                  <Button variant="destructive">
                    <Upload className="h-4 w-4 mr-2" />
                    Restore Database
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Backup Settings</CardTitle>
              <CardDescription>
                Configure automatic backup schedules and retention policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Backup settings are configured through environment variables. 
                    Contact your system administrator to modify backup schedules.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Schedule Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Daily Backups</span>
                        <Badge variant="outline">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Weekly Backups</span>
                        <Badge variant="outline">Disabled</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Monthly Backups</span>
                        <Badge variant="outline">Enabled</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Retention Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Daily Retention</span>
                        <span className="text-sm font-medium">7 days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Weekly Retention</span>
                        <span className="text-sm font-medium">4 weeks</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Monthly Retention</span>
                        <span className="text-sm font-medium">12 months</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}