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
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: "Dashboard - Dealvize CRM",
  description: "Manage your real estate deals, clients, and pipeline",
  robots: "noindex, nofollow", // Private dashboard pages shouldn't be indexed
}

// Force dynamic rendering for all dashboard routes
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Authentication is handled by middleware, so we can safely assume user is authenticated here
  // No need to check auth again as middleware already handles redirects

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <CSRFTokenMeta />
        {/* Critical Resource Preloading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//vercel.app" />
        <link rel="dns-prefetch" href="//supabase.co" />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
        
        {/* Critical route prefetching */}
        <link rel="prefetch" href="/clients" />
        <link rel="prefetch" href="/deals" />
        <link rel="prefetch" href="/tasks" />
        <link rel="prefetch" href="/calendar" />
        
        {/* Critical API route warming */}
        <link rel="prefetch" href="/api/clients" />
        <link rel="prefetch" href="/api/dashboard/metrics" />
        
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Dealvize" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Dealvize" />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <ErrorBoundary>
          <RBACProvider>
            <PopupMessageProvider>
              <SidebarProvider defaultOpen={true}>
                {children}
                <Toaster />
                <EnhancedFloatingChat />
              </SidebarProvider>
            </PopupMessageProvider>
          </RBACProvider>
        </ErrorBoundary>
        
        {/* Service Worker Registration */}
        <Script
          id="sw-registration"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
        
        {/* Performance monitoring */}
        <Script
          id="performance-monitor"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize performance monitoring if available
              if (typeof window !== 'undefined' && 'performance' in window) {
                console.log('Performance monitoring initialized');
              }
            `,
          }}
        />
      </body>
    </html>
  )
}