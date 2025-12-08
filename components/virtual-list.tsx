'use client'

import { useState, useEffect, useRef, useMemo, ReactNode } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  overscan?: number
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const { visibleItems, totalHeight, offsetY } = useMemo(() => {
    const containerItemCount = Math.ceil(containerHeight / itemHeight)
    const totalHeight = items.length * itemHeight
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      startIndex + containerItemCount + overscan * 2
    )

    const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }))

    const offsetY = startIndex * itemHeight

    return {
      visibleItems,
      totalHeight,
      offsetY
    }
  }, [items, itemHeight, scrollTop, containerHeight, overscan])

  useEffect(() => {
    const scrollElement = scrollElementRef.current
    if (!scrollElement) return

    const handleScroll = () => {
      setScrollTop(scrollElement.scrollTop)
    }

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            width: '100%'
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{
                height: itemHeight,
                overflow: 'hidden'
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Optimized table virtualization
interface VirtualTableProps<T> {
  data: T[]
  columns: Array<{
    key: keyof T
    header: string
    width?: number
    render?: (value: T[keyof T], row: T) => ReactNode
  }>
  rowHeight?: number
  maxHeight?: number
  className?: string
}

export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 60,
  maxHeight = 400,
  className = ''
}: VirtualTableProps<T>) {
  return (
    <div className={`border rounded-lg ${className}`}>
      {/* Table Header */}
      <div className="border-b bg-gray-50 px-4 py-2">
        <div className="flex">
          {columns.map((column, index) => (
            <div
              key={String(column.key)}
              className="font-medium text-sm text-gray-900"
              style={{
                width: column.width || `${100 / columns.length}%`,
                flexShrink: 0
              }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Table Body */}
      <VirtualList
        items={data}
        itemHeight={rowHeight}
        containerHeight={Math.min(maxHeight, data.length * rowHeight)}
        className="px-4"
        renderItem={(row, index) => (
          <div
            className={`flex items-center py-2 ${
              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            } hover:bg-blue-50 transition-colors`}
          >
            {columns.map((column) => (
              <div
                key={String(column.key)}
                className="text-sm text-gray-900 truncate"
                style={{
                  width: column.width || `${100 / columns.length}%`,
                  flexShrink: 0
                }}
              >
                {column.render
                  ? column.render(row[column.key], row)
                  : String(row[column.key] || '')
                }
              </div>
            ))}
          </div>
        )}
      />
    </div>
  )
}

// Hook for infinite scrolling with virtualization
export function useInfiniteVirtualList<T>(
  fetchData: (page: number, limit: number) => Promise<{ items: T[], hasMore: boolean }>,
  initialLimit: number = 50
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const loadMore = async () => {
    if (loading || !hasMore) return

    setLoading(true)
    try {
      const result = await fetchData(page, initialLimit)
      setItems(prev => [...prev, ...result.items])
      setHasMore(result.hasMore)
      setPage(prev => prev + 1)
    } catch (error) {
      console.error('Failed to load more items:', error)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setItems([])
    setPage(1)
    setHasMore(true)
    setLoading(false)
  }

  return {
    items,
    loading,
    hasMore,
    loadMore,
    reset
  }
}