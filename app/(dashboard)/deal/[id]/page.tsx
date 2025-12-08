'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { DealDetailHeader } from "@/components/layout/deal-detail-header"
import { DealDetailContent } from "@/components/features/deals/deal-detail-content"
import { createClient } from '@/lib/supabase/client'
import { type Deal } from '@/lib/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'

export default function DealDetailPage() {
  const params = useParams()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'lead':
        return 'bg-gray-100 text-gray-800'
      case 'in progress':
        return 'bg-blue-100 text-blue-800'
      case 'under contract':
        return 'bg-yellow-100 text-yellow-800'
      case 'closed':
        return 'bg-green-100 text-green-800'
      case 'lost':
        return 'bg-red-100 text-red-800'
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
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const transformDealData = useCallback((dealData: any): Deal => {
    return {
      id: dealData.id,
      clientId: dealData.client_id,
      title: dealData.title,
      value: formatCurrency(dealData.value),
      status: dealData.status as Deal['status'],
      statusColor: getStatusColor(dealData.status),
      probability: dealData.probability || 0,
      expectedCloseDate: formatDate(dealData.expected_close_date),
      commission: formatCurrency(dealData.commission),
      property: {
        address: dealData.property_address || '',
        type: dealData.property_type || '',
        bedrooms: dealData.property_bedrooms,
        bathrooms: dealData.property_bathrooms,
        sqft: dealData.property_sqft
      }
    }
  }, [])

  const fetchDeal = useCallback(async () => {
    if (!params.id) return
    
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', params.id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Deal not found')
        } else {
          throw fetchError
        }
        return
      }

      const transformedDeal = transformDealData(data)
      setDeal(transformedDeal)
    } catch (err: any) {
      setError(err.message || 'Failed to load deal')
    } finally {
      setLoading(false)
    }
  }, [params.id, supabase, transformDealData])

  useEffect(() => {
    fetchDeal()
  }, [fetchDeal])

  if (loading) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading deal details...</span>
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

  if (!deal) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 p-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Deal not found
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
          <DealDetailHeader deal={deal} />
          <main className="p-6">
            <DealDetailContent deal={deal} />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}