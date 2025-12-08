"use client"

// Clean Sidebar Implementation
// Minimal client-side logic, server-driven data

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  Home, 
  Users, 
  Building, 
  CheckSquare, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  LogOut,
  Shield,
  Database,
  Mail,
  Target,
  Crown,
  Building2,
  Share2
} from "lucide-react"
import { clientAuthUtils } from '@/lib/auth/client-utils'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from "next/image"
import Link from "next/link"

const MAIN_MENU_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Deals", url: "/deals", icon: Building },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Messages", url: "/messages", icon: Mail },
  { title: "Lead Scoring", url: "/lead-scoring", icon: Target },
  { title: "Reports", url: "/reports", icon: BarChart3 },
]

const BOTTOM_MENU_ITEMS = [
  { title: "MLS Settings", url: "/mls-settings", icon: Building2 },
  { title: "Partner Hub", url: "/affiliate", icon: Share2 },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Docs", url: "/docs", icon: HelpCircle },
]

interface SidebarUser {
  id: string
  name: string
  email: string
  role: string
  isSuperAdmin: boolean
}

interface AppSidebarProps {
  user?: SidebarUser
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await clientAuthUtils.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <Sidebar className="bg-dealvize-sidebar border-r-0" variant="sidebar">
      <SidebarHeader className="p-3 sm:p-4 bg-dealvize-sidebar">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-dealvize-teal rounded-lg flex items-center justify-center flex-shrink-0">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-DQGQFiDau4o2hnDec2WcY3fv8SJ4K7.png"
              alt="Dealvize Logo"
              width={20}
              height={20}
              className="invert sm:w-6 sm:h-6"
            />
          </div>
          <span className="text-lg sm:text-xl font-bold text-dealvize-sidebar-foreground truncate">
            Dealvize
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 bg-dealvize-sidebar">
        <SidebarMenu>
          {MAIN_MENU_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.url)
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className="w-full justify-start text-dealvize-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-dealvize-teal data-[active=true]:text-white"
                >
                  <Link href={item.url} className="flex items-center gap-3 px-3 py-3 min-h-[44px] touch-manipulation">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        <SidebarSeparator className="my-4 bg-sidebar-border" />

        {/* Super Admin Menu - Show only if user is super admin */}
        {user?.isSuperAdmin && (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/super-admin')}
                  className="w-full justify-start text-dealvize-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-yellow-600 data-[active=true]:text-white"
                >
                  <Link href="/super-admin" className="flex items-center gap-3 px-3 py-3 min-h-[44px] touch-manipulation">
                    <Crown className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Super Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator className="my-4 bg-sidebar-border" />
          </>
        )}

        {/* Regular Admin Menu - Show only if user is admin but not super admin */}
        {user?.role === 'Admin' && !user.isSuperAdmin && (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/admin')}
                  className="w-full justify-start text-dealvize-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-dealvize-teal data-[active=true]:text-white"
                >
                  <Link href="/admin" className="flex items-center gap-3 px-3 py-3 min-h-[44px] touch-manipulation">
                    <Shield className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator className="my-4 bg-sidebar-border" />
          </>
        )}

        <SidebarMenu>
          {BOTTOM_MENU_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.url)
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className="w-full justify-start text-dealvize-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-dealvize-teal data-[active=true]:text-white"
                >
                  <Link href={item.url} className="flex items-center gap-3 px-3 py-3 min-h-[44px] touch-manipulation">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3 sm:p-4 bg-dealvize-sidebar space-y-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
            <AvatarImage src={user?.avatar || "/placeholder.svg?height=32&width=32"} />
            <AvatarFallback className="bg-dealvize-teal text-white text-xs sm:text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-dealvize-sidebar-foreground truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-400">
              {user?.isSuperAdmin ? 'Super Admin' : user?.role || 'User'}
            </p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-dealvize-sidebar-foreground hover:bg-sidebar-accent h-10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}