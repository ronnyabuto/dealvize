import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../globals.css"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { CSRFTokenMeta } from "@/components/shared/csrf-token-meta"
import { PopupMessageProvider } from "@/contexts/popup-message-context"
import { RBACProvider } from "@/lib/rbac/context"
import { EnhancedFloatingChat } from "@/components/features/messaging/enhanced-floating-chat"
import { MobileFAB } from "@/components/mobile/mobile-fab"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { getUser } from '@/lib/auth/utils'
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch user server-side once for the entire layout
  const user = await getUser()

  const sidebarUser = user ? {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin || false,
    avatar: user.avatar
  } : undefined

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0F172A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.className} bg-gray-50/50`} suppressHydrationWarning={true}>
        <ErrorBoundary>
          <RBACProvider>
            <PopupMessageProvider>
              {/* Sidebar Provider manages state via cookies for instant render */}
              <SidebarProvider defaultOpen={true}>
                {/* The Sidebar lives here now - it will never unmount */}
                <AppSidebar user={sidebarUser} />

                {/* Main Content Area - All pages render inside this */}
                <SidebarInset className="flex flex-col flex-1 h-screen overflow-hidden">
                  {children}
                </SidebarInset>

                <Toaster />
                <EnhancedFloatingChat />
                <MobileFAB />
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