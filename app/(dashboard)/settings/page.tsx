import { SettingsHeader } from "@/components/layout/settings-header"
import { SettingsContent } from "@/components/shared/settings-content"
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <SettingsHeader />
      <main className="p-6">
        <BreadcrumbNav />
        <SettingsContent />
      </main>
    </div>
  )
}
