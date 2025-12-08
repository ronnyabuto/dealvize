import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "../globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/error-boundary"
import { PopupMessageProvider } from "@/contexts/popup-message-context"
import { StructuredData } from "@/components/seo/structured-data"
import { baseMetadata } from "@/lib/seo/metadata"
import { SiteFooter } from "@/components/site-footer"

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
    <html lang="en" className={inter.variable}>
      <head>
        <StructuredData type="organization" />
        <StructuredData type="website" />
        
        {/* Additional SEO and performance meta tags */}
        <meta name="format-detection" content="telephone=no, email=no, address=no" />
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        <meta name="referrer" content="origin-when-cross-origin" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Dealvize CRM" />
        
        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <ErrorBoundary>
          <PopupMessageProvider>
            {children}
            <SiteFooter />
            <Toaster />
          </PopupMessageProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}