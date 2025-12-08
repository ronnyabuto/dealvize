import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ErrorBoundary, APIErrorBoundary, FormErrorBoundary, withErrorBoundary, useErrorHandler } from '@/components/error-boundary'

// Mock the reportError function
jest.mock('@/lib/errors', () => ({
  reportError: jest.fn()
}))

// Test component that throws an error
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }: { 
  shouldThrow?: boolean
  errorMessage?: string 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div>No error</div>
}

// Test component with async error
const ThrowAsyncError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      throw new Error('Async error')
    }
  }, [shouldThrow])

  return <div>Async component</div>
}

// Test component using error handler hook
const ComponentWithErrorHandler = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  const handleError = useErrorHandler()

  React.useEffect(() => {
    if (shouldThrow) {
      try {
        throw new Error('Handled error')
      } catch (error) {
        handleError(error as Error, { component: 'TestComponent' })
      }
    }
  }, [shouldThrow, handleError])

  return <div>Component with error handler</div>
}

describe('ErrorBoundary', () => {
  // Mock console.error to avoid noise in tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })

  it('resets error state when try again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Click try again
    fireEvent.click(screen.getByText('Try Again'))

    // Re-render with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Detailed error message" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/Detailed error message/)).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Detailed error message" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText(/Detailed error message/)).not.toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('provides reload page option', () => {
    // Mock window.location.reload
    const mockReload = jest.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload Page')
    fireEvent.click(reloadButton)

    expect(mockReload).toHaveBeenCalled()
  })

  it('provides go home option', () => {
    // Mock window.location.href
    const mockLocation = { href: '' }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const homeButton = screen.getByText('Go Home')
    fireEvent.click(homeButton)

    expect(mockLocation.href).toBe('/')
  })

  it('reports error to logging service', () => {
    const { reportError } = require('@/lib/errors')

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Test error for logging" />
      </ErrorBoundary>
    )

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
        errorBoundary: true
      })
    )
  })

  it('handles multiple consecutive errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="First error" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Reset and throw another error
    fireEvent.click(screen.getByText('Try Again'))
    
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Second error" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})

describe('APIErrorBoundary', () => {
  const { reportError } = require('@/lib/errors')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when no error occurs', () => {
    render(
      <APIErrorBoundary>
        <div>API content</div>
      </APIErrorBoundary>
    )

    expect(screen.getByText('API content')).toBeInTheDocument()
  })

  it('shows API-specific error message when error occurs', () => {
    render(
      <APIErrorBoundary>
        <ThrowError shouldThrow={true} />
      </APIErrorBoundary>
    )

    expect(screen.getByText('Failed to load data. Please refresh the page or try again later.')).toBeInTheDocument()
  })

  it('reports error with API context', () => {
    render(
      <APIErrorBoundary>
        <ThrowError shouldThrow={true} />
      </APIErrorBoundary>
    )

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: 'API_ERROR'
      })
    )
  })
})

describe('FormErrorBoundary', () => {
  const { reportError } = require('@/lib/errors')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when no error occurs', () => {
    render(
      <FormErrorBoundary>
        <form>Form content</form>
      </FormErrorBoundary>
    )

    expect(screen.getByText('Form content')).toBeInTheDocument()
  })

  it('shows form-specific error message when error occurs', () => {
    render(
      <FormErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FormErrorBoundary>
    )

    expect(screen.getByText('Form submission failed. Please check your input and try again.')).toBeInTheDocument()
  })

  it('reports error with form context', () => {
    render(
      <FormErrorBoundary>
        <ThrowError shouldThrow={true} />
      </FormErrorBoundary>
    )

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: 'FORM_ERROR'
      })
    )
  })
})

describe('withErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    const TestComponent = () => <div>Test component</div>
    const WrappedComponent = withErrorBoundary(TestComponent)

    render(<WrappedComponent />)

    expect(screen.getByText('Test component')).toBeInTheDocument()
  })

  it('catches errors in wrapped component', () => {
    const ErrorComponent = () => {
      throw new Error('Component error')
    }
    const WrappedComponent = withErrorBoundary(ErrorComponent)

    render(<WrappedComponent />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('uses custom fallback if provided', () => {
    const ErrorComponent = () => {
      throw new Error('Component error')
    }
    const customFallback = <div>Custom HOC fallback</div>
    const WrappedComponent = withErrorBoundary(ErrorComponent, customFallback)

    render(<WrappedComponent />)

    expect(screen.getByText('Custom HOC fallback')).toBeInTheDocument()
  })

  it('calls custom onError callback', () => {
    const onError = jest.fn()
    const ErrorComponent = () => {
      throw new Error('Component error')
    }
    const WrappedComponent = withErrorBoundary(ErrorComponent, undefined, onError)

    render(<WrappedComponent />)

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    )
  })

  it('sets display name correctly', () => {
    const TestComponent = () => <div>Test</div>
    TestComponent.displayName = 'TestComponent'
    const WrappedComponent = withErrorBoundary(TestComponent)

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)')
  })
})

describe('useErrorHandler hook', () => {
  const { reportError } = require('@/lib/errors')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reports error when called', () => {
    render(<ComponentWithErrorHandler shouldThrow={true} />)

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        component: 'TestComponent'
      })
    )
  })

  it('handles errors without crashing', () => {
    render(<ComponentWithErrorHandler shouldThrow={true} />)

    expect(screen.getByText('Component with error handler')).toBeInTheDocument()
  })

  it('accepts additional context', () => {
    const ComponentWithContext = () => {
      const handleError = useErrorHandler()

      React.useEffect(() => {
        try {
          throw new Error('Error with context')
        } catch (error) {
          handleError(error as Error, { 
            component: 'TestComponent',
            action: 'testAction',
            metadata: { key: 'value' }
          })
        }
      }, [handleError])

      return <div>Component with context</div>
    }

    render(<ComponentWithContext />)

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        component: 'TestComponent',
        action: 'testAction',
        metadata: { key: 'value' }
      })
    )
  })
})

describe('Error Boundary Integration', () => {
  it('handles nested error boundaries', () => {
    render(
      <ErrorBoundary>
        <APIErrorBoundary>
          <FormErrorBoundary>
            <ThrowError shouldThrow={true} />
          </FormErrorBoundary>
        </APIErrorBoundary>
      </ErrorBoundary>
    )

    // Should show the innermost (Form) error boundary
    expect(screen.getByText('Form submission failed. Please check your input and try again.')).toBeInTheDocument()
  })

  it('propagates error to parent boundary when child boundary fails', () => {
    // Create a boundary that always fails
    const FailingBoundary = ({ children }: { children: React.ReactNode }) => {
      throw new Error('Boundary error')
    }

    render(
      <ErrorBoundary>
        <FailingBoundary>
          <div>Content</div>
        </FailingBoundary>
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('maintains component state after error recovery', () => {
    let errorState = true
    
    const ToggleErrorComponent = () => {
      const [count, setCount] = React.useState(0)
      
      if (errorState) {
        throw new Error('Toggle error')
      }
      
      return (
        <div>
          <span>Count: {count}</span>
          <button onClick={() => setCount(c => c + 1)}>Increment</button>
        </div>
      )
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ToggleErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Reset error state and try again
    errorState = false
    fireEvent.click(screen.getByText('Try Again'))

    rerender(
      <ErrorBoundary>
        <ToggleErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })
})