"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { VirtualList } from "@/components/shared/virtual-list"
import { MoreHorizontal, Phone, Mail, MapPin, Loader2, AlertCircle, MessageSquare } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useClients } from "@/hooks/use-clients"
import { SmsDialog } from "@/components/features/messaging/sms-dialog"
import { EmailDialog } from "@/components/features/messaging/email-dialog"

interface ClientsListProps {
  search?: string
  status?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function ClientsList({ search = '', status = '', page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' }: ClientsListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const { clients, loading, error, deleteClient } = useClients({ 
    search, 
    status, 
    page, 
    limit: Math.max(limit, 50), // Increase batch size for virtualization
    sortBy,
    sortOrder
  })

  // Memoized handlers for better performance
  const handleViewDetails = useCallback((clientId: string) => {
    router.push(`/client/${clientId}`)
  }, [router])

  const handleEditClient = useCallback((clientId: string) => {
    router.push(`/clients/edit/${clientId}`)
  }, [router])

  const handleDeleteClient = useCallback(async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return
    }

    setDeletingId(clientId)
    const success = await deleteClient(clientId)
    
    if (!success) {
      alert('Failed to delete client. Please try again.')
    }
    
    setDeletingId(null)
  }, [deleteClient])

  // Memoized client item renderer for virtualization
  const renderClientItem = useCallback((client: any, index: number) => (
    <Card key={client.id} className="hover:shadow-md transition-shadow mx-4 mb-4">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
              <AvatarFallback className="bg-blue-600 text-white font-semibold text-sm">
                {client.initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                  {`${client.first_name} ${client.last_name}`}
                </h3>
                <Badge className={client.statusColor} variant="secondary">
                  {client.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{client.phone}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0 lg:col-span-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{client.address}</span>
                </div>
                <div className="text-sm lg:col-span-2">
                  <span className="font-medium">Company:</span> 
                  <span className="ml-1 truncate">{client.company}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                <span className="truncate">
                  <span className="font-medium">Deal Value:</span> {client.dealValue}
                </span>
                <span className="truncate">
                  <span className="font-medium">Last Contact:</span> {client.lastContact}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-shrink-0" disabled={deletingId === client.id}>
                {deletingId === client.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewDetails(client.id)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditClient(client.id)}>
                Edit Client
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/tasks/new?client=${client.id}`)}>
                Add Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/notes/new?client=${client.id}`)}>
                Add Note
              </DropdownMenuItem>
              {client.email && (
                <EmailDialog 
                  clientId={client.id}
                  clientName={`${client.first_name} ${client.last_name}`}
                  clientEmail={client.email}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </DropdownMenuItem>
                  }
                />
              )}
              {client.phone && (
                <SmsDialog 
                  clientId={client.id}
                  clientName={`${client.first_name} ${client.last_name}`}
                  clientPhone={client.phone}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send SMS
                    </DropdownMenuItem>
                  }
                />
              )}
              <DropdownMenuItem 
                className="text-red-600" 
                onClick={() => handleDeleteClient(client.id)}
                disabled={deletingId === client.id}
              >
                Delete Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  ), [deletingId, handleViewDetails, handleEditClient, handleDeleteClient, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading clients...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading clients: {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No clients found</p>
        <p className="text-gray-400 text-sm mt-2">
          {search || status ? "Try adjusting your filters" : "Start by adding your first client"}
        </p>
      </div>
    )
  }

  if (clients.length > 20) {
    return (
      <VirtualList
        items={clients}
        itemHeight={180} // Approximate height of each client card
        containerHeight={Math.min(800, window.innerHeight - 300)} // Max height with fallback
        renderItem={renderClientItem}
        className="rounded-lg border"
        overscan={3}
      />
    )
  }

  // Regular rendering for small lists
  return (
    <div className="space-y-4">
      {clients.map((client, index) => renderClientItem(client, index))}
    </div>
  )
}
