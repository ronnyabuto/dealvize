"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { APIErrorBoundary } from "@/components/shared/error-boundary"

interface Task {
  id: string
  title: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Pending' | 'In Progress' | 'Completed'
  due_date: string
  client_id?: string
  clients?: {
    id: string
    first_name: string
    last_name: string
  }
}

export function TasksDueToday() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatDueDate = (dueDateString: string): { text: string; isOverdue: boolean } => {
    if (!dueDateString) return { text: 'No due date', isOverdue: false }
    
    const dueDate = new Date(dueDateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Reset time for comparison
    today.setHours(0, 0, 0, 0)
    tomorrow.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    
    const isOverdue = dueDate < today
    
    if (dueDate.getTime() === today.getTime()) return { text: 'Due today', isOverdue: false }
    if (dueDate.getTime() === tomorrow.getTime()) return { text: 'Due tomorrow', isOverdue: false }
    if (isOverdue) return { text: 'Overdue', isOverdue: true }
    
    return { 
      text: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
      isOverdue: false 
    }
  }

  useEffect(() => {
    async function fetchTasks() {
      try {
        // Fetch tasks due today and pending tasks
        const response = await fetch('/api/tasks?due_soon=true&limit=10', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        })
        
        if (!response.ok) {
          // Handle different error types
          if (response.status === 401) {
            console.warn('User not authenticated, showing empty tasks')
            setTasks([])
            return
          } else if (response.status === 404) {
            console.warn('Tasks API endpoint not found')
            setTasks([])
            return
          } else {
            const errorText = await response.text()
            throw new Error(`Failed to fetch tasks: ${response.status} - ${errorText}`)
          }
        }
        
        const data = await response.json()
        setTasks(data.tasks || data.data || [])
      } catch (err) {
        console.error('Error fetching tasks:', err)
        // Don't show error for authentication issues, just show empty state
        if (err instanceof Error && err.message.includes('401')) {
          setTasks([])
        } else {
          setError('Unable to load tasks at this time')
          setTasks([])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: completed ? 'Completed' : 'Pending'
        }),
      })

      if (response.ok) {
        setTasks(tasks.map(task => 
          task.id === taskId 
            ? { ...task, status: completed ? 'Completed' : 'Pending' }
            : task
        ))
      }
    } catch (err) {
      console.error('Error updating task:', err)
    }
  }

  const todaysTasks = tasks
    .filter(task => {
      if (task.status === 'Completed') return false
      const today = new Date()
      const taskDate = new Date(task.due_date)
      
      // Include tasks due today, overdue tasks, or tasks with no due date but pending
      return (
        taskDate.toDateString() === today.toDateString() || // Due today
        taskDate < today || // Overdue
        (!task.due_date && task.status === 'Pending') // No due date but pending
      )
    })
    .sort((a, b) => {
      // Sort by due date (earliest first), with overdue tasks at the top
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      
      const dateA = new Date(a.due_date)
      const dateB = new Date(b.due_date)
      
      return dateA.getTime() - dateB.getTime()
    })

  // Calculate progress based on today's tasks only
  const todaysTasksIncludingCompleted = tasks.filter(task => {
    const today = new Date()
    const taskDate = new Date(task.due_date)
    
    // Include tasks due today, overdue tasks, or tasks with no due date
    return (
      taskDate.toDateString() === today.toDateString() || // Due today
      taskDate < today || // Overdue
      (!task.due_date && task.status !== 'Completed') // No due date
    )
  })
  
  const completedTodaysTasks = todaysTasksIncludingCompleted.filter(task => task.status === 'Completed').length
  const totalTodaysTasks = todaysTasksIncludingCompleted.length
  const progressPercentage = totalTodaysTasks > 0 ? (completedTodaysTasks / totalTodaysTasks) * 100 : 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between space-x-3 p-2">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Tasks Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-dealvize-teal hover:underline mt-2"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <APIErrorBoundary>
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Tasks Today</CardTitle>
          <Badge variant="secondary" className={todaysTasks.some(t => formatDueDate(t.due_date).isOverdue) ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}>
            {todaysTasks.length} {todaysTasks.length === 1 ? 'Task' : 'Tasks'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {todaysTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No tasks due today</p>
            <p className="text-sm">Great job staying on top of things!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysTasks.map((task) => {
              const dueDateInfo = formatDueDate(task.due_date)
              
              return (
                <div key={task.id} className="flex items-center justify-between space-x-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3 flex-1">
                    <Checkbox 
                      id={task.id}
                      checked={task.status === 'Completed'}
                      onCheckedChange={(checked) => handleTaskToggle(task.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={task.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block"
                      >
                        {task.title}
                      </label>
                      <div className={`text-xs mt-1 ${dueDateInfo.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {dueDateInfo.text}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {task.clients && (
                      <Badge variant="outline" className="text-xs">
                        {`${task.clients.first_name || ''} ${task.clients.last_name || ''}`.trim() || 'Unknown'}
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className={
                        task.priority === "High" ? "border-red-300 text-red-700" :
                        task.priority === "Medium" ? "border-yellow-300 text-yellow-700" :
                        "border-green-300 text-green-700"
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {totalTodaysTasks > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Today's Progress</span>
              <span className="text-sm text-gray-600">
                {completedTodaysTasks}/{totalTodaysTasks}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {completedTodaysTasks > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-gray-600">Recently Completed</p>
            {todaysTasksIncludingCompleted
              .filter((task) => task.status === 'Completed')
              .slice(0, 3)
              .map((task) => (
                <div key={task.id} className="flex items-center space-x-3 opacity-60">
                  <Checkbox checked disabled />
                  <label className="text-sm leading-none line-through">
                    {task.title}
                  </label>
                </div>
              ))}
          </div>
        )}
      </CardContent>
      </Card>
    </APIErrorBoundary>
  )
}
