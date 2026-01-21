import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dealvize CRM - Real Estate Management Platform',
    short_name: 'Dealvize CRM',
    description: 'Streamline your real estate business with Dealvize CRM. Manage clients, track deals, organize tasks, and close more sales.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity', 'finance'],
    lang: 'en-US',
    scope: '/',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'View your CRM dashboard',
        url: '/dashboard',
        icons: [
          {
            src: '/shortcut-dashboard-96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Clients',
        short_name: 'Clients',
        description: 'Manage your clients',
        url: '/clients',
        icons: [
          {
            src: '/shortcut-clients-96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Deals',
        short_name: 'Deals',
        description: 'Track your deals',
        url: '/deals',
        icons: [
          {
            src: '/shortcut-deals-96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Tasks',
        short_name: 'Tasks',
        description: 'Manage your tasks',
        url: '/tasks',
        icons: [
          {
            src: '/shortcut-tasks-96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  } as any
}