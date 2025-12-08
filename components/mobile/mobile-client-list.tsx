'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  Star,
  MoreVertical,
  SortAsc,
  SortDesc,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  status: 'lead' | 'prospect' | 'client' | 'closed'
  source: string
  leadScore: number
  aiLeadScore?: number
  budgetMin?: number
  budgetMax?: number
  preferredLocation?: string
  propertyType?: string
  createdAt: string
  lastContactDate?: string
  dealsCount: number
  totalValue: number
  tags: string[]
  avatar?: string
}

interface MobileClientListProps {
  clients: Client[]
  onClientSelect?: (client: Client) => void
}

const statusColors = {
  lead: 'bg-blue-100 text-blue-800 border-blue-200',
  prospect: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  client: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200'
}

const sourceColors = {
  'website': 'bg-purple-100 text-purple-800',
  'referral': 'bg-green-100 text-green-800',
  'social': 'bg-blue-100 text-blue-800',
  'advertising': 'bg-orange-100 text-orange-800',
  'cold_outreach': 'bg-gray-100 text-gray-800',
  'event': 'bg-pink-100 text-pink-800'
}

export function MobileClientList({ clients, onClientSelect }: MobileClientListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'date' | 'value'>('score')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)

  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients.filter(client => {
      const matchesSearch = !searchQuery || 
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery)
      
      const matchesStatus = selectedStatus === 'all' || client.status === selectedStatus
      
      return matchesSearch && matchesStatus
    })

    return filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
          break
        case 'score':
          comparison = (a.aiLeadScore || a.leadScore) - (b.aiLeadScore || b.leadScore)
          break
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'value':
          comparison = a.totalValue - b.totalValue
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [clients, searchQuery, selectedStatus, sortBy, sortOrder])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="lg:hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          <Link href="/clients/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Client
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-1" /> : <SortDesc className="h-4 w-4 mr-1" />}
            Sort
          </Button>

          <div className="flex space-x-2">
            {['all', 'lead', 'prospect', 'client'].map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(status)}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Sort by</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'name', label: 'Name' },
                  { value: 'score', label: 'Score' },
                  { value: 'date', label: 'Date' },
                  { value: 'value', label: 'Value' }
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={sortBy === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy(option.value as any)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <p className="text-sm text-gray-600">
          {filteredAndSortedClients.length} of {clients.length} clients
        </p>
      </div>

      {/* Client List */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="p-4 space-y-3">
          {filteredAndSortedClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
              <Link href="/clients/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Client
                </Button>
              </Link>
            </div>
          ) : (
            filteredAndSortedClients.map((client) => (
              <Card 
                key={client.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onClientSelect?.(client)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={client.avatar} />
                      <AvatarFallback>
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {client.firstName} {client.lastName}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">{client.email}</p>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-1">
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', statusColors[client.status])}
                          >
                            {client.status}
                          </Badge>
                          
                          <div className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            getScoreColor(client.aiLeadScore || client.leadScore)
                          )}>
                            {client.aiLeadScore || client.leadScore}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 space-y-1">
                        {client.phone && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            {client.phone}
                          </div>
                        )}
                        
                        {client.preferredLocation && (
                          <div className="flex items-center text-xs text-gray-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            {client.preferredLocation}
                          </div>
                        )}
                        
                        {(client.budgetMin || client.budgetMax) && (
                          <div className="flex items-center text-xs text-gray-500">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {client.budgetMin ? formatCurrency(client.budgetMin) : '0'} - 
                            {client.budgetMax ? formatCurrency(client.budgetMax) : 'No max'}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {client.source && (
                            <Badge 
                              variant="secondary" 
                              className={cn('text-xs', sourceColors[client.source as keyof typeof sourceColors] || 'bg-gray-100 text-gray-800')}
                            >
                              {client.source.replace('_', ' ')}
                            </Badge>
                          )}
                          
                          {client.dealsCount > 0 && (
                            <div className="text-xs text-gray-500">
                              {client.dealsCount} deal{client.dealsCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {client.totalValue > 0 && (
                            <span className="text-xs font-medium text-green-600">
                              {formatCurrency(client.totalValue)}
                            </span>
                          )}
                          
                          <div className="text-xs text-gray-400">
                            {formatDate(client.createdAt)}
                          </div>
                          
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {client.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {client.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {client.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{client.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}