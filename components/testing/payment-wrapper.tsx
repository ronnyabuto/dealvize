"use client"

// Payment Wrapper - Testing Mode Support
// Conditionally renders payment components based on testing mode

import { featureFlags } from '@/lib/config/feature-flags'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { TestTube } from 'lucide-react'

interface PaymentWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showTestingBadge?: boolean
}

export function PaymentWrapper({ 
  children, 
  fallback, 
  showTestingBadge = true 
}: PaymentWrapperProps) {
  
  if (featureFlags.enableFreeTesting) {
    return (
      <div className="space-y-4">
        {showTestingBadge && (
          <Alert className="border-blue-200 bg-blue-50">
            <TestTube className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-100">Testing Mode</Badge>
                Payment requirements bypassed - all features available
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {fallback || (
          <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500">
            Payment component hidden during testing phase
          </div>
        )}
      </div>
    )
  }

  return <>{children}</>
}

// Usage in components:
// <PaymentWrapper>
//   <StripeCheckout />
// </PaymentWrapper>