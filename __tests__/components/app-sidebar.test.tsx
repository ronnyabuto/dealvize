import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'

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

// Mock Next.js Image and Link
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
})

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: any) {
    return <a href={href} {...props}>{children}</a>
  }
})

// Mock Supabase client
const mockSignOut = jest.fn()
const mockSupabase = {
  auth: {
    signOut: mockSignOut
  }
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Home: ({ className, ...props }: any) => <div data-testid="home-icon" className={className} {...props} />,
  Users: ({ className, ...props }: any) => <div data-testid="users-icon" className={className} {...props} />,
  Building: ({ className, ...props }: any) => <div data-testid="building-icon" className={className} {...props} />,
  CheckSquare: ({ className, ...props }: any) => <div data-testid="check-square-icon" className={className} {...props} />,
  BarChart3: ({ className, ...props }: any) => <div data-testid="bar-chart-3-icon" className={className} {...props} />,
  Settings: ({ className, ...props }: any) => <div data-testid="settings-icon" className={className} {...props} />,
  HelpCircle: ({ className, ...props }: any) => <div data-testid="help-circle-icon" className={className} {...props} />,
  LogOut: ({ className, ...props }: any) => <div data-testid="log-out-icon" className={className} {...props} />
}))

// Mock UI components
jest.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children, ...props }: any) => (
    <aside data-testid="sidebar" {...props}>{children}</aside>
  ),
  SidebarContent: ({ children, ...props }: any) => (
    <div data-testid="sidebar-content" {...props}>{children}</div>
  ),
  SidebarFooter: ({ children, ...props }: any) => (
    <div data-testid="sidebar-footer" {...props}>{children}</div>
  ),
  SidebarHeader: ({ children, ...props }: any) => (
    <div data-testid="sidebar-header" {...props}>{children}</div>
  ),
  SidebarMenu: ({ children, ...props }: any) => (
    <ul data-testid="sidebar-menu" {...props}>{children}</ul>
  ),
  SidebarMenuButton: ({ children, asChild, isActive, ...props }: any) => (
    asChild ? children : (
      <button 
        data-testid="sidebar-menu-button" 
        data-active={isActive}
        {...props}
      >
        {children}
      </button>
    )
  ),
  SidebarMenuItem: ({ children, ...props }: any) => (
    <li data-testid="sidebar-menu-item" {...props}>{children}</li>
  ),
  SidebarSeparator: ({ ...props }: any) => (
    <hr data-testid="sidebar-separator" {...props} />
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

describe('AppSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render sidebar with header, content, and footer', () => {
    render(<AppSidebar />)

    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-header')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-footer')).toBeInTheDocument()
  })

  it('should display logo in header', () => {
    render(<AppSidebar />)

    const logo = screen.getByAltText('Dealvize Logo')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('src', '/logo.svg')
  })

  it('should display all main menu items', () => {
    render(<AppSidebar />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Clients')).toBeInTheDocument()
    expect(screen.getByText('Deals')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
  })

  it('should display all menu icons', () => {
    render(<AppSidebar />)

    expect(screen.getByTestId('home-icon')).toBeInTheDocument()
    expect(screen.getByTestId('users-icon')).toBeInTheDocument()
    expect(screen.getByTestId('building-icon')).toBeInTheDocument()
    expect(screen.getByTestId('check-square-icon')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart-3-icon')).toBeInTheDocument()
  })

  it('should display bottom menu items', () => {
    render(<AppSidebar />)

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Docs')).toBeInTheDocument()
  })

  it('should display settings and help icons', () => {
    render(<AppSidebar />)

    expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
    expect(screen.getByTestId('help-circle-icon')).toBeInTheDocument()
  })

  it('should mark dashboard as active by default', () => {
    render(<AppSidebar />)

    const dashboardButton = screen.getByText('Dashboard').closest('[data-testid="sidebar-menu-button"]')
    expect(dashboardButton).toHaveAttribute('data-active', 'true')
  })

  it('should render navigation links with correct hrefs', () => {
    render(<AppSidebar />)

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /clients/i })).toHaveAttribute('href', '/clients')
    expect(screen.getByRole('link', { name: /deals/i })).toHaveAttribute('href', '/deals')
    expect(screen.getByRole('link', { name: /tasks/i })).toHaveAttribute('href', '/tasks')
    expect(screen.getByRole('link', { name: /reports/i })).toHaveAttribute('href', '/reports')
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings')
    expect(screen.getByRole('link', { name: /docs/i })).toHaveAttribute('href', '/docs')
  })

  it('should display user avatar in footer', () => {
    render(<AppSidebar />)

    expect(screen.getByTestId('avatar')).toBeInTheDocument()
    expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument()
    expect(screen.getByText('U')).toBeInTheDocument() // Default fallback
  })

  it('should display logout button in footer', () => {
    render(<AppSidebar />)

    expect(screen.getByTestId('log-out-icon')).toBeInTheDocument()
    
    const logoutButton = screen.getByText('Logout').closest('button')
    expect(logoutButton).toBeInTheDocument()
  })

  it('should handle logout when logout button is clicked', async () => {
    const user = userEvent.setup()
    mockSignOut.mockResolvedValueOnce({ error: null })

    render(<AppSidebar />)

    const logoutButton = screen.getByText('Logout').closest('button')
    if (logoutButton) {
      await user.click(logoutButton)
    }

    expect(mockSignOut).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('should show loading state during logout', async () => {
    const user = userEvent.setup()
    // Mock delayed logout
    mockSignOut.mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => resolve({ error: null }), 100)
      })
    )

    render(<AppSidebar />)

    const logoutButton = screen.getByText('Logout').closest('button')
    if (logoutButton) {
      await user.click(logoutButton)
    }

    expect(logoutButton).toBeDisabled()
    expect(screen.getByText('Logging out...')).toBeInTheDocument()
  })

  it('should handle logout error gracefully', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockSignOut.mockResolvedValueOnce({ error: { message: 'Logout failed' } })

    render(<AppSidebar />)

    const logoutButton = screen.getByText('Logout').closest('button')
    if (logoutButton) {
      await user.click(logoutButton)
    }

    expect(mockSignOut).toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error signing out:', { message: 'Logout failed' })
    
    // Should still redirect on logout error
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    consoleErrorSpy.mockRestore()
  })

  it('should handle logout network error', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockSignOut.mockRejectedValueOnce(new Error('Network error'))

    render(<AppSidebar />)

    const logoutButton = screen.getByText('Logout').closest('button')
    if (logoutButton) {
      await user.click(logoutButton)
    }

    expect(mockSignOut).toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error during logout:', expect.any(Error))
    
    // Should still redirect on network error
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    consoleErrorSpy.mockRestore()
  })

  it('should include sidebar separator', () => {
    render(<AppSidebar />)

    expect(screen.getByTestId('sidebar-separator')).toBeInTheDocument()
  })

  it('should render menu structure correctly', () => {
    render(<AppSidebar />)

    const sidebarMenus = screen.getAllByTestId('sidebar-menu')
    expect(sidebarMenus).toHaveLength(2) // Main menu and bottom menu

    const menuItems = screen.getAllByTestId('sidebar-menu-item')
    expect(menuItems).toHaveLength(7) // 5 main items + 2 bottom items
  })

  it('should have proper accessibility structure', () => {
    render(<AppSidebar />)

    // Check for navigation landmark
    const sidebar = screen.getByTestId('sidebar')
    expect(sidebar).toHaveAttribute('role', 'complementary')

    // Check for proper list structure
    const menus = screen.getAllByTestId('sidebar-menu')
    menus.forEach(menu => {
      expect(menu.tagName).toBe('UL')
    })

    const menuItems = screen.getAllByTestId('sidebar-menu-item')
    menuItems.forEach(item => {
      expect(item.tagName).toBe('LI')
    })
  })

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    const firstLink = screen.getByRole('link', { name: /dashboard/i })
    firstLink.focus()
    expect(firstLink).toHaveFocus()

    // Tab to next link
    await user.keyboard('[Tab]')
    const secondLink = screen.getByRole('link', { name: /clients/i })
    expect(secondLink).toHaveFocus()
  })

  it('should maintain consistent styling', () => {
    render(<AppSidebar />)

    // Check that all menu buttons have consistent structure
    const menuButtons = screen.getAllByTestId('sidebar-menu-button')
    menuButtons.forEach(button => {
      expect(button.tagName).toBe('BUTTON')
    })
  })

  it('should handle logo click navigation', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)

    const logoLink = screen.getByRole('link').closest('[href="/dashboard"]')
    expect(logoLink).toBeInTheDocument()
  })

  it('should show proper user initials in avatar fallback', () => {
    render(<AppSidebar />)

    const avatarFallback = screen.getByTestId('avatar-fallback')
    expect(avatarFallback).toHaveTextContent('U') // Default user initial
  })

  it('should be responsive and mobile-friendly', () => {
    render(<AppSidebar />)

    const sidebar = screen.getByTestId('sidebar')
    expect(sidebar).toHaveClass() // Should have appropriate responsive classes
  })

  it('should prevent double-click logout', async () => {
    const user = userEvent.setup()
    mockSignOut.mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => resolve({ error: null }), 50)
      })
    )

    render(<AppSidebar />)

    const logoutButton = screen.getByText('Logout').closest('button')
    if (logoutButton) {
      // Click logout multiple times quickly
      await user.click(logoutButton)
      await user.click(logoutButton)
      await user.click(logoutButton)
    }

    // Should only call signOut once
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('should maintain state during logout process', async () => {
    const user = userEvent.setup()
    mockSignOut.mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => resolve({ error: null }), 100)
      })
    )

    render(<AppSidebar />)

    const logoutButton = screen.getByText('Logout').closest('button')
    if (logoutButton) {
      await user.click(logoutButton)
    }

    // Button should be disabled and show loading text
    expect(logoutButton).toBeDisabled()
    expect(screen.getByText('Logging out...')).toBeInTheDocument()

    // Other navigation should still be available
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Clients')).toBeInTheDocument()
  })
})