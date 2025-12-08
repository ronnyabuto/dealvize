import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { DashboardMetrics } from '@/components/dashboard-metrics'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  TrendingUp: ({ className, ...props }: any) => <div data-testid="trending-up-icon" className={className} {...props} />,
  TrendingDown: ({ className, ...props }: any) => <div data-testid="trending-down-icon" className={className} {...props} />,
  Users: ({ className, ...props }: any) => <div data-testid="users-icon" className={className} {...props} />,
  Building: ({ className, ...props }: any) => <div data-testid="building-icon" className={className} {...props} />,
  DollarSign: ({ className, ...props }: any) => <div data-testid="dollar-sign-icon" className={className} {...props} />,
  Calendar: ({ className, ...props }: any) => <div data-testid="calendar-icon" className={className} {...props} />
}))

// Mock error boundary
jest.mock('@/components/error-boundary', () => ({
  APIErrorBoundary: ({ children }: any) => <div data-testid="api-error-boundary">{children}</div>
}))

describe('DashboardMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<DashboardMetrics />)

    expect(screen.getByText('Loading metrics...')).toBeInTheDocument()
    expect(screen.getAllByTestId('skeleton')).toHaveLength(4)
  })

  it('should render metrics when API call succeeds', async () => {
    const mockMetricsData = {
      totalClients: 150,
      clientsGrowth: '+12%',
      activeDeals: 23,
      dealsGrowth: '+5%',
      totalRevenue: '$1,250,000',
      revenueGrowth: '+18%',
      tasksCompleted: 45,
      tasksGrowth: '+8%'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsData
    })

    render(<DashboardMetrics />)

    await waitFor(() => {
      expect(screen.getByText('Total Clients')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('+12%')).toBeInTheDocument()
    })

    expect(screen.getByText('Active Deals')).toBeInTheDocument()
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.getByText('+5%')).toBeInTheDocument()

    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$1,250,000')).toBeInTheDocument()
    expect(screen.getByText('+18%')).toBeInTheDocument()

    expect(screen.getByText('Tasks Completed')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('+8%')).toBeInTheDocument()
  })

  it('should show correct icons for each metric', async () => {
    const mockMetricsData = {
      totalClients: 150,
      clientsGrowth: '+12%',
      activeDeals: 23,
      dealsGrowth: '+5%',
      totalRevenue: '$1,250,000',
      revenueGrowth: '+18%',
      tasksCompleted: 45,
      tasksGrowth: '+8%'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsData
    })

    render(<DashboardMetrics />)

    await waitFor(() => {
      expect(screen.getByTestId('users-icon')).toBeInTheDocument()
      expect(screen.getByTestId('building-icon')).toBeInTheDocument()
      expect(screen.getByTestId('dollar-sign-icon')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument()
    })
  })

  it('should show trending up icons for positive trends', async () => {
    const mockMetricsData = {
      totalClients: 150,
      clientsGrowth: '+12%',
      activeDeals: 23,
      dealsGrowth: '+5%',
      totalRevenue: '$1,250,000',
      revenueGrowth: '+18%',
      tasksCompleted: 45,
      tasksGrowth: '+8%'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsData
    })

    render(<DashboardMetrics />)

    await waitFor(() => {
      expect(screen.getAllByTestId('trending-up-icon')).toHaveLength(4)
      expect(screen.queryByTestId('trending-down-icon')).not.toBeInTheDocument()
    })
  })

  it('should show trending down icons for negative trends', async () => {
    const mockMetricsData = {
      totalClients: 150,
      clientsGrowth: '-12%',
      activeDeals: 23,
      dealsGrowth: '-5%',
      totalRevenue: '$1,250,000',
      revenueGrowth: '-18%',
      tasksCompleted: 45,
      tasksGrowth: '-8%'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsData
    })

    render(<DashboardMetrics />)

    await waitFor(() => {
      expect(screen.getAllByTestId('trending-down-icon')).toHaveLength(4)
      expect(screen.queryByTestId('trending-up-icon')).not.toBeInTheDocument()
    })
  })

  it('should handle mixed trend directions', async () => {
    const mockMetricsData = {
      totalClients: 150,
      clientsGrowth: '+12%',
      activeDeals: 23,
      dealsGrowth: '-5%',
      totalRevenue: '$1,250,000',
      revenueGrowth: '+18%',
      tasksCompleted: 45,
      tasksGrowth: '-8%'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsData
    })

    render(<DashboardMetrics />)

    await waitFor(() => {
      expect(screen.getAllByTestId('trending-up-icon')).toHaveLength(2)
      expect(screen.getAllByTestId('trending-down-icon')).toHaveLength(2)
    })
  })

  it('should handle API failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    render(<DashboardMetrics />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load metrics')).toBeInTheDocument()
      expect(screen.getByText('Try again')).toBeInTheDocument()
    })
  })

  it('should handle network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<DashboardMetrics />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load metrics')).toBeInTheDocument()
      expect(screen.getByText('Try again')).toBeInTheDocument()
    })
  })

  it('should show default values when API returns null/undefined data', async () => {
    const mockMetricsData = {
      totalClients: null,
      clientsGrowth: undefined,
      activeDeals: null,
      dealsGrowth: undefined,
      totalRevenue: null,
      revenueGrowth: undefined,
      tasksCompleted: null,
      tasksGrowth: undefined
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsData
    })

    render(<DashboardMetrics />)

    await waitFor(() => {
      expect(screen.getAllByText('0')).toHaveLength(3) // totalClients, activeDeals, tasksCompleted
      expect(screen.getByText('$0')).toBeInTheDocument() // totalRevenue
      expect(screen.getAllByText('0%')).toHaveLength(4) // All growth percentages
    })
  })

  it('should handle empty API response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    })

    render(<DashboardMetrics />)

    await waitFor(() => {
      expect(screen.getAllByText('0')).toHaveLength(3)
      expect(screen.getByText('$0')).toBeInTheDocument()
      expect(screen.getAllByText('0%')).toHaveLength(4)
    })
  })

  it('should be wrapped in APIErrorBoundary', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(<DashboardMetrics />)

    expect(screen.getByTestId('api-error-boundary')).toBeInTheDocument()
  })

  it('should refresh data when retry is clicked', async () => {
    // First call fails
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalClients: 100,
          clientsGrowth: '+10%',
          activeDeals: 20,
          dealsGrowth: '+15%',
          totalRevenue: '$1,000,000',
          revenueGrowth: '+20%',
          tasksCompleted: 40,
          tasksGrowth: '+5%'
        })
      })

    render(<DashboardMetrics />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load metrics')).toBeInTheDocument()
    })

    // Click retry
    const retryButton = screen.getByText('Try again')
    retryButton.click()

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('+10%')).toBeInTheDocument()
      expect(screen.getByText('$1,000,000')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should handle malformed JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      }
    })

    render(<DashboardMetrics />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load metrics')).toBeInTheDocument()
    })
  })

  it('should apply correct CSS classes for trend colors', async () => {
    const mockMetricsData = {
      totalClients: 150,
      clientsGrowth: '+12%',
      activeDeals: 23,
      dealsGrowth: '-5%',
      totalRevenue: '$1,250,000',
      revenueGrowth: '+18%',
      tasksCompleted: 45,
      tasksGrowth: '0%'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsData
    })

    render(<DashboardMetrics />)

    await waitFor(() => {
      const positiveGrowthElements = screen.getAllByText(/\+\d+%/)
      const negativeGrowthElements = screen.getAllByText(/-\d+%/)
      
      positiveGrowthElements.forEach(element => {
        expect(element).toHaveClass('text-green-600')
      })
      
      negativeGrowthElements.forEach(element => {
        expect(element).toHaveClass('text-red-600')
      })
    })
  })

  it('should have accessible labels and roles', async () => {
    const mockMetricsData = {
      totalClients: 150,
      clientsGrowth: '+12%',
      activeDeals: 23,
      dealsGrowth: '+5%',
      totalRevenue: '$1,250,000',
      revenueGrowth: '+18%',
      tasksCompleted: 45,
      tasksGrowth: '+8%'
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetricsData
    })

    render(<DashboardMetrics />)

    await waitFor(() => {
      // Check for proper card structure
      expect(screen.getAllByRole('region')).toHaveLength(4)
      
      // Check for proper headings
      expect(screen.getByRole('heading', { name: 'Total Clients' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Active Deals' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Revenue' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Tasks Completed' })).toBeInTheDocument()
    })
  })
})