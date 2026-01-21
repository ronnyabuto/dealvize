"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  status: string
  statusColor: string
  lastContact: string
  dealValue: string
}

export function RecentClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await fetch('/api/clients?limit=6&sortBy=created_at')
        if (!response.ok) throw new Error('Failed to fetch clients')
        const data = await response.json()
        setClients(data.clients || [])
      } catch (error) {
        console.error('Failed to fetch clients:', error)
        toast.error('Failed to load clients. Please check your connection.')
        setClients([])
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recently Added Clients</CardTitle>
            <Button size="sm" className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Client
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
              <div>Name</div>
              <div>Status</div>
              <div>Deal Value</div>
              <div>Last Contact</div>
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="grid grid-cols-4 gap-4 items-center py-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recently Added Clients</CardTitle>
          <Button asChild size="sm" className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white">
            <Link href="/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              New Client
            </Link>
          </Button>
        </div>

      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500 border-b pb-2">
            <div>Name</div>
            <div>Status</div>
            <div>Deal Value</div>
            <div>Last Contact</div>
          </div>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No clients added yet
            </div>
          ) : (
            clients.map((client) => (
              <Link
                key={client.id}
                href={`/client/${client.id}`}
                className="grid grid-cols-4 gap-4 items-center py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
              >
                <div className="font-medium text-slate-900">{`${client.first_name} ${client.last_name}`}</div>
                <div>
                  <Badge className={client.statusColor} variant="secondary">
                    {client.status}
                  </Badge>
                </div>
                <div className="font-medium text-green-600">{client.dealValue}</div>
                <div className="text-sm text-gray-600">{client.lastContact}</div>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
