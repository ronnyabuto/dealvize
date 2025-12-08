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
  { title: "Pipeline", url: "/deals/pipeline", icon: BarChart3 },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Messages", url: "/messages", icon: Mail },
  { title: "Automation", url: "/automation", icon: Zap },
] as const

const ANALYTICS_MENU_ITEMS = [
  { title: "Lead Scoring", url: "/lead-scoring", icon: Target },
  { title: "Reports", url: "/reports", icon: BarChart3 },
] as const

const BOTTOM_MENU_ITEMS = [
  { title: "MLS Settings", url: "/mls-settings", icon: Building2 },
  { title: "Settings", url: "/settings", icon: Settings },
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
    <Sidebar variant="sidebar" collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center w-full transition-all">
          <div className="flex items-center justify-center flex-shrink-0">
            <Image
              src="/icon.svg"
              alt="Dealvize"
              width={28}
              height={28}
              className="w-7 h-7"
              priority
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden transition-opacity duration-200">
            Dealvize
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 gap-4 scrollbar-hide">
        {/* Main Section */}
        <SidebarMenu>
          {MAIN_MENU_ITEMS.map((item) => {
            const isActive = pathname === item.url || (pathname.startsWith(item.url) && pathname !== '/' && item.url !== '/dashboard')
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className="h-9 transition-all hover:translate-x-1 duration-200"
                  data-active={isActive}
                >
                  <Link href={item.url} className={isActive ? "bg-sidebar-accent" : ""}>
                    <item.icon className={isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"} />
                    <span className={isActive ? "font-semibold text-sidebar-foreground" : "text-sidebar-foreground/80"}>
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        {/* Analytics Section - Grouping for clarity */}
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="px-2 mb-2 mt-4 text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest">
            Intelligence
          </div>
          <SidebarMenu>
            {ANALYTICS_MENU_ITEMS.map((item) => {
              const isActive = pathname === item.url
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="h-9 hover:translate-x-1 transition-all">
                    <Link href={item.url}>
                      <item.icon className={isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </div>

        {/* Admin Section */}
        {(isSuperAdmin || isAdminOrBroker) && (
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="px-2 mb-2 mt-4 text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest">
              Admin
            </div>
            <SidebarMenu>
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/super-admin')} tooltip="Super Admin" className="h-9">
                    <Link href="/super-admin" className="text-amber-400 hover:text-amber-300">
                      <Crown className="h-4 w-4" />
                      <span>Super Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAdminOrBroker && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/admin')} tooltip="Admin" className="h-9">
                    <Link href="/admin">
                      <Shield className="h-4 w-4" />
                      <span>Administration</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </div>
        )}

        <div className="mt-auto">
          <SidebarSeparator className="my-2 opacity-50" />
          <SidebarMenu>
            {BOTTOM_MENU_ITEMS.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)} tooltip={item.title} className="h-9">
                  <Link href={item.url}>
                    <item.icon className="h-4 w-4 text-sidebar-foreground/60" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border bg-sidebar-accent/10">
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-8 w-8 border border-sidebar-border shadow-sm cursor-pointer hover:ring-2 hover:ring-sidebar-primary transition-all">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name || 'User'}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate uppercase tracking-wider">{user?.role || 'Agent'}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-900/20 group-data-[collapsible=icon]:hidden"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="h-3 w-3" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
})
