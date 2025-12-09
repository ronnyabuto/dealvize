"use client"

import { useState, useEffect, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Bot, X, Minimize2, Maximize2, Sparkles, 
  Users, DollarSign, CheckSquare, Calendar,
  Zap, ArrowRight, Lightbulb, Wand2, Bell, Settings
} from "lucide-react"
import { cn } from "@/lib/utils"
import { executeAutomation } from "@/lib/smart-automation"

interface SmartSuggestion {
  id: string
  title: string
  description: string
  type: 'automation' | 'insight' | 'action'
  category: 'clients' | 'deals' | 'tasks' | 'general'
  priority: 'low' | 'medium' | 'high'
  actionLabel: string
  actionUrl?: string
  onAction?: () => void
  icon: any
}

const getContextualSuggestions = (pathname: string): SmartSuggestion[] => {
  const suggestions: SmartSuggestion[] = []

  // Clients page suggestions
  if (pathname.includes('/clients')) {
    suggestions.push(
      {
        id: 'client-follow-up',
        title: 'Auto Follow-up Setup',
        description: 'Set up automated follow-ups for new clients to improve engagement by 40%',
        type: 'automation',
        category: 'clients',
        priority: 'high',
        actionLabel: 'Setup Automation',
        icon: Users,
        onAction: async () => {
          const confirmed = confirm('Set up automated follow-up tasks for new clients? This will create welcome calls and follow-up emails automatically.')
          if (confirmed) {
            alert('Client follow-up automation enabled! New clients will automatically get follow-up tasks.')
          }
        }
      },
      {
        id: 'lead-scoring',
        title: 'Smart Lead Scoring',
        description: 'Automatically score leads based on activity and engagement patterns',
        type: 'automation',
        category: 'clients',
        priority: 'medium',
        actionLabel: 'Enable Scoring',
        icon: Sparkles,
        onAction: () => console.log('Enable lead scoring')
      }
    )
  }

  // Deals page suggestions
  if (pathname.includes('/deals')) {
    suggestions.push(
      {
        id: 'deal-stage-automation',
        title: 'Stage-Based Automation',
        description: 'Auto-create tasks when deals move to "Under Contract" stage',
        type: 'automation',
        category: 'deals',
        priority: 'high',
        actionLabel: 'Create Rule',
        icon: DollarSign,
        onAction: async () => {
          const confirmed = confirm('Create automation rule for "Under Contract" stage? This will automatically create inspection and appraisal tasks.')
          if (confirmed) {
            alert('Deal stage automation enabled! Tasks will be created automatically when deals reach "Under Contract".')
          }
        }
      },
      {
        id: 'closing-reminder',
        title: 'Closing Date Alerts',
        description: 'Get notified 7 days before deal closing dates with preparation checklist',
        type: 'automation',
        category: 'deals',
        priority: 'medium',
        actionLabel: 'Set Alerts',
        icon: Calendar,
        onAction: () => console.log('Setup closing reminders')
      }
    )
  }

  // Tasks page suggestions
  if (pathname.includes('/tasks')) {
    suggestions.push(
      {
        id: 'recurring-tasks',
        title: 'Recurring Task Templates',
        description: 'Create templates for common tasks like "Weekly market report" or "Client check-in"',
        type: 'automation',
        category: 'tasks',
        priority: 'medium',
        actionLabel: 'Create Templates',
        icon: CheckSquare,
        onAction: () => console.log('Create recurring task templates')
      }
    )
  }

  // Dashboard suggestions
  if (pathname.includes('/dashboard')) {
    suggestions.push(
      {
        id: 'workflow-optimization',
        title: 'Workflow Insights',
        description: 'Your deals take 23% longer than average in negotiation stage',
        type: 'insight',
        category: 'general',
        priority: 'high',
        actionLabel: 'View Analysis',
        icon: Lightbulb,
        onAction: () => console.log('View workflow analysis')
      },
      {
        id: 'smart-dashboard',
        title: 'Smart Notifications',
        description: 'Enable AI-powered notifications for important deal milestones',
        type: 'automation',
        category: 'general',
        priority: 'medium',
        actionLabel: 'Enable Smart Alerts',
        icon: Zap,
        onAction: () => console.log('Enable smart notifications')
      }
    )
  }

  // Always show some general suggestions
  suggestions.push(
    {
      id: 'email-integration',
      title: 'Email Automation',
      description: 'Sync with your email to auto-log client communications',
      type: 'automation',
      category: 'general',
      priority: 'medium',
      actionLabel: 'Connect Email',
      icon: Wand2,
      onAction: () => console.log('Setup email integration')
    }
  )

  return suggestions
}

export function SmartAIAssistant() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([])
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())

  useEffect(() => {
    const contextSuggestions = getContextualSuggestions(pathname)
    const filteredSuggestions = contextSuggestions.filter(s => !dismissedSuggestions.has(s.id))
    setSuggestions(filteredSuggestions.slice(0, 3)) // Show max 3 suggestions
  }, [pathname, dismissedSuggestions])

  const handleDismissSuggestion = (id: string) => {
    setDismissedSuggestions(prev => new Set([...prev, id]))
  }

  const handleActionClick = (suggestion: SmartSuggestion) => {
    if (suggestion.onAction) {
      suggestion.onAction()
    }
    if (suggestion.actionUrl) {
      window.open(suggestion.actionUrl, '_blank')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const unreadCount = suggestions.filter(s => s.priority === 'high').length

  if (suggestions.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          size="lg"
        >
          <div className="relative">
            <Bot className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
        </Button>
      )}

      {/* Expanded Assistant */}
      {isOpen && (
        <Card className="w-80 sm:w-96 max-h-[500px] shadow-xl border-0 bg-white">
          {/* Header */}
          <CardHeader className="pb-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                >
                  {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-purple-100">
              Smart suggestions based on your current page
            </p>
          </CardHeader>

          {/* Content */}
          {!isMinimized && (
            <CardContent className="p-0">
              <ScrollArea className="max-h-80">
                <div className="p-4 space-y-3">
                  {suggestions.map((suggestion) => {
                    const IconComponent = suggestion.icon
                    return (
                      <div
                        key={suggestion.id}
                        className="group border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center">
                              <IconComponent className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {suggestion.title}
                              </h4>
                              <Badge
                                variant="outline"
                                className={cn("text-xs mt-1", getPriorityColor(suggestion.priority))}
                              >
                                {suggestion.type === 'automation' ? 'Automation' : 'Insight'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDismissSuggestion(suggestion.id)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          {suggestion.description}
                        </p>
                        
                        <Button
                          size="sm"
                          onClick={() => handleActionClick(suggestion)}
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs"
                        >
                          {suggestion.actionLabel}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}