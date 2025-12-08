"use client"

import { useState } from "react"
import { Calendar, User, LogOut, Settings, Bell, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { GlobalSearch } from "@/components/shared/global-search"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { clientAuthUtils } from "@/lib/auth/client-utils"
import { type User } from "@/lib/types"

interface DashboardHeaderProps {
  user?: User
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleCalendarClick = () => {
    window.location.href = '/calendar'
  }

  const handleSettingsClick = () => {
    window.location.href = '/settings'
  }

  const handleProfileClick = () => {
    window.location.href = '/settings/profile'
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await clientAuthUtils.signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <SidebarTrigger />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Dashboard</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex-1 sm:flex-none sm:w-64 lg:w-80">
            <GlobalSearch />
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="hidden sm:flex"
            onClick={handleCalendarClick}
          >
            <Calendar className="h-4 w-4 mr-2" />
            <span className="hidden lg:inline">Today</span>
          </Button>

          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || ""} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleProfileClick}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSettingsClick}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
