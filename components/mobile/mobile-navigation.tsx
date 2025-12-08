'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Users, 
  Building2, 
  BarChart3, 
  MessageSquare, 
  Calendar,
  Settings,
  Menu,
  X,
  Phone,
  Mail,
  Plus,
  Bell
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Deals', href: '/deals', icon: Building2 },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const quickActions = [
  { name: 'Add Client', href: '/clients/new', icon: Users, color: 'bg-blue-500' },
  { name: 'Create Deal', href: '/deals/new', icon: Building2, color: 'bg-green-500' },
  { name: 'Schedule Call', href: '/calendar/new', icon: Phone, color: 'bg-purple-500' },
  { name: 'Send Message', href: '/messages/compose', icon: Mail, color: 'bg-orange-500' },
]

interface MobileNavigationProps {
  user?: {
    name: string
    email: string
    avatar?: string
  }
  notifications?: number
}

export function MobileNavigation({ user, notifications = 0 }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsOpen(false)
    setShowQuickActions(false)
  }, [pathname])

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              Dealvize
            </Link>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              className="relative p-2 text-gray-600 hover:text-gray-900"
              onClick={() => {/* Handle notifications */}}
            >
              <Bell className="h-6 w-6" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="flex-shrink-0 w-14 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <span className="text-xl font-bold text-blue-600">Dealvize</span>
              </div>
              
              {user && (
                <div className="mt-6 px-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">{user.name}</div>
                      <div className="text-sm font-medium text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </div>
              )}
              
              <nav className="mt-8 px-2">
                <div className="space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'group flex items-center px-2 py-3 text-base font-medium rounded-md',
                          active 
                            ? 'bg-blue-100 text-blue-900' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <Icon className={cn(
                          'mr-4 h-6 w-6',
                          active ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                        )} />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Bottom Sheet */}
      {showQuickActions && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowQuickActions(false)}
          />
          
          <div className="relative w-full bg-white rounded-t-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              <button
                onClick={() => setShowQuickActions(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.name}
                    href={action.href}
                    className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className={cn('p-3 rounded-full mb-2', action.color)}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{action.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
        <div className="grid grid-cols-4 gap-1">
          {navigation.slice(0, 4).map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-1 text-xs font-medium',
                  active 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className={cn(
                  'h-6 w-6 mb-1',
                  active ? 'text-blue-600' : 'text-gray-400'
                )} />
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
      
      {/* Bottom padding for main content */}
      <div className="lg:hidden h-16" />
    </>
  )
}