import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TasksDueToday } from '@/components/tasks-due-today'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 data-testid="card-title" {...props}>{children}</h2>
}))

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
      id={id}
      data-testid="task-checkbox"
      {...props}
    />
  )
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span data-testid="badge" className={className} data-variant={variant} {...props}>
      {children}
    </span>
  )
}))

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className, ...props }: any) => (
    <div data-testid="progress-bar" data-value={value} className={className} {...props} />
  )
}))

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: any) => (
    <div data-testid="skeleton" className={className} {...props} />
  )
}))

jest.mock('@/components/error-boundary', () => ({
  APIErrorBoundary: ({ children }: any) => <div data-testid="api-error-boundary">{children}</div>
}))

describe('TasksDueToday', () => {
  const mockTasksData = {
    tasks: [
      {
        id: '1',
        title: 'Call client about property viewing',
        priority: 'High' as const,
        status: 'Pending' as const,
        due_date: new Date().toISOString(),
        client_id: 'client-1',
        clients: {
          id: 'client-1',
          name: 'John Doe',
          initials: 'JD'
        }
      },
      {
        id: '2',
        title: 'Prepare contract documents',
        priority: 'Medium' as const,
        status: 'In Progress' as const,
        due_date: new Date().toISOString(),
        client_id: 'client-2',
        clients: {
          id: 'client-2',
          name: 'Jane Smith',
          initials: 'JS'
        }
      },
      {
        id: '3',
        title: 'Send follow-up email',
        priority: 'Low' as const,
        status: 'Completed' as const,
        due_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        client_id: 'client-3',
        clients: {
          id: 'client-3',
          name: 'Bob Wilson',
          initials: 'BW'
        }
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<TasksDueToday />)

    expect(screen.getByTestId('card-title')).toHaveTextContent('Tasks Due Today')
    expect(screen.getAllByTestId('skeleton')).toHaveLength(3)
  })

  it('should render tasks when API call succeeds', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksData
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('Call client about property viewing')).toBeInTheDocument()
      expect(screen.getByText('Prepare contract documents')).toBeInTheDocument()
    })

    // Should not show completed tasks in the due today section
    expect(screen.queryByText('Send follow-up email')).not.toBeInTheDocument()
  })

  it('should show correct number of due tasks', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksData
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('2 Due')).toBeInTheDocument()
    })
  })

  it('should display task priorities with correct styling', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksData
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      const highPriorityBadge = screen.getByText('High')
      const mediumPriorityBadge = screen.getByText('Medium')

      expect(highPriorityBadge).toHaveClass('border-red-300', 'text-red-700')
      expect(mediumPriorityBadge).toHaveClass('border-yellow-300', 'text-yellow-700')
    })
  })

  it('should display client information when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksData
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('should handle task completion toggle', async () => {
    const user = userEvent.setup()
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasksData
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('Call client about property viewing')).toBeInTheDocument()
    })

    const checkbox = screen.getAllByTestId('task-checkbox')[0]
    await user.click(checkbox)

    expect(mockFetch).toHaveBeenCalledWith('/api/tasks/1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'Completed'
      }),
    })
  })

  it('should handle unchecking completed tasks', async () => {
    const user = userEvent.setup()
    const completedTaskData = {
      tasks: [
        {
          ...mockTasksData.tasks[0],
          status: 'Completed' as const
        }
      ]
    }
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => completedTaskData
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('Call client about property viewing')).toBeInTheDocument()
    })

    const checkbox = screen.getByTestId('task-checkbox')
    expect(checkbox).toBeChecked()

    await user.click(checkbox)

    expect(mockFetch).toHaveBeenCalledWith('/api/tasks/1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'Pending'
      }),
    })
  })

  it('should show progress bar with correct calculation', async () => {
    const mixedTasksData = {
      tasks: [
        { ...mockTasksData.tasks[0], status: 'Completed' as const },
        { ...mockTasksData.tasks[1], status: 'Pending' as const },
        { ...mockTasksData.tasks[2], status: 'Completed' as const }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mixedTasksData
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '66.66666666666666') // 2/3 completed
    })

    expect(screen.getByText('2/3')).toBeInTheDocument()
  })

  it('should show "No tasks due today" when no tasks are due', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [] })
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('No tasks due today')).toBeInTheDocument()
      expect(screen.getByText('Great job staying on top of things!')).toBeInTheDocument()
      expect(screen.getByText('0 Due')).toBeInTheDocument()
    })
  })

  it('should show recently completed tasks section', async () => {
    const tasksWithCompleted = {
      tasks: [
        ...mockTasksData.tasks,
        {
          id: '4',
          title: 'Another completed task',
          priority: 'Medium' as const,
          status: 'Completed' as const,
          due_date: new Date().toISOString(),
          client_id: 'client-4',
          clients: {
            id: 'client-4',
            name: 'Alice Johnson',
            initials: 'AJ'
          }
        }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tasksWithCompleted
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('Recently Completed')).toBeInTheDocument()
      expect(screen.getByText('Send follow-up email')).toBeInTheDocument()
      expect(screen.getByText('Another completed task')).toBeInTheDocument()
    })

    // Should show disabled checkboxes for completed tasks
    const completedCheckboxes = screen.getAllByTestId('task-checkbox').filter(
      checkbox => checkbox.hasAttribute('disabled')
    )
    expect(completedCheckboxes.length).toBeGreaterThan(0)
  })

  it('should limit recently completed tasks to 3', async () => {
    const tasksWithManyCompleted = {
      tasks: Array.from({ length: 8 }, (_, i) => ({
        id: `completed-${i}`,
        title: `Completed task ${i + 1}`,
        priority: 'Medium' as const,
        status: 'Completed' as const,
        due_date: new Date().toISOString(),
        client_id: `client-${i}`,
        clients: {
          id: `client-${i}`,
          name: `Client ${i + 1}`,
          initials: `C${i + 1}`
        }
      }))
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tasksWithManyCompleted
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('Recently Completed')).toBeInTheDocument()
      
      // Should only show first 3 completed tasks
      expect(screen.getByText('Completed task 1')).toBeInTheDocument()
      expect(screen.getByText('Completed task 2')).toBeInTheDocument()
      expect(screen.getByText('Completed task 3')).toBeInTheDocument()
      expect(screen.queryByText('Completed task 4')).not.toBeInTheDocument()
    })
  })

  it('should handle API error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument()
      expect(screen.getByText('Try again')).toBeInTheDocument()
    })
  })

  it('should handle network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument()
      expect(screen.getByText('Try again')).toBeInTheDocument()
    })
  })

  it('should retry loading when retry button is clicked', async () => {
    const user = userEvent.setup()
    
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasksData
      })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument()
    })

    const retryButton = screen.getByText('Try again')
    await user.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('Call client about property viewing')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should handle task completion API failure silently', async () => {
    const user = userEvent.setup()
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasksData
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('Call client about property viewing')).toBeInTheDocument()
    })

    const checkbox = screen.getAllByTestId('task-checkbox')[0]
    await user.click(checkbox)

    // Should not show error UI for failed completion
    await waitFor(() => {
      expect(screen.queryByText('Failed to update task')).not.toBeInTheDocument()
    })
  })

  it('should be wrapped in APIErrorBoundary', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(<TasksDueToday />)

    expect(screen.getByTestId('api-error-boundary')).toBeInTheDocument()
  })

  it('should handle tasks without client information', async () => {
    const tasksWithoutClients = {
      tasks: [
        {
          id: '1',
          title: 'General task',
          priority: 'High' as const,
          status: 'Pending' as const,
          due_date: new Date().toISOString(),
          client_id: null,
          clients: null
        }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tasksWithoutClients
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      expect(screen.getByText('General task')).toBeInTheDocument()
      // Should not crash or show client badges when clients is null
      expect(screen.queryByTestId('badge')).toHaveLength(2) // Only priority and due count badges
    })
  })

  it('should filter tasks by due date correctly', async () => {
    const tasksWithVariousDueDates = {
      tasks: [
        {
          id: '1',
          title: 'Due today',
          priority: 'High' as const,
          status: 'Pending' as const,
          due_date: new Date().toISOString(),
          client_id: null,
          clients: null
        },
        {
          id: '2',
          title: 'Due tomorrow',
          priority: 'Medium' as const,
          status: 'Pending' as const,
          due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          client_id: null,
          clients: null
        },
        {
          id: '3',
          title: 'Overdue',
          priority: 'High' as const,
          status: 'Pending' as const,
          due_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          client_id: null,
          clients: null
        }
      ]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tasksWithVariousDueDates
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      // Should show today's tasks and overdue tasks, but not future tasks
      expect(screen.getByText('Due today')).toBeInTheDocument()
      expect(screen.getByText('Overdue')).toBeInTheDocument()
      expect(screen.queryByText('Due tomorrow')).not.toBeInTheDocument()
    })
  })

  it('should have proper accessibility labels', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTasksData
    })

    render(<TasksDueToday />)

    await waitFor(() => {
      const checkboxes = screen.getAllByTestId('task-checkbox')
      checkboxes.forEach((checkbox, index) => {
        expect(checkbox).toHaveAttribute('id', mockTasksData.tasks[index].id)
      })

      const labels = screen.getAllByRole('label')
      expect(labels.length).toBeGreaterThan(0)
    })
  })
})