'use client'

import { Suspense, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DealForm } from "@/components/deal-form"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type Deal } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default function EditDealPage() {
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

  const transformDealData = (dealData: any): Deal => {
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
      commissionPercentage: dealData.commission_percentage,
      property: {
        address: dealData.property_address || '',
        type: dealData.property_type || '',
        bedrooms: dealData.property_bedrooms,
        bathrooms: dealData.property_bathrooms,
        sqft: dealData.property_sqft
      }
    }
  }

  useEffect(() => {
    async function fetchDeal() {
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
    }

    fetchDeal()
  }, [params.id])

  if (loading) {
    return (
      <>
        <AppSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading deal...</span>
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
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Edit Deal</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Update deal information for "{deal.title}"
                </p>
              </div>
            </div>
          </header>
          <main className="p-6">
            <Suspense fallback={<div>Loading form...</div>}>
              <DealForm mode="edit" deal={deal} />
            </Suspense>
          </main>
        </div>
      </SidebarInset>
    </>
  )
}