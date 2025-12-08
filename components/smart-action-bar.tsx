"use client"

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, X, Zap, Users, DollarSign, 
  CheckSquare, ArrowRight, Lightbulb 
} from "lucide-react"

interface SmartAction {
  id: string
  title: string
  description: string
  actionLabel: string
  variant: 'primary' | 'secondary' | 'success'
  icon: any
  onAction: () => void
}

interface SmartActionBarProps {
  actions: SmartAction[]
  title?: string
  className?: string
}

export function SmartActionBar({ actions, title = "Smart Suggestions", className }: SmartActionBarProps) {
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set())
  
  if (actions.length === 0) return null
  
  const visibleActions = actions.filter(action => !dismissedActions.has(action.id))
  
  if (visibleActions.length === 0) return null

  const handleDismiss = (actionId: string) => {
    setDismissedActions(prev => new Set([...prev, actionId]))
  }

  const getVariantClass = (variant: string) => {
    switch (variant) {
      case 'primary': return 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
      case 'success': return 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
      case 'secondary': return 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
      default: return 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
    }
  }

  return (
    <Card className={`border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-blue-600">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            AI Powered
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleActions.map((action) => {
            const IconComponent = action.icon
            return (
              <div 
                key={action.id} 
                className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:border-purple-300 hover:shadow-sm transition-all duration-200"
              >
                <button
                  onClick={() => handleDismiss(action.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Dismiss suggestion"
                >
                  <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </button>
                
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 flex items-center justify-center">
                    <IconComponent className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {action.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {action.description}
                    </p>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  onClick={action.onAction}
                  className={`w-full text-xs ${getVariantClass(action.variant)}`}
                >
                  {action.actionLabel}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}