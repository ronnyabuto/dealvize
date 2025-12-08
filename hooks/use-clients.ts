'use client'

import { useState, useEffect, useCallback } from 'react'
import { refreshDashboardMetrics } from '@/components/dashboard-metrics'

export interface Client {
  id: string
  name: string
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
  createClient: (clientData: Omit<Client, 'id' | 'initials' | 'statusColor' | 'lastContact' | 'dealValue'>) => Promise<Client | null>
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
      setLoading(true)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [params.search, params.status, params.page, params.limit, params.sortBy, params.sortOrder])

  const createClient = async (clientData: Omit<Client, 'id' | 'initials' | 'statusColor' | 'lastContact' | 'dealValue'>): Promise<Client | null> => {
    try {
      setError(null)
      
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
      
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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
      
      return updatedClient
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client')
      return null
    }
  }

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      setError(null)
      
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete client')
      }

      // Remove from local state
      setClients(prev => prev.filter(client => client.id !== id))
      
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