"use client"

import { Search, Plus, Zap } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function IntegrationsHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search integrations..." className="pl-10 w-80" />
          </div>

          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Browse All
          </Button>

          <Button className="bg-dealvize-teal hover:bg-dealvize-teal-dark text-white">
            <Plus className="h-4 w-4 mr-2" />
            Request Integration
          </Button>
        </div>
      </div>
    </header>
  )
}
