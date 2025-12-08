import { MarketingHeader } from "@/components/layout/marketing-header"
import { MarketingContent } from "@/components/shared/marketing-content"

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      <MarketingHeader />
      <main className="p-6">
        <MarketingContent />
      </main>
    </div>
  )
}
