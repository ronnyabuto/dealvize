"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MoreHorizontal, Edit, Plus, Download, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useDeals } from "@/hooks/use-deals"
import { type Deal } from "@/lib/types"

interface DealDetailHeaderProps {
  deal: Deal
}

export function DealDetailHeader({ deal }: DealDetailHeaderProps) {
  const router = useRouter()
  const { deleteDeal } = useDeals()
  const [deleting, setDeleting] = useState(false)

  const handleEditDeal = () => {
    router.push(`/deals/edit/${deal.id}`)
  }

  const handleAddTask = () => {
    router.push(`/tasks/new?deal=${deal.id}`)
  }

  const handleExportData = () => {
    alert('Export functionality will be implemented soon!')
  }

  const handleDeleteDeal = async () => {
    if (!confirm(`Are you sure you want to delete "${deal.title}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    const success = await deleteDeal(deal.id)
    
    if (success) {
      router.push('/deals')
    } else {
      alert('Failed to delete deal. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <Button variant="ghost" size="sm" asChild>
            <a href="/deals" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Deals
            </a>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Deal Info Summary */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h2 className="font-semibold text-lg">{deal.title}</h2>
              <div className="flex items-center gap-2">
                <Badge className={deal.statusColor} variant="secondary">
                  {deal.status}
                </Badge>
                <span className="text-sm text-gray-500">
                  Value: {deal.value}
                </span>
                <span className="text-sm text-gray-500">
                  {deal.probability}% probability
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={deleting}>
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditDeal}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Deal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddTask}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600" 
                onClick={handleDeleteDeal}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Deal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}