"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Loader2, DollarSign, Calendar, MapPin, Building2, User, Plus, AlertCircle, Bed, Bath, Square } from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import { type Deal } from "@/lib/types"
import { formatDate, formatCurrency } from "@/lib/utils"

interface DealDetailContentProps {
  deal: Deal
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string
  phone: string
  status: string
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

export function DealDetailContent({ deal }: DealDetailContentProps) {
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchDealData = async () => {
      try {
        setLoading(true)
        setError(null)

        let clientData = null
        if (deal.clientId) {
          const { data, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', deal.clientId)
            .single()

          // Don't throw error if client not found, just set to null
          if (!clientError) {
            clientData = data
          } else if (clientError.code !== 'PGRST116') {
            // Only throw if it's not a "not found" error
            throw clientError
          }
        }

        // Fetch tasks for this deal
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('deal_id', deal.id)
          .order('due_date', { ascending: true })
          .limit(5)

        if (tasksError) throw tasksError

        // Fetch notes for this deal
        // Note: notes table doesn't exist in current schema
        // const { data: notesData, error: notesError } = await supabase
        //   .from('notes')
        //   .select('*')
        //   .eq('deal_id', deal.id)
        //   .order('created_at', { ascending: false })
        //   .limit(5)
        // if (notesError) throw notesError

        setClient(clientData)
        setTasks(tasksData || [])
        setNotes([]) // Notes disabled - table doesn't exist
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDealData()
  }, [deal.id, deal.clientId])


  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'lead':
        return 'bg-gray-100 text-gray-800'
      case 'in progress':
        return 'bg-blue-100 text-blue-800'
      case 'under contract':
        return 'bg-yellow-100 text-yellow-800'
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
          <span>Loading deal details...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading deal data: {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Deal Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm font-medium">Deal Value:</span>
                  <span className="ml-2 text-lg font-bold text-green-600">{deal.value}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm font-medium">Commission:</span>
                  <span className="ml-2 text-lg font-bold text-dealvize-teal">{deal.commission}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm font-medium">Expected Close:</span>
                  <span className="ml-2 text-sm">{deal.expectedCloseDate}</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Probability</span>
                  <span className="font-medium">{deal.probability}%</span>
                </div>
                <Progress value={deal.probability} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            {client ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="/placeholder.svg?height=48&width=48" />
                    <AvatarFallback className="bg-blue-600 text-white font-bold">
                      {`${client.first_name.charAt(0)}${client.last_name.charAt(0)}`}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{`${client.first_name} ${client.last_name}`}</h3>
                    <Badge className={getStatusColor(client.status)} variant="secondary">
                      {client.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  {client.email && (
                    <div className="text-sm">
                      <span className="text-gray-600">Email: </span>
                      <span className="text-blue-600">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="text-sm">
                      <span className="text-gray-600">Phone: </span>
                      <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                        {client.phone}
                      </a>
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/client/${client.id}`)}
                >
                  <User className="h-4 w-4 mr-2" />
                  View Client Profile
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Client information not available</p>
            )}
          </CardContent>
        </Card>

        {/* Property Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Property Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deal.property.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <span className="text-sm font-medium">Address:</span>
                  <p className="text-sm text-gray-700 mt-1">{deal.property.address}</p>
                </div>
              </div>
            )}

            {deal.property.type && (
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm font-medium">Type:</span>
                  <span className="ml-2 text-sm">{deal.property.type}</span>
                </div>
              </div>
            )}

            {(deal.property.bedrooms || deal.property.bathrooms || deal.property.sqft) && (
              <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                {deal.property.bedrooms && (
                  <div className="text-center">
                    <Bed className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                    <div className="text-sm font-semibold">{deal.property.bedrooms}</div>
                    <div className="text-xs text-gray-600">Bedrooms</div>
                  </div>
                )}
                {deal.property.bathrooms && (
                  <div className="text-center">
                    <Bath className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                    <div className="text-sm font-semibold">{deal.property.bathrooms}</div>
                    <div className="text-xs text-gray-600">Bathrooms</div>
                  </div>
                )}
                {deal.property.sqft && (
                  <div className="text-center">
                    <Square className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                    <div className="text-sm font-semibold">{deal.property.sqft.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Sq Ft</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Related Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Related Tasks</CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                onClick={() => router.push(`/tasks/new?deal=${deal.id}`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No tasks yet</p>
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
                  onClick={() => router.push(`/tasks?deal=${deal.id}`)}
                >
                  View all tasks
                </Button>
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
                onClick={() => router.push(`/notes/new?deal=${deal.id}`)}
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
                    onClick={() => router.push(`/notes?deal=${deal.id}`)}
                  >
                    View all notes
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => router.push(`/tasks/new?deal=${deal.id}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => router.push(`/notes/new?deal=${deal.id}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => router.push(`/deals/edit/${deal.id}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Edit Deal
            </Button>
            {client && (
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push(`/client/${client.id}`)}
              >
                <User className="h-4 w-4 mr-2" />
                View Client
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}