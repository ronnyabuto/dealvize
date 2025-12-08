'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MoreHorizontal, DollarSign, Calendar, MapPin, Loader2, AlertCircle, Plus } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useDeals } from '@/hooks/use-deals'
import { createClient } from '@/lib/supabase/client'
import { type Deal } from '@/lib/types'

interface ClientData {
  [key: string]: {
    name: string
    initials: string
  }
}

interface PipelineColumn {
  status: Deal['status']
  title: string
  color: string
  deals: Deal[]
}

export function DealPipeline() {
  const router = useRouter()
  const { deals, loading, error, updateDeal, deleteDeal } = useDeals()
  const [clients, setClients] = useState<ClientData>({})
  const [updatingDeal, setUpdatingDeal] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const supabase = createClient()

  const columns: Omit<PipelineColumn, 'deals'>[] = [
    {
      status: 'Lead',
      title: 'Leads',
      color: 'bg-gray-100 border-gray-300'
    },
    {
      status: 'In Progress',
      title: 'In Progress',
      color: 'bg-blue-100 border-blue-300'
    },
    {
      status: 'Under Contract',
      title: 'Under Contract',
      color: 'bg-yellow-100 border-yellow-300'
    },
    {
      status: 'Closed',
      title: 'Closed',
      color: 'bg-green-100 border-green-300'
    },
    {
      status: 'Lost',
      title: 'Lost',
      color: 'bg-red-100 border-red-300'
    }
  ]

  useEffect(() => {
    const fetchClients = async () => {
      if (deals.length === 0) return

      const clientIds = [...new Set(deals.map(deal => deal.clientId))]

      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .in('id', clientIds)

      if (data) {
        const clientsMap: ClientData = {}
        data.forEach(client => {
          const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client'
          const firstName = client.first_name || ''
          const lastName = client.last_name || ''
          clientsMap[client.id] = {
            name: fullName,
            initials: firstName && lastName
              ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
              : fullName.substring(0, 2).toUpperCase()
          }
        })
        setClients(clientsMap)
      }
    }

    fetchClients()
  }, [deals])

  const getPipelineColumns = (): PipelineColumn[] => {
    return columns.map(column => ({
      ...column,
      deals: deals.filter(deal => deal.status === column.status)
    }))
  }

  const handleStatusChange = async (dealId: string, newStatus: Deal['status']) => {
    setUpdatingDeal(dealId)
    const success = await updateDeal(dealId, { status: newStatus })
    
    if (!success) {
      alert('Failed to update deal status. Please try again.')
    }
    setUpdatingDeal(null)
  }

  const handleViewDeal = (dealId: string) => {
    router.push(`/deal/${dealId}`)
  }

  const handleEditDeal = (dealId: string) => {
    router.push(`/deals/edit/${dealId}`)
  }

  const handleDeleteDeal = async (dealId: string, dealTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${dealTitle}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(dealId)
    const success = await deleteDeal(dealId)
    
    if (!success) {
      alert('Failed to delete deal. Please try again.')
    }
    setDeleting(null)
  }

  const getTotalValue = (deals: Deal[]): string => {
    const total = deals.reduce((sum, deal) => {
      const value = parseFloat(deal.value.replace(/[$,]/g, '')) || 0
      return sum + value
    }, 0)
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(total)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading pipeline...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading pipeline: {error}
        </AlertDescription>
      </Alert>
    )
  }

  const pipelineColumns = getPipelineColumns()

  return (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {pipelineColumns.map((column) => (
          <Card key={column.status} className={`${column.color} border-2`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                {column.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {column.deals.length}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {getTotalValue(column.deals)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-screen">
        {pipelineColumns.map((column) => (
          <div key={column.status} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {column.title}
                <Badge variant="secondary" className="text-xs">
                  {column.deals.length}
                </Badge>
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/deals/new?status=${column.status}`)}
                className="h-6 w-6 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className={`min-h-[600px] ${column.color} border-2 border-dashed rounded-lg p-4 space-y-3`}>
              {column.deals.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  No deals in {column.title.toLowerCase()}
                </div>
              ) : (
                column.deals.map((deal) => {
                  const client = clients[deal.clientId]
                  const isUpdating = updatingDeal === deal.id
                  const isDeleting = deleting === deal.id

                  return (
                    <Card 
                      key={deal.id} 
                      className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewDeal(deal.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-sm font-medium leading-tight">
                              {deal.title}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {deal.property.type || 'Property'}
                              </Badge>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={isUpdating || isDeleting}>
                                {(isUpdating || isDeleting) ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-3 w-3" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                handleViewDeal(deal.id)
                              }}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                handleEditDeal(deal.id)
                              }}>
                                Edit Deal
                              </DropdownMenuItem>
                              {columns
                                .filter(col => col.status !== deal.status)
                                .map(col => (
                                  <DropdownMenuItem 
                                    key={col.status}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(deal.id, col.status)
                                    }}
                                  >
                                    Move to {col.title}
                                  </DropdownMenuItem>
                                ))
                              }
                              <DropdownMenuItem 
                                className="text-red-600" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteDeal(deal.id, deal.title)
                                }}
                                disabled={isDeleting}
                              >
                                Delete Deal
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src="/placeholder.svg?height=24&width=24" />
                            <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                              {client?.initials || 'CL'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-gray-900 truncate">
                            {client?.name || 'Unknown Client'}
                          </span>
                        </div>

                        {deal.property.address && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{deal.property.address}</span>
                          </div>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span className="font-semibold">{deal.value}</span>
                            </span>
                            {deal.expectedCloseDate !== 'Not set' && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Calendar className="h-3 w-3" />
                                <span className="text-xs">{deal.expectedCloseDate}</span>
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Probability</span>
                              <span className="font-medium">{deal.probability}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                                style={{ width: `${deal.probability}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="text-xs text-gray-600">
                            <span>Commission: </span>
                            <span className="font-semibold text-green-600">{deal.commission}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}