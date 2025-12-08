'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search,
  Users,
  Settings,
  Database,
  Mail,
  FileText,
  AlertTriangle,
  Shield,
  BarChart3,
  Crown,
  Zap,
  RefreshCw,
  Lock,
  Power,
  UserCheck,
  ArrowRight,
  Clock,
  TrendingUp
} from 'lucide-react'

interface Command {
  id: string
  title: string
  description: string
  category: 'navigation' | 'action' | 'search' | 'emergency'
  icon: any
  keywords: string[]
  action: () => void | Promise<void>
  shortcut?: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const searchUsers = async (query: string) => {
    // This would connect to your user search API
    return []
  }

  const commands: Command[] = useMemo(() => [
    // Navigation Commands
    {
      id: 'nav-users',
      title: 'User Management',
      description: 'Manage all platform users',
      category: 'navigation',
      icon: Users,
      keywords: ['user', 'users', 'manage', 'accounts'],
      action: () => router.push('/super-admin/users')
    },
    {
      id: 'nav-blog',
      title: 'Blog Management',
      description: 'Manage blog posts and content',
      category: 'navigation',
      icon: FileText,
      keywords: ['blog', 'content', 'posts', 'articles'],
      action: () => router.push('/admin/blog')
    },
    {
      id: 'nav-analytics',
      title: 'Platform Analytics',
      description: 'View usage statistics and metrics',
      category: 'navigation',
      icon: BarChart3,
      keywords: ['analytics', 'stats', 'metrics', 'reports'],
      action: () => console.log('Navigate to analytics')
    },
    {
      id: 'nav-settings',
      title: 'System Settings',
      description: 'Configure platform settings',
      category: 'navigation',
      icon: Settings,
      keywords: ['settings', 'config', 'configuration', 'system'],
      action: () => console.log('Navigate to settings')
    },

    // Action Commands
    {
      id: 'action-backup',
      title: 'Create Database Backup',
      description: 'Generate emergency database backup',
      category: 'action',
      icon: Database,
      keywords: ['backup', 'database', 'export', 'save'],
      action: async () => {
        console.log('Creating backup...')
        // Simulate backup process
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log('Backup created successfully')
      }
    },
    {
      id: 'action-email',
      title: 'Send Platform Notification',
      description: 'Broadcast message to all users',
      category: 'action',
      icon: Mail,
      keywords: ['email', 'notify', 'broadcast', 'message', 'announcement'],
      action: () => console.log('Open notification composer')
    },
    {
      id: 'action-restart',
      title: 'Restart System Services',
      description: 'Restart all platform services',
      category: 'action',
      icon: RefreshCw,
      keywords: ['restart', 'reboot', 'services', 'refresh'],
      action: async () => {
        console.log('Restarting services...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        console.log('Services restarted')
      }
    },

    // Emergency Commands
    {
      id: 'emergency-maintenance',
      title: 'Enable Maintenance Mode',
      description: 'Block all user access to the platform',
      category: 'emergency',
      icon: AlertTriangle,
      keywords: ['maintenance', 'block', 'emergency', 'downtime'],
      action: () => console.log('Maintenance mode enabled')
    },
    {
      id: 'emergency-lockdown',
      title: 'Security Lockdown',
      description: 'Activate emergency security protocols',
      category: 'emergency',
      icon: Lock,
      keywords: ['lockdown', 'security', 'emergency', 'breach'],
      action: () => console.log('Security lockdown activated')
    },
    {
      id: 'emergency-throttle',
      title: 'Enable API Rate Limiting',
      description: 'Throttle API requests to prevent abuse',
      category: 'emergency',
      icon: Zap,
      keywords: ['throttle', 'rate', 'limit', 'api', 'slow'],
      action: () => console.log('API rate limiting enabled')
    }
  ], [router])

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return commands

    const searchQuery = query.toLowerCase()
    return commands.filter(command =>
      command.title.toLowerCase().includes(searchQuery) ||
      command.description.toLowerCase().includes(searchQuery) ||
      command.keywords.some(keyword => keyword.includes(searchQuery))
    )
  }, [commands, query])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex])
        }
        break
      case 'Escape':
        onOpenChange(false)
        break
    }
  }, [open, filteredCommands, selectedIndex, onOpenChange])

  const executeCommand = async (command: Command) => {
    onOpenChange(false)
    setQuery('')
    setSelectedIndex(0)
    await command.action()
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return ArrowRight
      case 'action': return Zap
      case 'search': return Search
      case 'emergency': return AlertTriangle
      default: return Crown
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'action': return 'bg-green-100 text-green-700 border-green-200'
      case 'search': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'emergency': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [open, onOpenChange])

  // Handle keyboard navigation when open
  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Type a command or search..."
              className="pl-10 border-0 focus-visible:ring-0 text-lg"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
            <Badge variant="outline" className="px-2 py-1">⌘K</Badge>
            to open
            <Badge variant="outline" className="px-2 py-1">↑↓</Badge>
            to navigate
            <Badge variant="outline" className="px-2 py-1">↵</Badge>
            to execute
          </div>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No commands found for "{query}"</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredCommands.map((command, index) => {
                const CategoryIcon = getCategoryIcon(command.category)
                const isSelected = index === selectedIndex
                
                return (
                  <div
                    key={command.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-dealvize-teal text-white' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => executeCommand(command)}
                  >
                    <div className={`p-2 rounded-lg ${
                      isSelected 
                        ? 'bg-white bg-opacity-20' 
                        : 'bg-gray-100'
                    }`}>
                      <command.icon className={`h-4 w-4 ${
                        isSelected ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${
                        isSelected ? 'text-white' : 'text-gray-900'
                      }`}>
                        {command.title}
                      </p>
                      <p className={`text-sm truncate ${
                        isSelected ? 'text-white text-opacity-80' : 'text-gray-500'
                      }`}>
                        {command.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${
                        isSelected 
                          ? 'bg-white bg-opacity-20 text-white border-white border-opacity-30'
                          : getCategoryColor(command.category)
                      }`}>
                        <CategoryIcon className="h-3 w-3 mr-1" />
                        {command.category}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook to use the command palette
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  return {
    isOpen,
    openCommandPalette: () => setIsOpen(true),
    closeCommandPalette: () => setIsOpen(false),
    toggleCommandPalette: () => setIsOpen(!isOpen),
    CommandPaletteComponent: () => (
      <CommandPalette open={isOpen} onOpenChange={setIsOpen} />
    )
  }
}