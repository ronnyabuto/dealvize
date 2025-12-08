import { IntegrationsHeader } from "@/components/layout/integrations-header"
import { IntegrationsContent } from "@/components/shared/integrations-content"

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <IntegrationsHeader />
      <main className="p-6">
        <IntegrationsContent />
      </main>
    </div>
  )
}
