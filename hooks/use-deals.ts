'use client'

import { useResource, createResourceHook, type ResourceOptions } from './use-resource'
import { type Deal } from '@/lib/types'
import { refreshDashboardMetrics } from '@/components/features/analytics/dashboard-metrics'

interface UseDealsOptions extends ResourceOptions {
  status?: string
  clientId?: string
  propertyType?: string
  minValue?: string
  maxValue?: string
  dateRange?: {
    from: Date | undefined
    to: Date | undefined
  }
}

interface UseDealsReturn {
  deals: Deal[]
  loading: boolean
  error: string | null
  totalCount: number
  createDeal: (dealData: Partial<Deal>) => Promise<Deal | null>
  updateDeal: (id: string, dealData: Partial<Deal>) => Promise<Deal | null>
  deleteDeal: (id: string) => Promise<boolean>
  refreshDeals: () => Promise<void>
}

// Utility functions for deal data transformation
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
    property: {
      address: dealData.property_address || '',
      type: dealData.property_type || '',
      bedrooms: dealData.property_bedrooms,
      bathrooms: dealData.property_bathrooms,
      sqft: dealData.property_sqft
    }
  }
}

// Create the deal-specific hook using the generic resource pattern
const useDealsResource = createResourceHook<Deal>({
  tableName: 'deals',
  selectQuery: `
    *,
    clients (
      id,
      name,
      email,
      status
    )
  `,
  transformData: transformDealData,
  defaultOrderBy: { column: 'created_at', ascending: false }
})

export function useDeals(options: UseDealsOptions = {}): UseDealsReturn {
  const { status, clientId, propertyType, minValue, maxValue, dateRange, ...resourceOptions } = options
  
  // Prepare filters for the generic resource hook
  const filters: Record<string, any> = {}
  if (status) filters.status = status
  if (clientId) filters.client_id = clientId
  if (propertyType) filters.property_type = propertyType
  
  // Handle value range filters
  if (minValue && !isNaN(parseFloat(minValue))) {
    filters.value_gte = parseFloat(minValue)
  }
  if (maxValue && !isNaN(parseFloat(maxValue))) {
    filters.value_lte = parseFloat(maxValue)
  }
  
  // Handle date range filters
  if (dateRange?.from) {
    filters.expected_close_date_gte = dateRange.from.toISOString()
  }
  if (dateRange?.to) {
    filters.expected_close_date_lte = dateRange.to.toISOString()
  }

  // Use the generic resource hook
  const {
    data: deals,
    loading,
    error: resourceError,
    totalCount,
    create,
    update,
    delete: deleteResource,
    refresh,
    setData
  } = useDealsResource({
    ...resourceOptions,
    filters
  })

  // Convert error to string format for backward compatibility
  const error = resourceError?.message || null

  // Create wrapper functions that handle deal-specific data transformation
  const createDeal = async (dealData: Partial<Deal>): Promise<Deal | null> => {
    try {
      const requestData = {
        client_id: dealData.clientId,
        title: dealData.title,
        value: dealData.value ? parseFloat(dealData.value.replace(/[$,]/g, '')) : 0,
        status: dealData.status || 'Lead',
        probability: dealData.probability || 0,
        expected_close_date: dealData.expectedCloseDate || null,
        commission: dealData.commission ? parseFloat(dealData.commission.replace(/[$,]/g, '')) : 0,
        property_address: dealData.property?.address || '',
        property_type: dealData.property?.type || '',
        property_bedrooms: dealData.property?.bedrooms || null,
        property_bathrooms: dealData.property?.bathrooms || null,
        property_sqft: dealData.property?.sqft || null
      }

      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create deal')
      }

      const createdDeal = await response.json()
      const transformedDeal = transformDealData(createdDeal)
      
      // Update local state
      setData([transformedDeal, ...deals])
      
      // Refresh the data to get updated count
      await refresh()
      
      // Refresh dashboard metrics
      refreshDashboardMetrics()
      
      return transformedDeal
    } catch (error) {
      console.error('Error creating deal:', error)
      return null
    }
  }

  const updateDeal = async (id: string, dealData: Partial<Deal>): Promise<Deal | null> => {
    try {
      const updateData: any = {}
      
      if (dealData.title !== undefined) updateData.title = dealData.title
      if (dealData.value !== undefined) updateData.value = parseFloat(dealData.value.replace(/[$,]/g, ''))
      if (dealData.status !== undefined) updateData.status = dealData.status
      if (dealData.probability !== undefined) updateData.probability = dealData.probability
      if (dealData.expectedCloseDate !== undefined) updateData.expected_close_date = dealData.expectedCloseDate
      if (dealData.commission !== undefined) updateData.commission = parseFloat(dealData.commission.replace(/[$,]/g, ''))
      if (dealData.property?.address !== undefined) updateData.property_address = dealData.property.address
      if (dealData.property?.type !== undefined) updateData.property_type = dealData.property.type
      if (dealData.property?.bedrooms !== undefined) updateData.property_bedrooms = dealData.property.bedrooms
      if (dealData.property?.bathrooms !== undefined) updateData.property_bathrooms = dealData.property.bathrooms
      if (dealData.property?.sqft !== undefined) updateData.property_sqft = dealData.property.sqft

      const response = await fetch(`/api/deals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update deal')
      }

      const updatedDeal = await response.json()
      const transformedDeal = transformDealData(updatedDeal)
      
      // Update local state
      setData(deals.map(deal => deal.id === id ? transformedDeal : deal))
      
      // Refresh dashboard metrics (especially important for status changes that affect revenue)
      refreshDashboardMetrics()
      
      return transformedDeal
    } catch (error) {
      console.error('Error updating deal:', error)
      return null
    }
  }

  const deleteDeal = async (id: string): Promise<boolean> => {
    return await deleteResource(id)
  }

  const refreshDeals = async () => {
    await refresh()
  }

  return {
    deals,
    loading,
    error,
    totalCount,
    createDeal,
    updateDeal,
    deleteDeal,
    refreshDeals
  }
}