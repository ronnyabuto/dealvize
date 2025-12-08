"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MoreHorizontal, Edit, Plus, Mail, Download, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useClients } from "@/hooks/use-clients"
import { type Client } from "@/lib/types"
import { EmailDialog } from "@/components/email-dialog"

interface ClientDetailHeaderProps {
  client: Client
}

export function ClientDetailHeader({ client }: ClientDetailHeaderProps) {
  const router = useRouter()
  const { deleteClient } = useClients()
  const [deleting, setDeleting] = useState(false)

  const handleEditClient = () => {
    router.push(`/clients/edit/${client.id}`)
  }

  const handleAddTask = () => {
    router.push(`/tasks/new?client=${client.id}`)
  }

  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  const handleExportData = () => {
    // TODO: Implement export functionality
    alert('Export functionality will be implemented soon!')
  }

  const handleDeleteClient = async () => {
    if (!confirm(`Are you sure you want to delete ${client.name}? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    const success = await deleteClient(client.id)
    
    if (success) {
      router.push('/clients')
    } else {
      alert('Failed to delete client. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Button variant="ghost" size="sm" asChild>
            <a href="/clients" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Clients
            </a>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Client Info Summary */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`/placeholder.svg?height=40&width=40`} />
              <AvatarFallback className="bg-blue-600 text-white font-semibold">
                {client.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-lg">{client.name}</h2>
              <div className="flex items-center gap-2">
                <Badge className={client.statusColor} variant="secondary">
                  {client.status}
                </Badge>
                <span className="text-sm text-gray-500">
                  Deal Value: {client.dealValue}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={deleting}>
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditClient}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddTask}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </DropdownMenuItem>
              {client.email && (
                <EmailDialog 
                  clientId={client.id}
                  clientName={client.name}
                  clientEmail={client.email}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </DropdownMenuItem>
                  }
                />
              )}
              <DropdownMenuItem onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600" 
                onClick={handleDeleteClient}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
