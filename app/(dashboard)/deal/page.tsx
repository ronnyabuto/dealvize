'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function DealRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/deals')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Redirecting to deals...</p>
    </div>
  )
}