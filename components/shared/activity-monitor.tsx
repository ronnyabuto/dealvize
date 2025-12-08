"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Activity, 
  Search, 
  Filter,
  User,
  FileText,
  Users,
  Briefcase,
  Calendar,
  Eye,
  Plus,
  Edit,
  Trash2,
  Clock
} from "lucide-react"

interface ActivityItem {
  id: string
  user_email: string
  action: string
  resource_type: string
  resource_id: string
  timestamp: string
  details: string
}

interface ActivityMonitorProps {
  activities: ActivityItem[]
}

export function ActivityMonitor({ activities }: ActivityMonitorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterUser, setFilterUser] = useState<string>('all')

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'created':
        return <Plus className="h-4 w-4 text-green-600" />
      case 'update':
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-600" />
      case 'delete':
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-red-600" />
      case 'view':
      case 'viewed':
        return <Eye className="h-4 w-4 text-gray-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType.toLowerCase()) {
      case 'deal':
      case 'deals':
        return <Briefcase className="h-4 w-4" />
      case 'client':
      case 'clients':
        return <Users className="h-4 w-4" />
      case 'task':
      case 'tasks':
        return <Calendar className="h-4 w-4" />
      case 'user':
      case 'users':
        return <User className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.details.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || activity.resource_type.toLowerCase() === filterType.toLowerCase()
    const matchesUser = filterUser === 'all' || activity.user_email === filterUser
    
    return matchesSearch && matchesType && matchesUser
  })

  const uniqueUsers = Array.from(new Set(activities.map(a => a.user_email)))
  const uniqueResourceTypes = Array.from(new Set(activities.map(a => a.resource_type)))

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Monitor
          </CardTitle>
          <p className="text-sm text-gray-600">
            Monitor all team member activities across the system
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueResourceTypes.map(type => (
                  <SelectItem key={type} value={type.toLowerCase()}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Activity ({filteredActivities.length})</span>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Export Log
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">No activities found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  {/* User Avatar */}
                  <div className="w-10 h-10 bg-dealvize-teal rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                    {activity.user_email.charAt(0).toUpperCase()}
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-gray-900">
                        {activity.user_email}
                      </p>
                      <div className="flex items-center gap-1">
                        {getActionIcon(activity.action)}
                        <span className="text-sm text-gray-600">
                          {activity.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getResourceIcon(activity.resource_type)}
                        <span className="text-sm text-gray-600">
                          {activity.resource_type}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {activity.details}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(activity.timestamp)}
                      </div>
                      {activity.resource_id && (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            ID: {activity.resource_id.slice(0, 8)}...
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {uniqueResourceTypes.map(type => {
          const typeActivities = activities.filter(a => a.resource_type === type)
          const todayActivities = typeActivities.filter(a => {
            const activityDate = new Date(a.timestamp).toDateString()
            const today = new Date().toDateString()
            return activityDate === today
          })

          return (
            <Card key={type}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {getResourceIcon(type)}
                </div>
                <p className="text-lg font-bold text-gray-900">{todayActivities.length}</p>
                <p className="text-sm text-gray-600">{type} activities today</p>
                <p className="text-xs text-gray-500">{typeActivities.length} total</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}