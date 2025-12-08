'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { ClientDetailHeader } from "@/components/features/clients/client-detail-header"
import { ClientDetailContent } from "@/components/features/clients/client-detail-content"
import { createClient } from '@/lib/supabase/client'
import { type Client } from '@/lib/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

export default function ClientDetailPage() {
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

  const transformClientData = useCallback((clientData: any): Client => {
    const fullName = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim()
    return {
      id: clientData.id,
      name: fullName || 'Unknown Client',
      email: clientData.email || '',
      phone: clientData.phone || '',
      address: clientData.address || clientData.preferred_location || '',
      company: clientData.company || '',
      status: clientData.status || 'lead',
      statusColor: getStatusColor(clientData.status || 'lead'),
      lastContact: clientData.last_contact_date ? formatDate(clientData.last_contact_date) : 'Never',
      dealValue: formatCurrency(clientData.total_deal_value || 0),
      initials: clientData.initials || fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'UC'
    }
  }, [])

  const fetchClient = useCallback(async () => {
    if (!params.id) return
    
    // Validate UUID format to prevent database errors
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
  }, [params.id, supabase, transformClientData])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  if (loading) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading client details...</span>
            </div>
          </div>
        </SidebarInset>
      </>
    )
  }

  if (error) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          </div>
        </SidebarInset>
      </>
    )
  }

  if (!client) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 p-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Client not found
              </AlertDescription>
            </Alert>
          </div>
        </SidebarInset>
      </>
    )
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <ClientDetailHeader client={client} />
          <main className="p-6">
            <ClientDetailContent client={client} />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
