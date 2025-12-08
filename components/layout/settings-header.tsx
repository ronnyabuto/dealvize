"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { GlobalSearch } from "./global-search"

export function SettingsHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        </div>
        <div className="w-80">
          <GlobalSearch />
        </div>
      </div>
    </header>
  )
}
