'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  Building2,
  DollarSign,
  Calendar,
  User,
  Phone,
  Mail,
  Plus,
  Filter,
  Search,
  MoreVertical,
  TrendingUp,
  Clock,
  Target,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Deal {
  id: string
  title: string
  description: string
  status: string
  stage: string
  value: number
  probability: number
  expectedCloseDate: string
  actualCloseDate?: string
  clientId: string
  clientName: string
  clientEmail: string
  source: string
  createdAt: string
  updatedAt: string
  nextFollowUp?: string
  priority: 'high' | 'medium' | 'low'
  tags: string[]
  lastActivity: string
}

interface Stage {
  id: string
  name: string
  color: string
  deals: Deal[]
  totalValue: number
  averageProbability: number
}

interface MobileDealPipelineProps {
  stages: Stage[]
  onDealSelect?: (deal: Deal) => void
  onStageChange?: (dealId: string, newStage: string) => void
}

const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200'
}

const stageIcons = {
  'initial_contact': User,
  'qualification': Target,
  'proposal': Building2,
  'negotiation': TrendingUp,
  'closed_won': CheckCircle2,
  'closed_lost': Clock
}

export function MobileDealPipeline({ stages, onDealSelect, onStageChange }: MobileDealPipelineProps) {
  const [selectedStage, setSelectedStage] = useState<string>(stages[0]?.id || '')
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 0) return `In ${diffDays} days`
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const currentStage = stages.find(stage => stage.id === selectedStage)
  const totalPipelineValue = stages.reduce((sum, stage) => sum + stage.totalValue, 0)

  return (
    <div className="lg:hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Deal Pipeline</h1>
            <p className="text-sm text-gray-500">
              Total Value: {formatCurrency(totalPipelineValue)}
            </p>
          </div>
          <Link href="/deals/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Deal
            </Button>
          </Link>
        </div>

        {/* Stage Selector */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {stages.map((stage) => {
            const Icon = stageIcons[stage.id as keyof typeof stageIcons] || Building2
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage.id)}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap border',
                  selectedStage === stage.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{stage.name}</span>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'ml-1',
                    selectedStage === stage.id ? 'bg-blue-700 text-white' : ''
                  )}
                >
                  {stage.deals.length}
                </Badge>
              </button>
            )
          })}
        </div>

        {/* Stage Overview */}
        {currentStage && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{currentStage.deals.length}</p>
                  <p className="text-xs text-gray-600">Deals</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(currentStage.totalValue)}
                  </p>
                  <p className="text-xs text-gray-600">Total Value</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(currentStage.averageProbability)}%
                  </p>
                  <p className="text-xs text-gray-600">Avg Probability</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Deals List */}
      <ScrollArea className="h-[calc(100vh-350px)]">
        <div className="p-4 space-y-3">
          {currentStage?.deals.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No deals in this stage</h3>
              <p className="text-gray-500 mb-4">Start by adding a new deal</p>
              <Link href="/deals/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deal
                </Button>
              </Link>
            </div>
          ) : (
            currentStage?.deals.map((deal) => (
              <Card 
                key={deal.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onDealSelect?.(deal)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Deal Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{deal.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{deal.description}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Deal Value and Probability */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(deal.value)}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', priorityColors[deal.priority])}
                        >
                          {deal.priority}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{deal.probability}%</p>
                        <Progress value={deal.probability} className="w-16 h-2" />
                      </div>
                    </div>

                    {/* Client Info */}
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {deal.clientName.split(' ').map(n => n.charAt(0)).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{deal.clientName}</p>
                        <p className="text-xs text-gray-500 truncate">{deal.clientEmail}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Mail className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Close: {formatDate(deal.expectedCloseDate)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{deal.lastActivity}</span>
                      </div>
                    </div>

                    {/* Next Follow-up */}
                    {deal.nextFollowUp && (
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                          <span className="text-sm text-blue-800">Next follow-up</span>
                        </div>
                        <span className="text-sm font-medium text-blue-800">
                          {formatDate(deal.nextFollowUp)}
                        </span>
                      </div>
                    )}

                    {/* Tags */}
                    {deal.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {deal.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {deal.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{deal.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Stage Change Actions */}
      {currentStage && currentStage.deals.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 lg:hidden">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
            <div className="flex space-x-2 overflow-x-auto">
              {stages
                .filter(stage => stage.id !== selectedStage)
                .map((stage) => (
                  <Button
                    key={stage.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Handle stage change for selected deals
                    }}
                    className="whitespace-nowrap"
                  >
                    Move to {stage.name}
                  </Button>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}