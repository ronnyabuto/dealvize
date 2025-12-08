import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { CSRFTokenMeta } from "@/components/shared/csrf-token-meta"
import { PopupMessageProvider } from "@/contexts/popup-message-context"
import { RBACProvider } from "@/lib/rbac/context"
import { EnhancedFloatingChat } from "@/components/features/messaging/enhanced-floating-chat"
import Script from "next/script"

// Load font with swap to ensure text visibility immediately
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: "Dashboard - Dealvize CRM",
  description: "Manage your real estate deals, clients, and pipeline",
  robots: "noindex, nofollow",
}

export const dynamic = 'force-dynamic'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <CSRFTokenMeta />
        {/* Only keep essential preconnects */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Removed aggressive prefetching to reduce network contention */}
        
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" /> 
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.className} bg-gray-50`} suppressHydrationWarning={true}>
        {/* Simple top-level error boundary */}
        <ErrorBoundary>
          <RBACProvider>
            <PopupMessageProvider>
              {/* Sidebar Provider manages state via cookies for instant render */}
              <SidebarProvider defaultOpen={true}>
                {children}
                <Toaster />
                <EnhancedFloatingChat />
              </SidebarProvider>
            </PopupMessageProvider>
          </RBACProvider>
        </ErrorBoundary>
        
        <Script
          id="sw-registration"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(console.error);
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}