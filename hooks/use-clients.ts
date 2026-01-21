'use client'

import { useState, useEffect, useCallback } from 'react'
import { refreshDashboardMetrics } from '@/components/features/analytics/dashboard-metrics'
import { getCache, setCache, clearCache, generateCacheKey } from '@/lib/cache-utils'

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  name: string; // Keep for display purposes
  email: string
  phone: string
  address: string
  company: string
  status: 'Buyer' | 'Seller' | 'In Contract'
  statusColor: string
  lastContact: string
  dealValue: string
  initials: string
}

interface UseClientsParams {
  search?: string
  status?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

interface UseClientsReturn {
  clients: Client[]
  loading: boolean
  error: string | null
  totalCount: number
  totalPages: number
  currentPage: number
  refetch: () => Promise<void>
  refreshClients: () => Promise<void>
  createClient: (clientData: Omit<Client, 'id' | 'name' | 'initials' | 'statusColor' | 'lastContact' | 'dealValue'>) => Promise<Client | null>
  updateClient: (id: string, clientData: Partial<Client>) => Promise<Client | null>
  deleteClient: (id: string) => Promise<boolean>
  exportClients: () => Promise<void>
  importClients: (file: File) => Promise<boolean>
}

export function useClients(params: UseClientsParams = {}): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchClients = useCallback(async () => {
    try {
      const cacheKey = generateCacheKey('clients', params)

      // Try cache first
      const cachedData = getCache<{ clients: Client[], totalCount: number, totalPages: number, page: number }>(cacheKey)
      if (cachedData) {
        setClients(cachedData.clients)
        setTotalCount(cachedData.totalCount)
        setTotalPages(cachedData.totalPages)
        setCurrentPage(cachedData.page)
        setLoading(false)
        // Background revalidation logic could be added here
      } else {
        setLoading(true)
      }

      setError(null)

      // Build query parameters
      const searchParams = new URLSearchParams()
      if (params.search) searchParams.set('search', params.search)
      if (params.status) searchParams.set('status', params.status)
      if (params.page) searchParams.set('page', params.page.toString())
      if (params.limit) searchParams.set('limit', params.limit.toString())
      if (params.sortBy) searchParams.set('sortBy', params.sortBy)
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

      const response = await fetch(`/api/clients?${searchParams.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch clients')
      }

      const data = await response.json()
      setClients(data.clients || [])
      setTotalCount(data.totalCount || 0)
      setTotalPages(data.totalPages || 0)
      setCurrentPage(data.page || 1)

      // Update cache
      setCache(cacheKey, {
        clients: data.clients || [],
        totalCount: data.totalCount || 0,
        totalPages: data.totalPages || 0,
        page: data.page || 1
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [params.search, params.status, params.page, params.limit, params.sortBy, params.sortOrder])

  const createClient = async (clientData: Omit<Client, 'id' | 'name' | 'initials' | 'statusColor' | 'lastContact' | 'dealValue'>): Promise<Client | null> => {
    try {
      setError(null)

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('csrf-token-client='))
        ?.split('=')[1]

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'x-csrf-token': decodeURIComponent(csrfToken) })
        },
        credentials: 'include',
        body: JSON.stringify(clientData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Client creation error:', errorData)
        console.error('Response status:', response.status)

        let errorMessage = 'Failed to create client'
        if (response.status === 403) {
          errorMessage = 'Access denied. Please refresh the page and try again.'
        } else if (response.status === 401) {
          errorMessage = 'Please sign in again to continue.'
        } else if (errorData.error) {
          errorMessage = errorData.error
        }

        throw new Error(`${errorMessage} (Status: ${response.status})`)
      }

      const newClient = await response.json()

      // Invalidate clients cache
      clearCache('clients')

      // Refresh the clients list
      await fetchClients()

      // Refresh dashboard metrics
      refreshDashboardMetrics()

      return newClient
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create client'
      setError(errorMessage)
      return null
    }
  }

  const updateClient = async (id: string, clientData: Partial<Client>): Promise<Client | null> => {
    try {
      setError(null)

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('csrf-token-client='))
        ?.split('=')[1]

      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'x-csrf-token': decodeURIComponent(csrfToken) })
        },
        credentials: 'include',
        body: JSON.stringify(clientData)
      })

      if (!response.ok) {
        throw new Error('Failed to update client')
      }

      const updatedClient = await response.json()

      // Update the local state
      setClients(prev => prev.map(client =>
        client.id === id ? { ...client, ...updatedClient } : client
      ))

      // Invalidate clients cache
      clearCache('clients')

      return updatedClient
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client')
      return null
    }
  }

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('csrf-token-client='))
        ?.split('=')[1]

      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken && { 'x-csrf-token': decodeURIComponent(csrfToken) })
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete client')
      }

      // Remove from local state
      setClients(prev => prev.filter(client => client.id !== id))

      // Invalidate clients cache
      clearCache('clients')

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client')
      return false
    }
  }

  const exportClients = async (): Promise<void> => {
    try {
      setError(null)

      // Build query parameters with current filters but without pagination
      const searchParams = new URLSearchParams()
      if (params.search) searchParams.set('search', params.search)
      if (params.status) searchParams.set('status', params.status)
      if (params.sortBy) searchParams.set('sortBy', params.sortBy)
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)
      searchParams.set('export', 'csv')

      const response = await fetch(`/api/clients?${searchParams.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to export clients')
      }

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'clients.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export clients')
    }
  }

  const importClients = async (file: File): Promise<boolean> => {
    try {
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/clients/import', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to import clients')
      }

      const result = await response.json()

      // Invalidate clients cache
      clearCache('clients')

      // Refresh clients list after successful import
      await fetchClients()

      // Refresh dashboard metrics
      refreshDashboardMetrics()

      return result.success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import clients')
      return false
    }
  }

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  return {
    clients,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage,
    refetch: fetchClients,
    refreshClients: fetchClients,
    createClient,
    updateClient,
    deleteClient,
    exportClients,
    importClients
  }
}