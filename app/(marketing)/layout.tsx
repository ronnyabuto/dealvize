import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "../globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { PopupMessageProvider } from "@/contexts/popup-message-context"
import { StructuredData } from "@/components/seo/structured-data"
import { baseMetadata } from "@/lib/seo/metadata"
import { SiteFooter } from "@/components/layout/site-footer"

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

export const metadata: Metadata = baseMetadata

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' }
  ],
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <StructuredData type="organization" />
      <StructuredData type="website" />
      <ErrorBoundary>
        <PopupMessageProvider>
          {children}
          <SiteFooter />
          <Toaster />
        </PopupMessageProvider>
      </ErrorBoundary>
    </>
  )
}