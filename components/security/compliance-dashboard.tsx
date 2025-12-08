'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Shield, 
  Download, 
  Trash2, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Lock,
  Unlock,
  Globe,
  Building,
  Users,
  Calendar,
  Activity,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComplianceData {
  score: number
  lastAudit: string
  dataExports: number
  dataDelections: number
  activeConsents: number
  piiRecords: number
  retentionPolicies: number
  legalHolds: number
}

interface DataExportRequest {
  id: string
  format: string
  status: 'pending' | 'completed' | 'failed'
  requestedAt: string
  completedAt?: string
  recordCount?: number
  fileSize?: string
}

interface DataDeletionRequest {
  id: string
  status: 'pending' | 'reviewing' | 'completed' | 'rejected'
  reason: string
  requestedAt: string
  estimatedCompletion?: string
  retainLegalData: boolean
}

interface ComplianceDashboardProps {
  data: ComplianceData
  exportRequests: DataExportRequest[]
  deletionRequests: DataDeletionRequest[]
  onRequestExport: (format: string) => void
  onRequestDeletion: (options: any) => void
}

export function ComplianceDashboard({ 
  data, 
  exportRequests, 
  deletionRequests,
  onRequestExport,
  onRequestDeletion 
}: ComplianceDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showPII, setShowPII] = useState(false)
  const [deletionConfirmation, setDeletionConfirmation] = useState('')
  const [deletionReason, setDeletionReason] = useState('')
  const [retainLegalData, setRetainLegalData] = useState(true)

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreDescription = (score: number) => {
    if (score >= 90) return 'Excellent compliance posture'
    if (score >= 75) return 'Good compliance with minor issues'
    if (score >= 50) return 'Moderate compliance - action needed'
    return 'Poor compliance - immediate action required'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security & Compliance</h1>
          <p className="text-gray-600">Manage data privacy, security, and regulatory compliance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>SOC2 Compliant</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Globe className="h-3 w-3" />
            <span>GDPR Ready</span>
          </Badge>
        </div>
      </div>

      {/* Compliance Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Compliance Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={cn('text-4xl font-bold', getScoreColor(data.score))}>
                {data.score}%
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {getScoreDescription(data.score)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Last audit</p>
              <p className="font-medium">{data.lastAudit}</p>
            </div>
          </div>
          <Progress value={data.score} className="h-2" />
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Data Exports</p>
                <p className="text-2xl font-bold">{data.dataExports}</p>
              </div>
              <Download className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">PII Records</p>
                <p className="text-2xl font-bold">{data.piiRecords}</p>
              </div>
              <Lock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Consents</p>
                <p className="text-2xl font-bold">{data.activeConsents}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Legal Holds</p>
                <p className="text-2xl font-bold">{data.legalHolds}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data-rights">Data Rights</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Recent Compliance Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Download className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Data export completed</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Consent updated</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Security scan completed</p>
                      <p className="text-xs text-gray-500">2 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Compliance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Data Encryption</span>
                      <span>95%</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Access Controls</span>
                      <span>88%</span>
                    </div>
                    <Progress value={88} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Audit Logging</span>
                      <span>100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Data Retention</span>
                      <span>78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data-rights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data Export */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Export Your Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Download a copy of all your personal data in compliance with GDPR Article 20.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => onRequestExport('json')}
                    className="w-full"
                  >
                    JSON
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onRequestExport('csv')}
                    className="w-full"
                  >
                    CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onRequestExport('xml')}
                    className="w-full"
                  >
                    XML
                  </Button>
                </div>

                {exportRequests.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recent Export Requests</h4>
                    {exportRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="text-sm font-medium">{request.format.toUpperCase()}</span>
                          <span className="text-xs text-gray-500 ml-2">{request.requestedAt}</span>
                        </div>
                        <Badge variant={
                          request.status === 'completed' ? 'default' : 
                          request.status === 'failed' ? 'destructive' : 'secondary'
                        }>
                          {request.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Deletion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5" />
                  <span>Delete Your Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Permanently delete your personal data. This action cannot be undone.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="deletion-reason">Reason for deletion</Label>
                    <Textarea
                      id="deletion-reason"
                      placeholder="Please provide a reason for data deletion..."
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="retain-legal"
                      checked={retainLegalData}
                      onCheckedChange={setRetainLegalData}
                    />
                    <Label htmlFor="retain-legal" className="text-sm">
                      Retain data required for legal compliance
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="confirmation">Type "DELETE-CONFIRM" to proceed</Label>
                    <Input
                      id="confirmation"
                      placeholder="DELETE-CONFIRM"
                      value={deletionConfirmation}
                      onChange={(e) => setDeletionConfirmation(e.target.value)}
                    />
                  </div>

                  <Button 
                    variant="destructive" 
                    className="w-full"
                    disabled={
                      deletionConfirmation !== 'DELETE-CONFIRM' || 
                      !deletionReason.trim()
                    }
                    onClick={() => onRequestDeletion({
                      reason: deletionReason,
                      retainLegalData
                    })}
                  >
                    Request Data Deletion
                  </Button>
                </div>

                {deletionRequests.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Deletion Requests</h4>
                    {deletionRequests.map((request) => (
                      <div key={request.id} className="p-2 bg-gray-50 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Request #{request.id.slice(0, 8)}</span>
                          <Badge variant={
                            request.status === 'completed' ? 'default' : 
                            request.status === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">{request.reason}</p>
                        <p className="text-xs text-gray-500">
                          Requested: {request.requestedAt}
                          {request.estimatedCompletion && (
                            <span> • Est. completion: {request.estimatedCompletion}</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PII Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Personal Data Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Show sensitive data</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPII(!showPII)}
                    >
                      {showPII ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Email addresses</span>
                    <Badge variant="outline">Encrypted</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Phone numbers</span>
                    <Badge variant="outline">Encrypted</Badge>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Notes & messages</span>
                    <Badge variant="secondary">Protected</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Two-factor authentication</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data encryption</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Secure API access</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Regular backups</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data Retention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Data Retention Policies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 border rounded">
                  <h4 className="font-medium text-sm mb-1">Client Data</h4>
                  <p className="text-xs text-gray-600">Retained for 7 years after last contact</p>
                </div>
                <div className="p-3 border rounded">
                  <h4 className="font-medium text-sm mb-1">Communication Logs</h4>
                  <p className="text-xs text-gray-600">Retained for 3 years</p>
                </div>
                <div className="p-3 border rounded">
                  <h4 className="font-medium text-sm mb-1">Analytics Data</h4>
                  <p className="text-xs text-gray-600">Retained for 2 years</p>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Certifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Compliance Certifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Badge variant="default">SOC 2 Type II</Badge>
                  <span className="text-xs text-green-600">Active</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="default">GDPR Compliant</Badge>
                  <span className="text-xs text-green-600">Active</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="default">CCPA Compliant</Badge>
                  <span className="text-xs text-green-600">Active</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">ISO 27001</Badge>
                  <span className="text-xs text-yellow-600">In Progress</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}