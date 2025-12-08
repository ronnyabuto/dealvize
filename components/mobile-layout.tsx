"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { AppSidebar } from '@/components/app-sidebar'
import { PWAInstallPrompt, PWAStatus } from '@/components/pwa-install-prompt'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, 
  Home, 
  Users, 
  Building, 
  CheckSquare, 
  Mail,
  Target,
  BarChart3,
  Search,
  Bell,
  Settings,
  Plus
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MobileLayoutProps {
  children: React.ReactNode
}

const mobileNavItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/clients', icon: Users, label: 'Clients' },
  { href: '/deals', icon: Building, label: 'Deals' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/messages', icon: Mail, label: 'Messages' },
]

const quickActions = [
  { href: '/clients/new', icon: Users, label: 'Add Client', color: 'bg-blue-500' },
  { href: '/deals/new', icon: Building, label: 'New Deal', color: 'bg-green-500' },
  { href: '/tasks/new', icon: CheckSquare, label: 'Add Task', color: 'bg-orange-500' },
  { href: '/messages/compose', icon: Mail, label: 'Send Message', color: 'bg-purple-500' },
]

export function MobileLayout({ children }: MobileLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [notifications, setNotifications] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Mock notification count (would be real data in production)
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(Math.floor(Math.random() * 5))
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Mobile Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <AppSidebar />
              </SheetContent>
            </Sheet>
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="font-bold text-lg">Dealvize</span>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            <PWAStatus />
            <Button variant="ghost" size="icon" className="relative">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                  {notifications}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Floating Action Button */}
      <Sheet open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
        <SheetTrigger asChild>
          <Button 
            size="icon"
            className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto">
          <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={() => setIsQuickActionsOpen(false)}
                  className="flex flex-col items-center p-4 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center mb-2`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-center">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <div className="flex justify-around items-center h-16 px-2">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center space-y-1 px-3 py-2 rounded-lg transition-colors min-w-0 ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Swipe Gestures Helper */}
      <div className="hidden">
        {/* This helps with PWA swipe gestures */}
        <div 
          className="touch-none"
          style={{
            touchAction: 'pan-y',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        />
      </div>
    </div>
  )
}

// Hook for detecting mobile viewport
export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

// Mobile-optimized card component
export function MobileCard({ 
  children, 
  className = "",
  padding = "p-4" 
}: { 
  children: React.ReactNode
  className?: string
  padding?: string
}) {
  return (
    <div className={`bg-background border rounded-lg ${padding} ${className}`}>
      {children}
    </div>
  )
}

// Mobile-optimized list item
export function MobileListItem({
  title,
  subtitle,
  value,
  status,
  onClick,
  className = ""
}: {
  title: string
  subtitle?: string
  value?: string
  status?: string
  onClick?: () => void
  className?: string
}) {
  return (
    <div 
      className={`flex items-center justify-between p-4 border-b last:border-b-0 ${
        onClick ? 'cursor-pointer hover:bg-muted/50' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm truncate">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center space-x-2 ml-4">
        {status && (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        )}
        {value && (
          <span className="text-sm font-medium">{value}</span>
        )}
      </div>
    </div>
  )
}