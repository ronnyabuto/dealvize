'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  AlertTriangle, 
  Power, 
  Shield, 
  Database,
  Users,
  Zap,
  Lock,
  RefreshCw,
  Activity,
  Wifi,
  Server,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

interface EmergencyControlsProps {
  className?: string
}

export function MobileEmergencyControls({ className }: EmergencyControlsProps) {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [apiLimiting, setApiLimiting] = useState(false)
  const [newRegistrations, setNewRegistrations] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const emergencyActions = [
    {
      id: 'maintenance',
      title: 'Maintenance Mode',
      description: 'Block all user access',
      icon: AlertTriangle,
      status: maintenanceMode,
      action: setMaintenanceMode,
      severity: 'high' as const,
      color: 'bg-red-500'
    },
    {
      id: 'api',
      title: 'API Rate Limiting',
      description: 'Throttle API requests',
      icon: Zap,
      status: apiLimiting,
      action: setApiLimiting,
      severity: 'medium' as const,
      color: 'bg-yellow-500'
    },
    {
      id: 'registration',
      title: 'New Registrations',
      description: 'Allow new user signups',
      icon: Users,
      status: newRegistrations,
      action: setNewRegistrations,
      severity: 'low' as const,
      color: 'bg-blue-500'
    },
    {
      id: 'email',
      title: 'Email Notifications',
      description: 'System email sending',
      icon: Shield,
      status: emailNotifications,
      action: setEmailNotifications,
      severity: 'low' as const,
      color: 'bg-green-500'
    }
  ]

  const quickActions = [
    { 
      id: 'backup', 
      title: 'Emergency Backup', 
      icon: Database, 
      color: 'bg-purple-500',
      action: () => handleQuickAction('backup')
    },
    { 
      id: 'restart', 
      title: 'Restart Services', 
      icon: RefreshCw, 
      color: 'bg-indigo-500',
      action: () => handleQuickAction('restart')
    },
    { 
      id: 'lockdown', 
      title: 'Security Lockdown', 
      icon: Lock, 
      color: 'bg-red-600',
      action: () => handleQuickAction('lockdown')
    }
  ]

  const systemMetrics = [
    { label: 'System Status', value: '99.9%', icon: Activity, color: 'text-green-600' },
    { label: 'Response Time', value: '120ms', icon: Wifi, color: 'text-blue-600' },
    { label: 'Active Users', value: '247', icon: Users, color: 'text-orange-600' },
    { label: 'Error Rate', value: '0.02%', icon: Server, color: 'text-purple-600' }
  ]

  const handleToggle = async (id: string, currentState: boolean, setter: (value: boolean) => void) => {
    setIsLoading(id)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setter(!currentState)
    setIsLoading(null)
  }

  const handleQuickAction = async (actionId: string) => {
    setIsLoading(actionId)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(null)
    // Show success notification
    console.log(`${actionId} completed successfully`)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500 bg-red-50'
      case 'medium': return 'border-yellow-500 bg-yellow-50'
      case 'low': return 'border-green-500 bg-green-50'
      default: return 'border-gray-500 bg-gray-50'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* System Metrics - Mobile Optimized */}
      <Card className="lg:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Quick Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3">
            {systemMetrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <p className="text-sm font-bold">{metric.value}</p>
                <p className="text-xs text-gray-500 truncate">{metric.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Emergency Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {emergencyActions.map((action) => (
            <div
              key={action.id}
              className={`p-3 rounded-lg border-2 ${getSeverityColor(action.severity)} transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg ${action.color} bg-opacity-20`}>
                    <action.icon className={`h-5 w-5 text-white`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{action.title}</p>
                    <p className="text-xs text-gray-500 truncate">{action.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {action.status ? (
                    <Badge variant="destructive" className="text-xs px-2 py-1">ON</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs px-2 py-1">OFF</Badge>
                  )}
                  <Switch
                    checked={action.status}
                    onCheckedChange={() => handleToggle(action.id, action.status, action.action)}
                    disabled={isLoading === action.id}
                    className="data-[state=checked]:bg-red-500"
                  />
                </div>
              </div>
              {isLoading === action.id && (
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Updating...
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                onClick={action.action}
                disabled={isLoading === action.id}
                className="h-auto p-4 flex items-center justify-start gap-3 text-left hover:shadow-md transition-all touch-manipulation"
              >
                <div className={`p-2 rounded-lg ${action.color} bg-opacity-20`}>
                  {isLoading === action.id ? (
                    <RefreshCw className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <action.icon className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{action.title}</p>
                  {isLoading === action.id && (
                    <p className="text-xs text-gray-500">Processing...</p>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health - Mobile Summary */}
      <Card className="lg:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Overall Status</span>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                Healthy
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-lg font-bold text-blue-600">99.9%</p>
                <p className="text-xs text-gray-500">Uptime</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-lg font-bold text-green-600">247</p>
                <p className="text-xs text-gray-500">Active Users</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}