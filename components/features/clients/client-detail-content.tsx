"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Phone, MapPin, Building2, DollarSign, Calendar, Plus, AlertCircle, MessageSquare } from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import { type Client } from "@/lib/types"
import { ClientNotes } from "@/components/features/clients/client-notes"
import { ActivityTimeline } from "@/components/shared/activity-timeline"
import { SmsDialog } from "@/components/features/messaging/sms-dialog"
import { SmsHistory } from "@/components/features/messaging/sms-history"
import { EmailDialog } from "@/components/features/messaging/email-dialog"
import { EmailHistory } from "@/components/features/messaging/email-history"
import { formatDate, formatCurrency } from "@/lib/utils"

interface ClientDetailContentProps {
  client: Client
}

interface Deal {
  id: string
  title: string
  value: number
  status: string
  expected_close_date: string
}

interface Task {
  id: string
  title: string
  status: string
  due_date: string
  priority: string
}

interface Note {
  id: string
  content: string
  created_at: string
}

export function ClientDetailContent({ client }: ClientDetailContentProps) {
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()

        // Fetch deals for this client
        const { data: dealsData, error: dealsError } = await supabase
          .from('deals')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })

        if (dealsError) throw dealsError

        // Fetch tasks for this client
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('client_id', client.id)
          .order('due_date', { ascending: true })
          .limit(5)

        if (tasksError) throw tasksError

        // Note: notes table doesn't exist in current schema
        // To enable notes, create a 'notes' table with: id, content, created_at, user_id, client_id
        // const { data: notesData, error: notesError } = await supabase
        //   .from('notes')
        //   .select('*')
        //   .eq('client_id', client.id)
        //   .order('created_at', { ascending: false })
        //   .limit(5)
        // if (notesError) throw notesError

        setDeals(dealsData || [])
        setTasks(tasksData || [])
        setNotes([]) // Notes disabled - table doesn't exist
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchClientData()
  }, [client.id])


  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'lead':
        return 'bg-yellow-100 text-yellow-800'
      case 'in progress':
        return 'bg-blue-100 text-blue-800'
      case 'under contract':
        return 'bg-teal-100 text-teal-800'
      case 'closed':
        return 'bg-green-100 text-green-800'
      case 'lost':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading client details...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading client data: {error}
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <div className="space-y-6">
      {/* Client Header */}
      <div className="flex items-start gap-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src="/placeholder.svg?height=80&width=80" />
          <AvatarFallback className="bg-blue-600 text-white text-2xl font-bold">
            {client.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">{`${client.first_name} ${client.last_name}`}</h1>
            <Badge className={client.statusColor} variant="secondary">
              {client.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Last Contact: {client.lastContact}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.email && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span className="text-sm">{client.email}</span>
                </div>
                <EmailDialog
                  clientId={client.id}
                  clientName={`${client.first_name} ${client.last_name}`}
                  clientEmail={client.email}
                  trigger={
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <Mail className="h-3 w-3" />
                    </Button>
                  }
                />
              </div>
            )}
            {client.phone && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <a
                    href={`tel:${client.phone}`}
                    className="text-sm hover:text-blue-600 hover:underline"
                  >
                    {client.phone}
                  </a>
                </div>
                <SmsDialog
                  clientId={client.id}
                  clientName={`${client.first_name} ${client.last_name}`}
                  clientPhone={client.phone}
                  trigger={
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  }
                />
              </div>
            )}
            {client.company && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-gray-400" />
                <span className="text-sm">{client.company}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span className="text-sm">{client.address}</span>
              </div>
            )}
            <div className="flex items-center gap-3 pt-2 border-t">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <span className="text-sm font-medium">Deal Value:</span>
                <span className="ml-2 text-lg font-bold text-green-600">{client.dealValue}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Deals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Deals</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                onClick={() => router.push(`/deals/new?client=${client.id}`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Deal
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {deals.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No active deals</p>
            ) : (
              <div className="space-y-3">
                {deals.slice(0, 3).map((deal) => (
                  <div key={deal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{deal.title}</h4>
                      <Badge className={getStatusColor(deal.status)} variant="secondary">
                        {deal.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span className="font-bold">{formatCurrency(deal.value)}</span>
                      {deal.expected_close_date && (
                        <span>Close: {formatDate(deal.expected_close_date)}</span>
                      )}
                    </div>
                  </div>
                ))}
                {deals.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => router.push(`/deals?client=${client.id}`)}
                  >
                    View all {deals.length} deals
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Notes</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                onClick={() => router.push(`/notes/new?client=${client.id}`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id}>
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {formatDate(note.created_at)}
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-3">
                      {note.content}
                    </div>
                  </div>
                ))}
                {notes.length >= 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => router.push(`/notes?client=${client.id}`)}
                  >
                    View all notes
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                onClick={() => router.push(`/tasks/new?client=${client.id}`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No upcoming tasks</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(task.priority)} variant="secondary">
                          {task.priority}
                        </Badge>
                        <Badge className={getStatusColor(task.status)} variant="secondary">
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                    {task.due_date && (
                      <div className="text-sm text-gray-600">
                        Due: {formatDate(task.due_date)}
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => router.push(`/tasks?client=${client.id}`)}
                >
                  View all tasks
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push(`/deals/new?client=${client.id}`)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Deal
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push(`/tasks/new?client=${client.id}`)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push(`/notes/new?client=${client.id}`)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
              {client.email && (
                <EmailDialog
                  clientId={client.id}
                  clientName={`${client.first_name} ${client.last_name}`}
                  clientEmail={client.email}
                  trigger={
                    <Button variant="outline" size="sm" className="justify-start">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  }
                />
              )}
              {client.phone && (
                <SmsDialog
                  clientId={client.id}
                  clientName={`${client.first_name} ${client.last_name}`}
                  clientPhone={client.phone}
                  trigger={
                    <Button variant="outline" size="sm" className="justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send SMS
                    </Button>
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes & Communication Section */}
        <ClientNotes clientId={client.id} clientName={`${client.first_name} ${client.last_name}`} />

        {/* Activity Timeline */}
        <ActivityTimeline clientId={client.id} />
      </div>

      {/* Communication History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmailHistory clientId={client.id} showClientName={false} />
        <SmsHistory clientId={client.id} showClientName={false} />
      </div>
    </div>
  )
}
