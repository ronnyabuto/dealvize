import { SimpleBilling } from "@/components/billing-simple"

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SimpleBilling />
      </div>
    </div>
  )
}