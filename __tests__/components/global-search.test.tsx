import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { GlobalSearch } from '@/components/global-search'

// Mock Next.js router
const mockPush = jest.fn()
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => mockRouter)
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Search: ({ className, ...props }: any) => <div data-testid="search-icon" className={className} {...props} />,
  Users: ({ className, ...props }: any) => <div data-testid="users-icon" className={className} {...props} />,
  DollarSign: ({ className, ...props }: any) => <div data-testid="dollar-sign-icon" className={className} {...props} />,
  CheckSquare: ({ className, ...props }: any) => <div data-testid="check-square-icon" className={className} {...props} />,
  X: ({ className, ...props }: any) => <div data-testid="x-icon" className={className} {...props} />
}))

// Mock UI components
jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="search-input"
      {...props}
    />
  )
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, ...props }: any) => (
    <button
      onClick={onClick}
      data-testid="button"
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} {...props}>
      {children}
    </span>
  )
}))

// Mock Command component
jest.mock('@/components/ui/command', () => ({
  Command: ({ children, ...props }: any) => (
    <div data-testid="command" {...props}>{children}</div>
  ),
  CommandEmpty: ({ children, ...props }: any) => (
    <div data-testid="command-empty" {...props}>{children}</div>
  ),
  CommandGroup: ({ children, heading, ...props }: any) => (
    <div data-testid="command-group" data-heading={heading} {...props}>
      {heading && <div data-testid="group-heading">{heading}</div>}
      {children}
    </div>
  ),
  CommandInput: ({ value, onValueChange, placeholder, ...props }: any) => (
    <input
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      placeholder={placeholder}
      data-testid="command-input"
      {...props}
    />
  ),
  CommandItem: ({ children, onSelect, value, ...props }: any) => (
    <div
      data-testid="command-item"
      data-value={value}
      onClick={() => onSelect?.(value)}
      role="option"
      {...props}
    >
      {children}
    </div>
  ),
  CommandList: ({ children, ...props }: any) => (
    <div data-testid="command-list" role="listbox" {...props}>{children}</div>
  )
}))

// Mock Popover component
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open, onOpenChange, ...props }: any) => (
    <div data-testid="popover" data-open={open} {...props}>
      {children}
    </div>
  ),
  PopoverContent: ({ children, ...props }: any) => (
    <div data-testid="popover-content" {...props}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children, ...props }: any) => (
    <div data-testid="popover-trigger" {...props}>
      {children}
    </div>
  )
}))

describe('GlobalSearch', () => {
  const mockSearchResults = {
    clients: [
      { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Buyer' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Seller' }
    ],
    deals: [
      { id: '1', title: 'Downtown Property Sale', clientId: '1', value: '$500,000', status: 'In Progress' },
      { id: '2', title: 'Suburban Home Purchase', clientId: '2', value: '$350,000', status: 'Under Contract' }
    ],
    tasks: [
      { id: '1', title: 'Schedule property inspection', priority: 'High', status: 'Pending' },
      { id: '2', title: 'Review contract terms', priority: 'Medium', status: 'In Progress' }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful API responses by default
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResults.clients)
        })
      } else if (url.includes('/api/deals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResults.deals)
        })
      } else if (url.includes('/api/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResults.tasks)
        })
      }
      return Promise.resolve({ ok: false })
    })
  })

  it('should render search input and trigger', () => {
    render(<GlobalSearch />)

    expect(screen.getByTestId('search-input')).toBeInTheDocument()
    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search clients, deals, tasks...')).toBeInTheDocument()
  })

  it('should open search results when typing', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'John')

    await waitFor(() => {
      expect(screen.getByTestId('command')).toBeInTheDocument()
    })
  })

  it('should perform search when query is entered', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'John')

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/clients?search=John')
      expect(mockFetch).toHaveBeenCalledWith('/api/deals?search=John')
      expect(mockFetch).toHaveBeenCalledWith('/api/tasks?search=John')
    })
  })

  it('should display search results grouped by type', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'John')

    await waitFor(() => {
      expect(screen.getByText('Clients')).toBeInTheDocument()
      expect(screen.getByText('Deals')).toBeInTheDocument()
      expect(screen.getByText('Tasks')).toBeInTheDocument()
    })

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Downtown Property Sale')).toBeInTheDocument()
    expect(screen.getByText('Schedule property inspection')).toBeInTheDocument()
  })

  it('should show correct icons for each result type', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'test')

    await waitFor(() => {
      expect(screen.getByTestId('users-icon')).toBeInTheDocument() // Clients
      expect(screen.getByTestId('dollar-sign-icon')).toBeInTheDocument() // Deals
      expect(screen.getByTestId('check-square-icon')).toBeInTheDocument() // Tasks
    })
  })

  it('should navigate to correct URL when result is selected', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'John')

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const clientResult = screen.getByText('John Doe')
    await user.click(clientResult)

    expect(mockPush).toHaveBeenCalledWith('/client/1')
  })

  it('should clear search when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'John')

    await waitFor(() => {
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    })

    const clearButton = screen.getByTestId('x-icon').closest('button')
    if (clearButton) {
      await user.click(clearButton)
    }

    expect(searchInput).toHaveValue('')
  })

  it('should show loading state during search', async () => {
    const user = userEvent.setup()
    
    // Mock delayed response
    mockFetch.mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve([])
        }), 100)
      })
    )

    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'test')

    expect(screen.getByText('Searching...')).toBeInTheDocument()
  })

  it('should show no results message when search returns empty', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    }))

    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'nonexistent')

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: false,
      status: 500
    }))

    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'error')

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument()
    })
  })

  it('should handle network errors gracefully', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'network error')

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument()
    })
  })

  it('should not search with empty query', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, '   ') // Only whitespace

    // Wait a bit to ensure no requests are made
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should debounce search requests', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    
    // Type multiple characters quickly
    await user.type(searchInput, 'J')
    await user.type(searchInput, 'o')
    await user.type(searchInput, 'h')
    await user.type(searchInput, 'n')

    // Should only make one set of requests after debounce
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3) // One per API endpoint
    })
  })

  it('should close search results when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <GlobalSearch />
        <div data-testid="outside-element">Outside</div>
      </div>
    )

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'John')

    await waitFor(() => {
      expect(screen.getByTestId('command')).toBeInTheDocument()
    })

    const outsideElement = screen.getByTestId('outside-element')
    await user.click(outsideElement)

    await waitFor(() => {
      expect(screen.queryByTestId('command')).not.toBeVisible()
    })
  })

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'John')

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Arrow down to select first result
    await user.keyboard('[ArrowDown]')
    await user.keyboard('[Enter]')

    expect(mockPush).toHaveBeenCalledWith('/client/1')
  })

  it('should show badge for each result type', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'test')

    await waitFor(() => {
      const badges = screen.getAllByTestId('badge')
      expect(badges.length).toBeGreaterThan(0)
      
      // Check for status badges on results
      expect(screen.getByText('Buyer')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
    })
  })

  it('should format result subtitles correctly', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'test')

    await waitFor(() => {
      // Client subtitle should show email
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      
      // Deal subtitle should show value
      expect(screen.getByText('$500,000')).toBeInTheDocument()
      
      // Task subtitle should show priority
      expect(screen.getByText('High Priority')).toBeInTheDocument()
    })
  })

  it('should handle special characters in search query', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'John & Jane\'s "Property"')

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/clients?search=John%20%26%20Jane\'s%20%22Property%22')
    })
  })

  it('should prevent XSS in search results', async () => {
    const maliciousResults = {
      clients: [
        { id: '1', name: '<script>alert("xss")</script>', email: 'test@example.com', status: 'Buyer' }
      ],
      deals: [],
      tasks: []
    }

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/clients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(maliciousResults.clients)
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })

    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'script')

    await waitFor(() => {
      // The malicious content should be rendered as text, not executed
      expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument()
    })
  })

  it('should be accessible with proper ARIA labels', async () => {
    const user = userEvent.setup()
    render(<GlobalSearch />)

    const searchInput = screen.getByTestId('search-input')
    expect(searchInput).toHaveAttribute('aria-label', 'Global search')

    await user.type(searchInput, 'test')

    await waitFor(() => {
      const listbox = screen.getByRole('listbox')
      expect(listbox).toBeInTheDocument()
      
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
    })
  })
})