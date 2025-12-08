import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { SettingsHeader } from "@/components/settings-header"
import { SettingsContent } from "@/components/settings-content"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"

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
