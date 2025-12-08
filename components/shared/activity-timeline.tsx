'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquare, Phone, Mail, Calendar, Users, DollarSign, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'note' | 'task' | 'deal' | 'client'
  subtype?: string
  title: string
  description: string
  timestamp: string
  userId?: string
  clientId?: string
  dealId?: string
  metadata?: any
}

interface ActivityTimelineProps {
  clientId: string
  limit?: number
}

export function ActivityTimeline({ clientId, limit = 20 }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      // In a real implementation, you'd have an activities endpoint
      // For now, we'll simulate by fetching from multiple sources
      const [notesRes, tasksRes, dealsRes] = await Promise.all([
        fetch(`/api/notes?client_id=${clientId}&limit=${Math.ceil(limit / 3)}`),
        fetch(`/api/tasks?client_id=${clientId}&limit=${Math.ceil(limit / 3)}`),
        fetch(`/api/deals?client_id=${clientId}&limit=${Math.ceil(limit / 3)}`)
      ])

      const [notesData, tasksData, dealsData] = await Promise.all([
        notesRes.ok ? notesRes.json() : { notes: [] },
        tasksRes.ok ? tasksRes.json() : { tasks: [] },
        dealsRes.ok ? dealsRes.json() : { deals: [] }
      ])

      const allActivities: ActivityItem[] = [
        // Notes activities
        ...(notesData.notes || []).map((note: any) => ({
          id: `note-${note.id}`,
          type: 'note' as const,
          subtype: note.type,
          title: getActivityTitle('note', note.type),
          description: note.content,
          timestamp: note.created_at,
          clientId: note.client_id,
          metadata: note
        })),
        // Tasks activities
        ...(tasksData.tasks || []).map((task: any) => ({
          id: `task-${task.id}`,
          type: 'task' as const,
          subtype: task.status,
          title: `Task: ${task.title}`,
          description: `${task.status} - Priority: ${task.priority}`,
          timestamp: task.updated_at || task.created_at,
          clientId: task.client_id,
          metadata: task
        })),
        // Deals activities
        ...(dealsData.deals || []).map((deal: any) => ({
          id: `deal-${deal.id}`,
          type: 'deal' as const,
          subtype: deal.status,
          title: `Deal: ${deal.title}`,
          description: `${deal.status} - ${deal.value}`,
          timestamp: deal.updated_at || deal.created_at,
          clientId: deal.client_id,
          metadata: deal
        }))
      ]

      // Sort by timestamp descending
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      setActivities(allActivities.slice(0, limit))
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }, [clientId, limit])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const getActivityTitle = (type: string, subtype?: string) => {
    switch (type) {
      case 'note':
        switch (subtype) {
          case 'call':
            return 'Phone Call'
          case 'email':
            return 'Email'
          case 'meeting':
            return 'Meeting'
          default:
            return 'Note Added'
        }
      default:
        return 'Activity'
    }
  }

  const getActivityIcon = (type: string, subtype?: string) => {
    switch (type) {
      case 'note':
        switch (subtype) {
          case 'call':
            return <Phone className="h-4 w-4" />
          case 'email':
            return <Mail className="h-4 w-4" />
          case 'meeting':
            return <Users className="h-4 w-4" />
          default:
            return <MessageSquare className="h-4 w-4" />
        }
      case 'task':
        switch (subtype) {
          case 'Completed':
            return <CheckCircle className="h-4 w-4" />
          case 'In Progress':
            return <Clock className="h-4 w-4" />
          default:
            return <AlertCircle className="h-4 w-4" />
        }
      case 'deal':
        return <DollarSign className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string, subtype?: string) => {
    switch (type) {
      case 'note':
        switch (subtype) {
          case 'call':
            return 'bg-blue-100 text-blue-800'
          case 'email':
            return 'bg-green-100 text-green-800'
          case 'meeting':
            return 'bg-purple-100 text-purple-800'
          default:
            return 'bg-gray-100 text-gray-800'
        }
      case 'task':
        switch (subtype) {
          case 'Completed':
            return 'bg-green-100 text-green-800'
          case 'In Progress':
            return 'bg-blue-100 text-blue-800'
          default:
            return 'bg-yellow-100 text-yellow-800'
        }
      case 'deal':
        switch (subtype) {
          case 'Closed':
            return 'bg-green-100 text-green-800'
          case 'Lost':
            return 'bg-red-100 text-red-800'
          case 'Under Contract':
            return 'bg-teal-100 text-teal-800'
          default:
            return 'bg-blue-100 text-blue-800'
        }
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Activity Timeline</span>
        </CardTitle>
        <CardDescription>
          Chronological view of all client interactions and updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activities found for this client.
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200"></div>
            
            <div className="space-y-6">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative flex items-start space-x-4">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-white border-2 border-gray-200 rounded-full">
                    <div className={`p-2 rounded-full ${getActivityColor(activity.type, activity.subtype)}`}>
                      {getActivityIcon(activity.type, activity.subtype)}
                    </div>
                  </div>
                  
                  {/* Activity content */}
                  <div className="flex-1 min-w-0 pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </h4>
                        <Badge variant="secondary" className={getActivityColor(activity.type, activity.subtype)}>
                          {activity.subtype || activity.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {activity.description}
                    </p>
                    
                    <div className="mt-2 text-xs text-gray-400">
                      {format(new Date(activity.timestamp), 'MMM d, yyyy • h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}