'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsProfilePage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to main settings page since profile settings are there
    router.replace('/settings')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dealvize-teal mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting to settings...</p>
      </div>
    </div>
  )
}