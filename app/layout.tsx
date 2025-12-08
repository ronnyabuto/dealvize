import type React from "react"
import type { Metadata, Viewport } from "next"
import { ErrorBoundary } from '@/components/error-boundary'

// This root layout is now just a fallback
// The actual layouts are in the route groups: (marketing) and (dashboard)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}