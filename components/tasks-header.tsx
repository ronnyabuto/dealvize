"use client"

import { useRouter } from "next/navigation"
import { Search, Plus, Filter, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { GlobalSearch } from "./global-search"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TasksHeaderProps {
  onSearchChange?: (search: string) => void
  onStatusChange?: (status: string) => void
  onPriorityChange?: (priority: string) => void
  onDueSoonChange?: (dueSoon: boolean) => void
  onOverdueChange?: (overdue: boolean) => void
  currentSearch?: string
  currentStatus?: string
  currentPriority?: string
  dueSoon?: boolean
  overdue?: boolean
}

export function TasksHeader({ 
  onSearchChange = () => {},
  onStatusChange = () => {},
  onPriorityChange = () => {},
  onDueSoonChange = () => {},
  onOverdueChange = () => {},
  currentSearch = '',
  currentStatus = '',
  currentPriority = '',
  dueSoon = false,
  overdue = false
}: TasksHeaderProps) {
  const router = useRouter()

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'all':
        onStatusChange('')
        onDueSoonChange(false)
        onOverdueChange(false)
        break
      case 'due-today':
        onDueSoonChange(true)
        onOverdueChange(false)
        onStatusChange('')
        break
      case 'overdue':
        onOverdueChange(true)
        onDueSoonChange(false)
        onStatusChange('')
        break
      case 'completed':
        onStatusChange('Completed')
        onDueSoonChange(false)
        onOverdueChange(false)
        break
    }
  }

  const getCurrentTab = (): string => {
    if (currentStatus === 'Completed') return 'completed'
    if (dueSoon) return 'due-today'
    if (overdue) return 'overdue'
    return 'all'
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Global Search for all content types */}
          <div className="w-full sm:w-80">
            <GlobalSearch />
          </div>
          
          {/* Local search for task filtering */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Filter tasks..." 
              className="pl-10 w-full sm:w-60" 
              value={currentSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              title="Filter tasks on this page"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDueSoonChange(!dueSoon)}
              className={dueSoon ? "bg-dealvize-teal text-white" : ""}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Due Soon
            </Button>

            <Button 
              className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white"
              onClick={() => router.push('/tasks/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="due-today">Due Today</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>
    </header>
  )
}
