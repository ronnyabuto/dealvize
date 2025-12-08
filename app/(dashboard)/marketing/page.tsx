import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { MarketingHeader } from "@/components/layout/marketing-header"
import { MarketingContent } from "@/components/marketing-content"

export default function MarketingPage() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gray-50">
          <MarketingHeader />
          <main className="p-6">
            <MarketingContent />
          </main>
        </div>
      </SidebarInset>
    </>
  )
}
