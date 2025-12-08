"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MoreHorizontal, Calendar, Loader2, AlertCircle, Plus } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTasks } from "@/hooks/use-tasks"

interface TasksListProps {
  search?: string
  status?: string
  priority?: string
  dueSoon?: boolean
  overdue?: boolean
}

export function TasksList({ search = '', status = '', priority = '', dueSoon = false, overdue = false }: TasksListProps) {
  const router = useRouter()
  const { tasks, loading, error, toggleTaskComplete, deleteTask } = useTasks({ 
    search, 
    status, 
    priority, 
    dueSoon,
    overdue
  })
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    setUpdatingId(taskId)
    const success = await toggleTaskComplete(taskId, completed)
    if (!success) {
      alert('Failed to update task. Please try again.')
    }
    setUpdatingId(null)
  }

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${taskTitle}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(taskId)
    const success = await deleteTask(taskId)
    
    if (!success) {
      alert('Failed to delete task. Please try again.')
    }
    setDeletingId(null)
  }

  const handleEditTask = (taskId: string) => {
    router.push(`/tasks/edit/${taskId}`)
  }

  const handleAddTask = () => {
    router.push('/tasks/new')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading tasks: {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No tasks found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || status || priority ? 'Try adjusting your search or filter criteria.' : 'Get started by creating your first task.'}
          </p>
          <div className="mt-6">
            <Button 
              onClick={handleAddTask}
              className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const isUpdating = updatingId === task.id
        const isDeleting = deletingId === task.id
        const isOverdue = task.dueDate === "Yesterday"

        return (
          <Card key={task.id} className={`hover:shadow-md transition-shadow ${task.completed ? "opacity-60" : ""}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <Checkbox 
                    id={task.id} 
                    checked={task.completed || false}
                    disabled={isUpdating}
                    onCheckedChange={(checked) => handleToggleComplete(task.id, checked as boolean)}
                    className="mt-1 flex-shrink-0" 
                  />

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <h3 className={`text-base sm:text-lg font-semibold truncate ${task.completed ? "line-through text-gray-500" : "text-slate-900"}`}>
                        {task.title}
                      </h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={task.priorityColor} variant="secondary">
                          {task.priority}
                        </Badge>
                        <Badge variant="outline">{task.type}</Badge>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-gray-500">
                      {task.client && (
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0">
                            <AvatarImage src="/placeholder.svg?height=24&width=24" />
                            <AvatarFallback className="bg-blue-600 text-white text-xs">
                              {task.client.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{`${task.client.first_name} ${task.client.last_name}`}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className={`${isOverdue ? "text-red-600 font-medium" : ""}`}>
                          {task.dueDate}
                        </span>
                      </div>

                      {task.deal && (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded truncate">
                            Deal: {task.deal.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex-shrink-0" disabled={isUpdating || isDeleting}>
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditTask(task.id)}>
                      Edit Task
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleComplete(task.id, !task.completed)} disabled={isUpdating}>
                      {isUpdating ? 'Updating...' : task.completed ? 'Mark Incomplete' : 'Mark Complete'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        if (task.clientId) {
                          router.push(`/client/${task.clientId}`)
                        }
                      }} 
                      disabled={!task.clientId}
                    >
                      View Client
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        if (task.dealId) {
                          router.push(`/deal/${task.dealId}`)
                        }
                      }} 
                      disabled={!task.dealId}
                    >
                      View Deal
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600" 
                      onClick={() => handleDeleteTask(task.id, task.title)}
                      disabled={isDeleting}
                    >
                      Delete Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
