'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ApiError, PaginatedResponse } from '@/lib/types'

// Generic resource hook configuration
export interface ResourceConfig<T> {
  tableName: string
  selectQuery: string
  transformData: (data: any) => T
  defaultOrderBy?: { column: string; ascending?: boolean }
}

// Generic options for resource operations
export interface ResourceOptions {
  search?: string
  filters?: Record<string, any>
  page?: number
  limit?: number
  orderBy?: { column: string; ascending?: boolean }
}

// Generic return type for resource hooks
export interface ResourceHook<T> {
  data: T[]
  loading: boolean
  error: ApiError | null
  totalCount: number
  create: (itemData: Partial<T>) => Promise<T | null>
  update: (id: string, itemData: Partial<T>) => Promise<T | null>
  delete: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
  setData: (data: T[]) => void
}

/**
 * Generic resource hook for CRUD operations with Supabase
 * Consolidates the pattern used in useClients, useDeals, and useTasks
 */
export function useResource<T extends { id: string }>(
  config: ResourceConfig<T>,
  options: ResourceOptions = {}
): ResourceHook<T> {
  const { 
    search = '', 
    filters = {}, 
    page = 1, 
    limit = 50,
    orderBy = config.defaultOrderBy || { column: 'created_at', ascending: false }
  } = options

  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from(config.tableName)
        .select(config.selectQuery, { count: 'exact' })
        .order(orderBy.column, { ascending: orderBy.ascending ?? false })

      // Apply search filter if provided
      if (search) {
        // This is a simplified search - each hook can customize this
        query = query.textSearch('fts', search)
      }

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            query = query.in(key, value)
          } else {
            query = query.eq(key, value)
          }
        }
      })

      // Apply pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data: fetchedData, error: fetchError, count } = await query

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      const transformedData = fetchedData?.map(config.transformData) || []
      setData(transformedData)
      setTotalCount(count || 0)

    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'An error occurred',
        details: err
      }
      setError(apiError)
      setData([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [
    config.tableName, 
    config.selectQuery, 
    config.transformData,
    search, 
    JSON.stringify(filters), 
    page, 
    limit, 
    JSON.stringify(orderBy)
  ])

  const create = async (itemData: Partial<T>): Promise<T | null> => {
    try {
      setError(null)

      const { data: insertedData, error: insertError } = await supabase
        .from(config.tableName)
        .insert([itemData])
        .select(config.selectQuery)
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      const newItem = config.transformData(insertedData)
      setData(prev => [newItem, ...prev])
      setTotalCount(prev => prev + 1)

      return newItem
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Create operation failed',
        details: err
      }
      setError(apiError)
      return null
    }
  }

  const update = async (id: string, itemData: Partial<T>): Promise<T | null> => {
    try {
      setError(null)

      const { data: updatedData, error: updateError } = await supabase
        .from(config.tableName)
        .update(itemData)
        .eq('id', id)
        .select(config.selectQuery)
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      const updatedItem = config.transformData(updatedData)
      setData(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ))

      return updatedItem
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Update operation failed',
        details: err
      }
      setError(apiError)
      return null
    }
  }

  const deleteItem = async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error: deleteError } = await supabase
        .from(config.tableName)
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      setData(prev => prev.filter(item => item.id !== id))
      setTotalCount(prev => prev - 1)

      return true
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Delete operation failed',
        details: err
      }
      setError(apiError)
      return false
    }
  }

  const refresh = async () => {
    await fetchData()
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    totalCount,
    create,
    update,
    delete: deleteItem,
    refresh,
    setData
  }
}

// Utility function to create resource-specific hooks
export function createResourceHook<T extends { id: string }>(
  config: ResourceConfig<T>
) {
  return function useSpecificResource(options: ResourceOptions = {}) {
    return useResource<T>(config, options)
  }
}