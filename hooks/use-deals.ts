'use client'

import { createResourceHook, type ResourceOptions } from './use-resource'
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

// Utility functions for deal data transformation
const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'qualified':
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

// Strict type transformation - ensures Frontend doesn't break on DB nulls
const transformDealData = (dealData: any): Deal => {
  const clientName = dealData.clients ? `${dealData.clients.first_name} ${dealData.clients.last_name}`.trim() : 'Unknown Client';
  return {
    id: dealData.id,
    clientId: dealData.client_id,
    title: dealData.title || clientName,
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

const useDealsResource = createResourceHook<Deal>({
  tableName: 'deals',
  selectQuery: `*, clients (id, first_name, last_name, email, status)`,
  transformData: transformDealData,
  defaultOrderBy: { column: 'created_at', ascending: false }
})

export function useDeals(options: UseDealsOptions = {}) {
  const { status, clientId, propertyType, minValue, maxValue, dateRange, ...resourceOptions } = options

  const filters: Record<string, any> = {}
  if (status) filters.status = status
  if (clientId) filters.client_id = clientId
  if (propertyType) filters.property_type = propertyType

  if (minValue && !isNaN(parseFloat(minValue))) filters.value_gte = parseFloat(minValue)
  if (maxValue && !isNaN(parseFloat(maxValue))) filters.value_lte = parseFloat(maxValue)

  if (dateRange?.from) filters.expected_close_date_gte = dateRange.from.toISOString()
  if (dateRange?.to) filters.expected_close_date_lte = dateRange.to.toISOString()

  const {
    data: deals,
    loading,
    error: resourceError,
    totalCount,
    create, // raw create
    update, // raw update
    delete: deleteResource,
    refresh,
    setData
  } = useDealsResource({
    ...resourceOptions,
    filters
  })

  const error = resourceError?.message || null

  const createDeal = async (dealData: Partial<Deal>): Promise<Deal | null> => {
    // Optimistic Update Setup
    const tempId = crypto.randomUUID();
    const optimisticDeal: Deal = {
      ...transformDealData({
        ...dealData,
        id: tempId,
        status: dealData.status || 'Qualified',
        value: dealData.value ? parseFloat(dealData.value.replace(/[$,]/g, '')) : 0,
        commission: dealData.commission ? parseFloat(dealData.commission.replace(/[$,]/g, '')) : 0,
        created_at: new Date().toISOString()
      })
    };

    // Apply Optimistic Update
    setData([optimisticDeal, ...deals]);

    try {
      const requestData = {
        client_id: dealData.clientId,
        title: dealData.title,
        value: dealData.value ? parseFloat(dealData.value.replace(/[$,]/g, '')) : 0,
        status: dealData.status || 'Qualified',
        probability: dealData.probability || 0,
        expected_close_date: dealData.expectedCloseDate || null,
        commission: dealData.commission ? parseFloat(dealData.commission.replace(/[$,]/g, '')) : 0,
        property_address: dealData.property?.address || '',
        property_type: dealData.property?.type || '',
        property_bedrooms: dealData.property?.bedrooms || null,
        property_bathrooms: dealData.property?.bathrooms || null,
        property_sqft: dealData.property?.sqft || null
      }

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('csrf-token-client='))
        ?.split('=')[1]

      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'x-csrf-token': decodeURIComponent(csrfToken) })
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Deal creation error:', errorData)
        console.error('Response status:', response.status)
        throw new Error(errorData.error || 'Failed to create deal')
      }

      const createdDeal = await response.json()
      const transformedDeal = transformDealData(createdDeal)

      // Replace optimistic data with real data
      setData(deals.map(d => d.id === tempId ? transformedDeal : d))
      refreshDashboardMetrics()

      return transformedDeal
    } catch (error) {
      // Revert optimistic update on failure
      setData(deals.filter(d => d.id !== tempId))
      console.error('Error creating deal:', error)
      return null
    }
  }

  const updateDeal = async (id: string, dealData: Partial<Deal>): Promise<Deal | null> => {
    // Snapshot previous state
    const previousDeals = [...deals];

    // Apply Optimistic Update
    const optimisticDeals = deals.map(d =>
      d.id === id ? { ...d, ...dealData, value: dealData.value || d.value } as Deal : d
    );
    setData(optimisticDeals);

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
      // ... allow other fields

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('csrf-token-client='))
        ?.split('=')[1]

      const response = await fetch(`/api/deals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'x-csrf-token': decodeURIComponent(csrfToken) })
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      })

      if (!response.ok) throw new Error('Failed to update deal')

      const updatedDeal = await response.json()
      const transformedDeal = transformDealData(updatedDeal)

      setData(deals.map(deal => deal.id === id ? transformedDeal : deal))
      refreshDashboardMetrics()

      return transformedDeal
    } catch (error) {
      // Revert to snapshot
      setData(previousDeals);
      console.error('Error updating deal:', error)
      return null
    }
  }

  return {
    deals,
    loading,
    error,
    totalCount,
    createDeal,
    updateDeal,
    deleteDeal: async (id: string) => {
      const previousDeals = [...deals]
      // Optimistic Update
      setData(deals.filter(d => d.id !== id))

      try {
        await deleteResource(id)
        refreshDashboardMetrics()
        return true
      } catch (error) {
        // Revert on failure
        setData(previousDeals)
        console.error('Error deleting deal:', error)
        return false
      }
    },
    refreshDeals: async () => await refresh()
  }
}