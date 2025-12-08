interface PaginationConfig {
  pageSize: number
  maxCachedPages: number
  prefetchThreshold: number // Pages to prefetch when approaching end
}

interface PageInfo {
  page: number
  data: any[]
  timestamp: Date
  hasMore: boolean
  totalCount?: number
}

interface PaginationState {
  pages: Map<number, PageInfo>
  currentPage: number
  isLoading: boolean
  hasMore: boolean
  error: string | null
}

/**
 * Manages paginated data loading with caching and prefetching
 * Optimized for chat message history and conversation lists
 */
class PaginationManager {
  private state: Map<string, PaginationState> = new Map()
  private config: PaginationConfig
  private fetchFunctions: Map<string, (page: number, pageSize: number) => Promise<{
    data: any[]
    hasMore: boolean
    totalCount?: number
  }>> = new Map()

  constructor(config: Partial<PaginationConfig> = {}) {
    this.config = {
      pageSize: 20,
      maxCachedPages: 10,
      prefetchThreshold: 2,
      ...config
    }
  }

  /**
   * Register a fetch function for a specific key
   */
  registerFetcher(
    key: string, 
    fetchFn: (page: number, pageSize: number) => Promise<{
      data: any[]
      hasMore: boolean
      totalCount?: number
    }>
  ): void {
    this.fetchFunctions.set(key, fetchFn)
    this.initializeState(key)
  }

  /**
   * Get current state for a key
   */
  getState(key: string): PaginationState | null {
    return this.state.get(key) || null
  }

  /**
   * Get all loaded data for a key (flattened)
   */
  getAllData(key: string): any[] {
    const state = this.state.get(key)
    if (!state) return []

    const sortedPages = Array.from(state.pages.values())
      .sort((a, b) => a.page - b.page)
    
    return sortedPages.flatMap(page => page.data)
  }

  /**
   * Load initial page
   */
  async loadFirst(key: string): Promise<void> {
    const state = this.ensureState(key)
    
    if (state.isLoading) return
    
    state.isLoading = true
    state.error = null
    this.notifyStateChange(key)

    try {
      const result = await this.fetchPage(key, 1)
      if (result) {
        state.pages.set(1, {
          page: 1,
          data: result.data,
          timestamp: new Date(),
          hasMore: result.hasMore,
          totalCount: result.totalCount
        })
        
        state.currentPage = 1
        state.hasMore = result.hasMore
        
        // Prefetch next page if needed
        this.considerPrefetch(key)
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to load data'
    } finally {
      state.isLoading = false
      this.notifyStateChange(key)
    }
  }

  /**
   * Load next page
   */
  async loadNext(key: string): Promise<void> {
    const state = this.ensureState(key)
    
    if (state.isLoading || !state.hasMore) return
    
    const nextPage = state.currentPage + 1
    
    // Check if already cached
    if (state.pages.has(nextPage)) {
      state.currentPage = nextPage
      this.considerPrefetch(key)
      this.notifyStateChange(key)
      return
    }

    state.isLoading = true
    state.error = null
    this.notifyStateChange(key)

    try {
      const result = await this.fetchPage(key, nextPage)
      if (result) {
        state.pages.set(nextPage, {
          page: nextPage,
          data: result.data,
          timestamp: new Date(),
          hasMore: result.hasMore,
          totalCount: result.totalCount
        })
        
        state.currentPage = nextPage
        state.hasMore = result.hasMore
        
        // Clean up old pages if needed
        this.cleanupOldPages(key)
        
        // Prefetch next page if needed
        this.considerPrefetch(key)
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to load next page'
    } finally {
      state.isLoading = false
      this.notifyStateChange(key)
    }
  }

  /**
   * Load previous page (for backwards pagination)
   */
  async loadPrevious(key: string): Promise<void> {
    const state = this.ensureState(key)
    
    if (state.isLoading || state.currentPage <= 1) return
    
    const prevPage = state.currentPage - 1
    
    // Check if already cached
    if (state.pages.has(prevPage)) {
      state.currentPage = prevPage
      this.notifyStateChange(key)
      return
    }

    state.isLoading = true
    state.error = null
    this.notifyStateChange(key)

    try {
      const result = await this.fetchPage(key, prevPage)
      if (result) {
        state.pages.set(prevPage, {
          page: prevPage,
          data: result.data,
          timestamp: new Date(),
          hasMore: result.hasMore,
          totalCount: result.totalCount
        })
        
        state.currentPage = prevPage
        
        // Clean up old pages if needed
        this.cleanupOldPages(key)
      }
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to load previous page'
    } finally {
      state.isLoading = false
      this.notifyStateChange(key)
    }
  }

  /**
   * Refresh current data (clear cache and reload)
   */
  async refresh(key: string): Promise<void> {
    const state = this.ensureState(key)
    const currentPage = state.currentPage
    
    // Clear cached pages
    state.pages.clear()
    state.currentPage = 1
    state.hasMore = true
    state.error = null
    
    // Reload from page 1 up to current page
    for (let page = 1; page <= currentPage; page++) {
      try {
        const result = await this.fetchPage(key, page)
        if (result) {
          state.pages.set(page, {
            page,
            data: result.data,
            timestamp: new Date(),
            hasMore: result.hasMore,
            totalCount: result.totalCount
          })
          
          state.hasMore = result.hasMore
          if (!result.hasMore) break
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to refresh'
        break
      }
    }
    
    state.currentPage = Math.min(currentPage, state.pages.size)
    this.notifyStateChange(key)
  }

  /**
   * Insert new item at the beginning (useful for new messages)
   */
  prependItem(key: string, item: any): void {
    const state = this.state.get(key)
    if (!state) return

    // Add to first page if it exists
    const firstPage = state.pages.get(1)
    if (firstPage) {
      firstPage.data.unshift(item)
      firstPage.timestamp = new Date()
      
      // If page is too large, move last item to next page or remove it
      if (firstPage.data.length > this.config.pageSize) {
        const overflow = firstPage.data.splice(this.config.pageSize)
        
        // Try to add to next page
        const nextPage = state.pages.get(2)
        if (nextPage) {
          nextPage.data.unshift(...overflow)
        }
        // If no next page and we have more data, we might have lost items
        // In practice, this is rare and acceptable for real-time updates
      }
      
      this.notifyStateChange(key)
    }
  }

  /**
   * Update an existing item
   */
  updateItem(key: string, itemId: string, updatedItem: any, idField: string = 'id'): void {
    const state = this.state.get(key)
    if (!state) return

    let found = false
    for (const page of state.pages.values()) {
      const index = page.data.findIndex(item => item[idField] === itemId)
      if (index !== -1) {
        page.data[index] = { ...page.data[index], ...updatedItem }
        page.timestamp = new Date()
        found = true
        break
      }
    }
    
    if (found) {
      this.notifyStateChange(key)
    }
  }

  /**
   * Remove an item
   */
  removeItem(key: string, itemId: string, idField: string = 'id'): void {
    const state = this.state.get(key)
    if (!state) return

    let found = false
    for (const page of state.pages.values()) {
      const index = page.data.findIndex(item => item[idField] === itemId)
      if (index !== -1) {
        page.data.splice(index, 1)
        page.timestamp = new Date()
        found = true
        break
      }
    }
    
    if (found) {
      this.notifyStateChange(key)
    }
  }

  /**
   * Clear all data for a key
   */
  clear(key: string): void {
    this.state.delete(key)
    this.fetchFunctions.delete(key)
  }

  /**
   * Get pagination info
   */
  getPaginationInfo(key: string): {
    currentPage: number
    totalPages: number
    hasMore: boolean
    isLoading: boolean
    error: string | null
    itemCount: number
  } {
    const state = this.state.get(key)
    if (!state) {
      return {
        currentPage: 0,
        totalPages: 0,
        hasMore: false,
        isLoading: false,
        error: null,
        itemCount: 0
      }
    }

    return {
      currentPage: state.currentPage,
      totalPages: state.pages.size,
      hasMore: state.hasMore,
      isLoading: state.isLoading,
      error: state.error,
      itemCount: this.getAllData(key).length
    }
  }

  private initializeState(key: string): void {
    if (!this.state.has(key)) {
      this.state.set(key, {
        pages: new Map(),
        currentPage: 0,
        isLoading: false,
        hasMore: true,
        error: null
      })
    }
  }

  private ensureState(key: string): PaginationState {
    this.initializeState(key)
    return this.state.get(key)!
  }

  private async fetchPage(key: string, page: number): Promise<{
    data: any[]
    hasMore: boolean
    totalCount?: number
  } | null> {
    const fetchFn = this.fetchFunctions.get(key)
    if (!fetchFn) {
      throw new Error(`No fetch function registered for key: ${key}`)
    }

    return fetchFn(page, this.config.pageSize)
  }

  private considerPrefetch(key: string): void {
    const state = this.state.get(key)
    if (!state || state.isLoading || !state.hasMore) return

    const totalPages = state.pages.size
    const remainingPages = Math.max(0, totalPages - state.currentPage)

    if (remainingPages <= this.config.prefetchThreshold) {
      // Prefetch next page silently
      this.prefetchPage(key, totalPages + 1)
    }
  }

  private async prefetchPage(key: string, page: number): Promise<void> {
    const state = this.state.get(key)
    if (!state || state.pages.has(page)) return

    try {
      const result = await this.fetchPage(key, page)
      if (result) {
        state.pages.set(page, {
          page,
          data: result.data,
          timestamp: new Date(),
          hasMore: result.hasMore,
          totalCount: result.totalCount
        })
        
        // Update hasMore based on prefetch result
        if (!result.hasMore && page === state.pages.size) {
          state.hasMore = false
          this.notifyStateChange(key)
        }
      }
    } catch (error) {
      // Prefetch failures are silent
      console.debug(`Prefetch failed for ${key} page ${page}:`, error)
    }
  }

  private cleanupOldPages(key: string): void {
    const state = this.state.get(key)
    if (!state || state.pages.size <= this.config.maxCachedPages) return

    // Remove oldest pages
    const sortedPages = Array.from(state.pages.entries())
      .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime())

    const pagesToRemove = sortedPages.slice(0, sortedPages.length - this.config.maxCachedPages)
    
    for (const [pageNum] of pagesToRemove) {
      // Don't remove pages around current page
      if (Math.abs(pageNum - state.currentPage) > 2) {
        state.pages.delete(pageNum)
      }
    }
  }

  private notifyStateChange(key: string): void {
    // In a real implementation, you might want to emit events or use a state management system
    // For now, this is a placeholder for state change notifications
    console.debug(`Pagination state changed for ${key}`)
  }
}

export const paginationManager = new PaginationManager()
export { PaginationManager }