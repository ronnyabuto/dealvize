"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MoreHorizontal, DollarSign, Calendar, MapPin, Loader2, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useDeals } from "@/hooks/use-deals"
import { createClient } from '@/lib/supabase/client'

interface DealFilters {
  status: string
  propertyType: string
  minValue: string
  maxValue: string
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
}

interface DealsListProps {
  search: string
  status: string
  filters?: DealFilters
}

interface ClientData {
  [key: string]: {
    name: string
    initials: string
  }
}

export function DealsList({ search, status, filters }: DealsListProps) {
  const router = useRouter()
  const { deals, loading, error, deleteDeal } = useDeals({ 
    search, 
    status,
    propertyType: filters?.propertyType,
    minValue: filters?.minValue,
    maxValue: filters?.maxValue,
    dateRange: filters?.dateRange
  })
  const [clients, setClients] = useState<ClientData>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchClients = async () => {
      if (deals.length === 0) return

      const clientIds = [...new Set(deals.map(deal => deal.clientId))]
      
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds)

      if (data) {
        const clientsMap: ClientData = {}
        data.forEach(client => {
          const fullName = client.name || 'Unknown Client'
          const nameParts = fullName.split(' ')
          clientsMap[client.id] = {
            name: fullName,
            initials: nameParts.length > 1 
              ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase()
              : fullName.substring(0, 2).toUpperCase()
          }
        })
        setClients(clientsMap)
      }
    }

    fetchClients()
  }, [deals])

  const handleViewDeal = (dealId: string) => {
    router.push(`/deal/${dealId}`)
  }

  const handleEditDeal = (dealId: string) => {
    router.push(`/deals/edit/${dealId}`)
  }

  const handleAddTask = (dealId: string) => {
    router.push(`/tasks/new?deal=${dealId}`)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading deals...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading deals: {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No deals found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || status ? 'Try adjusting your search or filter criteria.' : 'Get started by creating your first deal.'}
          </p>
          <div className="mt-6">
            <Button 
              onClick={() => router.push('/deals/new')}
              className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {deals.map((deal) => {
        const client = clients[deal.clientId]
        const isDeleting = deleting === deal.id

        return (
          <Card key={deal.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{deal.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={deal.statusColor} variant="secondary">
                      {deal.status}
                    </Badge>
                    <Badge variant="outline">{deal.property.type || 'Property'}</Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={isDeleting}>
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewDeal(deal.id)}>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditDeal(deal.id)}>
                      Edit Deal
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddTask(deal.id)}>
                      Add Task
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        if (deal.clientId) {
                          router.push(`/client/${deal.clientId}`)
                        }
                      }}
                      disabled={!deal.clientId}
                    >
                      View Client Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600" 
                      onClick={() => handleDeleteDeal(deal.id, deal.title)}
                      disabled={isDeleting}
                    >
                      Delete Deal
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback className="bg-blue-600 text-white font-semibold">
                    {client?.initials || 'CL'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-slate-900">{client?.name || 'Unknown Client'}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {deal.property.address || 'Address not set'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-semibold text-slate-900">{deal.value}</p>
                    <p className="text-gray-600">Deal Value</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-semibold text-slate-900">{deal.expectedCloseDate}</p>
                    <p className="text-gray-600">Expected Close</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Probability</span>
                  <span className="font-medium">{deal.probability}%</span>
                </div>
                <Progress value={deal.probability} className="h-2" />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm text-gray-600">Expected Commission</p>
                  <p className="font-bold text-dealvize-teal">{deal.commission}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-dealvize-teal border-dealvize-teal hover:bg-dealvize-teal hover:text-white bg-transparent"
                  onClick={() => handleViewDeal(deal.id)}
                >
                  View Deal
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
