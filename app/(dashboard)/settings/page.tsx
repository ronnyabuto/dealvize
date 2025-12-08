import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SettingsHeader } from "@/components/layout/settings-header"
import { SettingsContent } from "@/components/shared/settings-content"
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav"

export default function SettingsPage() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <SettingsHeader />
          <main className="p-6">
            <BreadcrumbNav />
            <SettingsContent />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
