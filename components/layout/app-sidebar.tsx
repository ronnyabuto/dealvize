"use client"

import * as React from "react"
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
  Home, Users, Building, CheckSquare, BarChart3, Settings, HelpCircle,
  LogOut, Shield, Mail, Target, Crown, Building2, Share2, Zap
} from "lucide-react"
import { clientAuthUtils } from '@/lib/auth/client-utils'
import { usePathname } from 'next/navigation'
import Image from "next/image"
import Link from "next/link"

// Define menu items outside component to prevent re-creation
const MAIN_MENU_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Deals", url: "/deals", icon: Building },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Messages", url: "/messages", icon: Mail },
  { title: "Automation", url: "/automation", icon: Zap },
  { title: "Lead Scoring", url: "/lead-scoring", icon: Target },
  { title: "Reports", url: "/reports", icon: BarChart3 },
] as const

const BOTTOM_MENU_ITEMS = [
  { title: "MLS Settings", url: "/mls-settings", icon: Building2 },
  { title: "Partner Hub", url: "/affiliate", icon: Share2 },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Docs", url: "/docs", icon: HelpCircle },
] as const

interface SidebarUser {
  id: string
  name: string
  email: string
  role: string
  isSuperAdmin: boolean
  avatar?: string
}

export const AppSidebar = React.memo(function AppSidebar({ user }: { user?: SidebarUser }) {
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await clientAuthUtils.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      setIsLoggingOut(false)
    }
  }

  // Memoize auth checks to strictly prevent recalculation
  const isSuperAdmin = user?.isSuperAdmin
  const isAdminOrBroker = ['Admin', 'Broker', 'Owner'].includes(user?.role || '') && !isSuperAdmin

  return (
    <Sidebar className="bg-white border-r border-gray-100" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-transform hover:scale-105">
            <Image
              src="/icon.svg" // Use local SVG for instant load instead of remote URL
              alt="Logo"
              width={20}
              height={20}
              className="invert"
              priority // Prioritize loading logic
            />
          </div>
          <span className="text-lg font-bold text-gray-900 group-data-[collapsible=icon]:hidden transition-opacity duration-200">
            Dealvize
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2 scrollbar-thin scrollbar-thumb-gray-200">
        <SidebarMenu>
          {MAIN_MENU_ITEMS.map((item) => {
            const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`)
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className="w-full justify-start hover:bg-gray-100 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 transition-colors duration-200"
                >
                  <Link href={item.url} prefetch={true}>
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                    <span className="font-medium group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        <SidebarSeparator className="my-4 mx-2" />

        {/* Optimized Admin Sections */}
        {(isSuperAdmin || isAdminOrBroker) && (
          <>
            <div className="px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider group-data-[collapsible=icon]:hidden">
              Administration
            </div>
            <SidebarMenu>
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/super-admin')} tooltip="Super Admin">
                    <Link href="/super-admin" className="text-yellow-700 hover:bg-yellow-50">
                      <Crown className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">Super Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAdminOrBroker && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/admin')} tooltip="Admin">
                    <Link href="/admin">
                      <Shield className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
            <SidebarSeparator className="my-4 mx-2" />
          </>
        )}

        <SidebarMenu>
          {BOTTOM_MENU_ITEMS.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)} tooltip={item.title}>
                <Link href={item.url} prefetch={false}> {/* Defer prefetch for settings */}
                  <item.icon className="h-5 w-5 text-gray-500" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-8 w-8 border-2 border-white shadow-sm cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden transition-all">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{user?.role || 'Agent'}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-600 group-data-[collapsible=icon]:hidden"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
})