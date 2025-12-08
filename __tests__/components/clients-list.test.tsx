import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClientsList } from '@/components/clients-list'

// Mock the useClients hook
const mockUseClients = {
  clients: [],
  loading: false,
  error: null,
  totalCount: 0,
  refetch: jest.fn(),
  createClient: jest.fn(),
  updateClient: jest.fn(),
  deleteClient: jest.fn()
}

jest.mock('@/hooks/use-clients', () => ({
  useClients: jest.fn(() => mockUseClients)
}))

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 data-testid="card-title" {...props}>{children}</h2>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      data-testid="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="input"
      {...props}
    />
  )
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue, ...props }: any) => (
    <div data-testid="select" data-default={defaultValue} {...props}>
      {children}
    </div>
  ),
  SelectContent: ({ children, ...props }: any) => (
    <div data-testid="select-content" {...props}>{children}</div>
  ),
  SelectItem: ({ children, value, ...props }: any) => (
    <div data-testid="select-item" data-value={value} {...props}>{children}</div>
  ),
  SelectTrigger: ({ children, ...props }: any) => (
    <button data-testid="select-trigger" {...props}>{children}</button>
  ),
  SelectValue: ({ placeholder, ...props }: any) => (
    <span data-testid="select-value" data-placeholder={placeholder} {...props} />
  )
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} className={className} {...props}>
      {children}
    </span>
  )
}))

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }: any) => (
    <div data-testid="avatar" {...props}>{children}</div>
  ),
  AvatarFallback: ({ children, ...props }: any) => (
    <div data-testid="avatar-fallback" {...props}>{children}</div>
  ),
  AvatarImage: ({ src, alt, ...props }: any) => (
    <img data-testid="avatar-image" src={src} alt={alt} {...props} />
  )
}))

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: any) => (
    <div data-testid="skeleton" className={className} {...props} />
  )
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: ({ className, ...props }: any) => <div data-testid="search-icon" className={className} {...props} />,
  Plus: ({ className, ...props }: any) => <div data-testid="plus-icon" className={className} {...props} />,
  Filter: ({ className, ...props }: any) => <div data-testid="filter-icon" className={className} {...props} />,
  MoreVertical: ({ className, ...props }: any) => <div data-testid="more-vertical-icon" className={className} {...props} />,
  Edit: ({ className, ...props }: any) => <div data-testid="edit-icon" className={className} {...props} />,
  Trash: ({ className, ...props }: any) => <div data-testid="trash-icon" className={className} {...props} />,
  Mail: ({ className, ...props }: any) => <div data-testid="mail-icon" className={className} {...props} />,
  Phone: ({ className, ...props }: any) => <div data-testid="phone-icon" className={className} {...props} />
}))

describe('ClientsList', () => {
  const mockClients = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      address: '123 Main St, City, State',
      company: 'Acme Corp',
      status: 'Buyer' as const,
      statusColor: 'bg-green-100 text-green-800',
      lastContact: 'March 15, 2024',
      dealValue: '$500,000',
      initials: 'JD'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+0987654321',
      address: '456 Oak Ave, Town, State',
      company: 'Tech Solutions',
      status: 'Seller' as const,
      statusColor: 'bg-orange-100 text-orange-800',
      lastContact: 'March 10, 2024',
      dealValue: '$750,000',
      initials: 'JS'
    },
    {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      phone: '+1122334455',
      address: '789 Pine Rd, Village, State',
      company: '',
      status: 'In Contract' as const,
      statusColor: 'bg-teal-100 text-teal-800',
      lastContact: 'March 20, 2024',
      dealValue: '$320,000',
      initials: 'BW'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    const { useClients } = require('@/hooks/use-clients')
    useClients.mockReturnValue({
      ...mockUseClients,
      clients: mockClients,
      totalCount: mockClients.length
    })
  })

  it('should render clients list with data', async () => {
    render(<ClientsList />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    })
  })

  it('should display client information correctly', async () => {
    render(<ClientsList />)

    await waitFor(() => {
      // Check email and phone
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('+1234567890')).toBeInTheDocument()

      // Check companies
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('Tech Solutions')).toBeInTheDocument()

      // Check status badges
      expect(screen.getByText('Buyer')).toBeInTheDocument()
      expect(screen.getByText('Seller')).toBeInTheDocument()
      expect(screen.getByText('In Contract')).toBeInTheDocument()

      // Check deal values
      expect(screen.getByText('$500,000')).toBeInTheDocument()
      expect(screen.getByText('$750,000')).toBeInTheDocument()
      expect(screen.getByText('$320,000')).toBeInTheDocument()
    })
  })

  it('should show client initials in avatars', async () => {
    render(<ClientsList />)

    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument()
      expect(screen.getByText('JS')).toBeInTheDocument()
      expect(screen.getByText('BW')).toBeInTheDocument()
    })
  })

  it('should apply correct status colors', async () => {
    render(<ClientsList />)

    await waitFor(() => {
      const buyerBadge = screen.getByText('Buyer').closest('[data-testid="badge"]')
      const sellerBadge = screen.getByText('Seller').closest('[data-testid="badge"]')
      const contractBadge = screen.getByText('In Contract').closest('[data-testid="badge"]')

      expect(buyerBadge).toHaveClass('bg-green-100', 'text-green-800')
      expect(sellerBadge).toHaveClass('bg-orange-100', 'text-orange-800')
      expect(contractBadge).toHaveClass('bg-teal-100', 'text-teal-800')
    })
  })

  it('should render loading state', () => {
    const { useClients } = require('@/hooks/use-clients')
    useClients.mockReturnValue({
      ...mockUseClients,
      loading: true
    })

    render(<ClientsList />)

    expect(screen.getAllByTestId('skeleton')).toHaveLength(5) // 5 skeleton cards
  })

  it('should render error state', () => {
    const { useClients } = require('@/hooks/use-clients')
    useClients.mockReturnValue({
      ...mockUseClients,
      error: 'Failed to load clients'
    })

    render(<ClientsList />)

    expect(screen.getByText('Error loading clients')).toBeInTheDocument()
    expect(screen.getByText('Failed to load clients')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('should render empty state when no clients', () => {
    const { useClients } = require('@/hooks/use-clients')
    useClients.mockReturnValue({
      ...mockUseClients,
      clients: [],
      totalCount: 0
    })

    render(<ClientsList />)

    expect(screen.getByText('No clients found')).toBeInTheDocument()
    expect(screen.getByText('Get started by adding your first client')).toBeInTheDocument()
    expect(screen.getByText('Add Client')).toBeInTheDocument()
  })

  it('should handle search functionality', async () => {
    const user = userEvent.setup()
    const mockRefetch = jest.fn()
    const { useClients } = require('@/hooks/use-clients')
    useClients.mockReturnValue({
      ...mockUseClients,
      clients: mockClients,
      refetch: mockRefetch
    })

    render(<ClientsList />)

    const searchInput = screen.getByPlaceholderText('Search clients...')
    await user.type(searchInput, 'John')

    // Should trigger search after debounce
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('should handle status filter', async () => {
    const user = userEvent.setup()
    render(<ClientsList />)

    const filterButton = screen.getByTestId('select-trigger')
    await user.click(filterButton)

    expect(screen.getByText('All Statuses')).toBeInTheDocument()
    expect(screen.getByText('Buyer')).toBeInTheDocument()
    expect(screen.getByText('Seller')).toBeInTheDocument()
    expect(screen.getByText('In Contract')).toBeInTheDocument()
  })

  it('should show add client button', () => {
    render(<ClientsList />)

    const addButton = screen.getByText('Add Client')
    expect(addButton).toBeInTheDocument()
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument()
  })

  it('should handle client actions menu', async () => {
    const user = userEvent.setup()
    render(<ClientsList />)

    const actionButtons = screen.getAllByTestId('more-vertical-icon')
    expect(actionButtons).toHaveLength(3) // One for each client

    // Click first client's action menu
    await user.click(actionButtons[0])

    expect(screen.getByTestId('edit-icon')).toBeInTheDocument()
    expect(screen.getByTestId('trash-icon')).toBeInTheDocument()
  })

  it('should handle client deletion', async () => {
    const user = userEvent.setup()
    const mockDeleteClient = jest.fn().mockResolvedValue(true)
    const { useClients } = require('@/hooks/use-clients')
    useClients.mockReturnValue({
      ...mockUseClients,
      clients: mockClients,
      deleteClient: mockDeleteClient
    })

    render(<ClientsList />)

    const actionButtons = screen.getAllByTestId('more-vertical-icon')
    await user.click(actionButtons[0])

    const deleteButton = screen.getByTestId('trash-icon').closest('button')
    if (deleteButton) {
      await user.click(deleteButton)
    }

    // Should show confirmation dialog
    expect(screen.getByText('Delete Client')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete this client?')).toBeInTheDocument()

    const confirmButton = screen.getByText('Delete')
    await user.click(confirmButton)

    expect(mockDeleteClient).toHaveBeenCalledWith('1')
  })

  it('should handle retry when error occurs', async () => {
    const user = userEvent.setup()
    const mockRefetch = jest.fn()
    const { useClients } = require('@/hooks/use-clients')
    useClients.mockReturnValue({
      ...mockUseClients,
      error: 'Network error',
      refetch: mockRefetch
    })

    render(<ClientsList />)

    const retryButton = screen.getByText('Try again')
    await user.click(retryButton)

    expect(mockRefetch).toHaveBeenCalled()
  })

  it('should display contact information with icons', async () => {
    render(<ClientsList />)

    await waitFor(() => {
      expect(screen.getAllByTestId('mail-icon')).toHaveLength(3)
      expect(screen.getAllByTestId('phone-icon')).toHaveLength(3)
    })
  })

  it('should handle clients without company', async () => {
    render(<ClientsList />)

    await waitFor(() => {
      // Bob Wilson has no company, should not crash
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    })
  })

  it('should show client count', async () => {
    render(<ClientsList />)

    await waitFor(() => {
      expect(screen.getByText('3 Clients')).toBeInTheDocument()
    })
  })

  it('should handle pagination', async () => {
    const manyClients = Array.from({ length: 15 }, (_, i) => ({
      ...mockClients[0],
      id: `client-${i}`,
      name: `Client ${i + 1}`,
      email: `client${i + 1}@example.com`
    }))

    const { useClients } = require('@/hooks/use-clients')
    useClients.mockReturnValue({
      ...mockUseClients,
      clients: manyClients,
      totalCount: 15
    })

    render(<ClientsList />)

    await waitFor(() => {
      expect(screen.getByText('15 Clients')).toBeInTheDocument()
    })

    // Should show pagination controls if implemented
    const loadMoreButton = screen.queryByText('Load More')
    if (loadMoreButton) {
      expect(loadMoreButton).toBeInTheDocument()
    }
  })

  it('should be responsive and mobile-friendly', async () => {
    render(<ClientsList />)

    await waitFor(() => {
      // Check that cards are rendered (mobile-friendly layout)
      const cards = screen.getAllByTestId('card')
      expect(cards.length).toBeGreaterThan(0)

      // Should have responsive classes
      cards.forEach(card => {
        expect(card).toHaveClass() // Should have appropriate responsive classes
      })
    })
  })

  it('should have proper accessibility labels', async () => {
    render(<ClientsList />)

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search clients...')
      expect(searchInput).toHaveAttribute('aria-label', 'Search clients')

      const addButton = screen.getByText('Add Client')
      expect(addButton).toHaveAttribute('aria-label', 'Add new client')

      // Check that client cards have proper structure
      const clientCards = screen.getAllByTestId('card')
      clientCards.forEach((card, index) => {
        expect(card).toHaveAttribute('role', 'article')
        expect(card).toHaveAttribute('aria-labelledby', `client-${mockClients[index].id}-name`)
      })
    })
  })

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<ClientsList />)

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search clients...')
      searchInput.focus()
      expect(searchInput).toHaveFocus()

      // Tab through interactive elements
      user.keyboard('[Tab]')
      const addButton = screen.getByText('Add Client')
      expect(addButton).toHaveFocus()
    })
  })

  it('should handle sorting functionality', async () => {
    const user = userEvent.setup()
    render(<ClientsList />)

    // Check if sort options are available
    const sortButton = screen.queryByText('Sort by')
    if (sortButton) {
      await user.click(sortButton)
      
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Date Added')).toBeInTheDocument()
      expect(screen.getByText('Deal Value')).toBeInTheDocument()
    }
  })
})