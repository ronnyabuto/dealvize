'use client'

import { Plus, Phone, FileText, UserPlus, Building2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface MobileFABProps {
  className?: string
}

/**
 * Mobile Floating Action Button (FAB) for one-thumb interactions
 * Positioned in the bottom-right "thumb zone" for easy mobile access
 */
export function MobileFAB({ className }: MobileFABProps) {
  const router = useRouter()

  const quickActions = [
    {
      icon: UserPlus,
      label: 'New Lead',
      description: 'Add a new client',
      href: '/clients/new',
      color: 'text-blue-600'
    },
    {
      icon: Building2,
      label: 'New Deal',
      description: 'Create a deal',
      href: '/deals/new',
      color: 'text-green-600'
    },
    {
      icon: FileText,
      label: 'Log Note',
      description: 'Quick note',
      href: '/notes/new',
      color: 'text-purple-600'
    },
    {
      icon: Phone,
      label: 'Log Call',
      description: 'Record call',
      href: '/communication?action=log-call',
      color: 'text-orange-600'
    },
  ]

  return (
    <div className={cn("fixed bottom-6 right-6 lg:hidden z-50", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="bg-dealvize-teal h-14 w-14 rounded-full shadow-lg shadow-teal-500/30 flex items-center justify-center text-white hover:bg-dealvize-teal-dark transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-dealvize-teal focus:ring-offset-2"
            aria-label="Quick actions"
          >
            <Plus className="h-6 w-6" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          className="mb-2 w-56 animate-in slide-in-from-bottom-2"
        >
          <div className="px-2 py-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Quick Actions
            </p>
          </div>
          <DropdownMenuSeparator />
          {quickActions.map((action, index) => (
            <DropdownMenuItem
              key={action.label}
              className="py-3 cursor-pointer focus:bg-gray-100 transition-colors"
              onClick={() => router.push(action.href)}
            >
              <action.icon className={cn("mr-3 h-5 w-5", action.color)} />
              <div className="flex flex-col">
                <span className="font-medium text-sm">{action.label}</span>
                <span className="text-xs text-gray-500">{action.description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
