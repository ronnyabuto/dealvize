import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { IntegrationsHeader } from "@/components/integrations-header"
import { IntegrationsContent } from "@/components/integrations-content"

export default function IntegrationsPage() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <IntegrationsHeader />
          <main className="p-6">
            <IntegrationsContent />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
