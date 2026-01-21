'use client'

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock, MapPin, Plus, Filter } from "lucide-react"
import { format, isToday, isTomorrow, isPast } from "date-fns"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/client"
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav"

export const dynamic = 'force-dynamic'

interface Task {
  id: string
  title: string
  description?: string
  due_date: string
  status: string
  priority: string
  client_id?: string
  deal_id?: string
}

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  description?: string
  location?: string
  type: 'meeting' | 'appointment' | 'call' | 'showing'
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')

  const supabase = createClient()

  useEffect(() => {
    loadTasksAndEvents()
  }, [selectedDate])

  const loadTasksAndEvents = async () => {
    try {
      setLoading(true)
      
      // Format date for database query
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      // Load tasks for selected date
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('due_date', dateStr)
        .order('created_at', { ascending: false })

      if (tasksError) {
        console.error('Error loading tasks:', tasksError)
      } else {
        setTasks(tasksData || [])
      }

      // Note: Events would be loaded from a future events table
      // For now, we'll show placeholder events
      setEvents([
        {
          id: '1',
          title: 'Client Meeting - Johnson Property',
          start_time: '09:00',
          end_time: '10:00',
          description: 'Discuss listing strategy',
          location: '123 Main St',
          type: 'meeting'
        },
        {
          id: '2', 
          title: 'Property Showing',
          start_time: '14:00',
          end_time: '15:00',
          description: 'Show 456 Oak Ave to potential buyers',
          location: '456 Oak Ave',
          type: 'showing'
        }
      ])

    } catch (error) {
      console.error('Error loading calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEEE, MMMM d, yyyy')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return 'Meeting'
      case 'call': return 'Call'
      case 'showing': return 'Showing'
      case 'appointment': return 'Appointment'
      default: return 'Event'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      {/* Header - following tasks-header pattern */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button
              className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <BreadcrumbNav />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
              {/* Calendar Widget */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              {/* Daily Schedule */}
              <div className="lg:col-span-2 space-y-4">
                {/* Selected Date Header */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        {getDateLabel(selectedDate)}
                      </div>
                      <Badge variant="outline">
                        {tasks.length + events.length} items
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                </Card>

                {loading ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="animate-pulse">Loading schedule...</div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Events Section */}
                    {events.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Events & Meetings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {events.map((event) => (
                            <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                              <div className="text-lg">{getEventTypeIcon(event.type)}</div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">{event.title}</h4>
                                  <span className="text-sm text-gray-500">
                                    {event.start_time} - {event.end_time}
                                  </span>
                                </div>
                                {event.description && (
                                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                                )}
                                {event.location && (
                                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Tasks Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Tasks Due</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {tasks.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No tasks due on this date</p>
                            <Button variant="outline" size="sm" className="mt-2">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Task
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {tasks.map((task) => (
                              <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">{task.title}</h4>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={getPriorityColor(task.priority)}>
                                        {task.priority}
                                      </Badge>
                                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                                        {task.status}
                                      </span>
                                    </div>
                                  </div>
                                  {task.description && (
                                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Task
                          </Button>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Schedule Meeting
                          </Button>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Book Showing
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </main>
    </div>
  )
}