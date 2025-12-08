'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ClientForm } from "@/components/features/clients/client-form"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Client } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function EditClientPage() {
  const params = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Buyer':
        return 'bg-green-100 text-green-800'
      case 'Seller':
        return 'bg-orange-100 text-orange-800'
      case 'In Contract':
        return 'bg-teal-100 text-teal-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number | null): string => {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const transformClientData = (clientData: any): Client => {
    return {
      id: clientData.id,
      name: clientData.name,
      email: clientData.email || '',
      phone: clientData.phone || '',
      address: clientData.address || '',
      company: clientData.company || '',
      status: clientData.status,
      statusColor: getStatusColor(clientData.status),
      lastContact: clientData.last_contact ? formatDate(clientData.last_contact) : 'Never',
      dealValue: formatCurrency(clientData.deal_value),
      initials: clientData.initials || clientData.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    }
  }

  useEffect(() => {
    async function fetchClient() {
      if (!params.id) return
      
      // Validate UUID format
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!UUID_REGEX.test(params.id as string)) {
        setError('Invalid client ID format')
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', params.id)
          .single()

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Client not found')
          } else {
            throw fetchError
          }
          return
        }

        const transformedClient = transformClientData(data)
        setClient(transformedClient)
      } catch (err: any) {
        setError(err.message || 'Failed to load client')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [params.id, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 overflow-auto flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading client...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 overflow-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50/50 overflow-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Client not found
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Client</h1>
            <p className="text-sm text-slate-600 mt-1">
              Update {client.name}'s information
            </p>
          </div>
        </div>
      </header>
      <main className="p-6">
        <Suspense fallback={<div>Loading...</div>}>
          <ClientForm client={client} mode="edit" />
        </Suspense>
      </main>
    </div>
  )
}