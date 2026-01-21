// SEO metadata utilities and configurations
import { Metadata } from 'next'

// Base metadata configuration
export const baseMetadata: Metadata = {
  title: {
    template: '%s | Dealvize CRM',
    default: 'Dealvize CRM - Real Estate Customer Relationship Management'
  },
  description: 'Streamline your real estate business with Dealvize CRM. Manage clients, track deals, organize tasks, and close more sales with our comprehensive real estate management platform.',
  keywords: [
    'real estate CRM',
    'customer relationship management',
    'property management',
    'lead management',
    'deal tracking',
    'real estate software',
    'sales pipeline',
    'client management',
    'property deals',
    'real estate tools'
  ],
  authors: [{ name: 'Dealvize Team' }],
  creator: 'Dealvize',
  publisher: 'Dealvize',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://dealvize.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Dealvize CRM - Real Estate Customer Relationship Management',
    description: 'Streamline your real estate business with Dealvize CRM. Manage clients, track deals, organize tasks, and close more sales.',
    siteName: 'Dealvize CRM',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Dealvize CRM - Real Estate Management Platform',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dealvize CRM - Real Estate Customer Relationship Management',
    description: 'Streamline your real estate business with Dealvize CRM. Manage clients, track deals, organize tasks, and close more sales.',
    images: ['/twitter-image.png'],
    creator: '@dealvize',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    yahoo: process.env.YAHOO_SITE_VERIFICATION,
  },
}

// Generate page-specific metadata
export function generatePageMetadata({
  title,
  description,
  path = '',
  image,
  noIndex = false,
}: {
  title?: string
  description?: string
  path?: string
  image?: string
  noIndex?: boolean
}): Metadata {
  const fullTitle = title ? `${title} | Dealvize CRM` : 'Dealvize CRM - Real Estate Customer Relationship Management'
  const fullDescription = description || baseMetadata.description
  const fullUrl = `${baseMetadata.metadataBase}${path}`
  
  return {
    title: fullTitle,
    description: fullDescription ?? undefined,
    alternates: {
      canonical: path || '/',
    },
    openGraph: {
      ...baseMetadata.openGraph,
      title: fullTitle,
      description: fullDescription ?? undefined,
      url: fullUrl,
      images: image ? [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: fullTitle,
        }
      ] : baseMetadata.openGraph?.images,
    },
    twitter: {
      ...baseMetadata.twitter,
      title: fullTitle,
      description: fullDescription ?? undefined,
      images: image ? [image] : baseMetadata.twitter?.images,
    },
    robots: noIndex ? {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    } : baseMetadata.robots,
  }
}

// SEO-friendly URL generation
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
}

// Breadcrumb generation
export interface BreadcrumbItem {
  name: string
  href?: string
}

export function generateBreadcrumbs(path: string): BreadcrumbItem[] {
  const segments = path.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [{ name: 'Home', href: '/' }]
  
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1
    
    // Convert segment to readable name
    const name = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    breadcrumbs.push({
      name,
      href: isLast ? undefined : currentPath,
    })
  })
  
  return breadcrumbs
}

// Schema.org structured data
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Dealvize CRM',
    description: 'Real Estate Customer Relationship Management platform for managing clients, deals, and sales pipeline.',
    url: baseMetadata.metadataBase?.toString(),
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      priceValidUntil: '2025-12-31',
    },
    author: {
      '@type': 'Organization',
      name: 'Dealvize',
      url: baseMetadata.metadataBase?.toString(),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Dealvize',
      url: baseMetadata.metadataBase?.toString(),
    },
    screenshot: `${baseMetadata.metadataBase}/og-image.png`,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'Client Management',
      'Deal Tracking',
      'Task Management',
      'Sales Pipeline',
      'Performance Analytics',
      'Real Estate Tools',
    ],
  }
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Dealvize CRM',
    description: baseMetadata.description,
    url: baseMetadata.metadataBase?.toString(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseMetadata.metadataBase}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Dealvize',
      url: baseMetadata.metadataBase?.toString(),
    },
  }
}

export function generateBreadcrumbSchema(breadcrumbs: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.href ? `${baseMetadata.metadataBase}${item.href}` : undefined,
    })),
  }
}

// Page performance and Core Web Vitals optimization
export const seoConfig = {
  // Image optimization settings
  imageOptimization: {
    formats: ['avif', 'webp'],
    quality: 85,
    sizes: {
      mobile: 375,
      tablet: 768,
      desktop: 1200,
    },
  },
  
  // Cache headers for static assets
  cacheHeaders: {
    static: 'public, max-age=31536000, immutable',
    dynamic: 'public, max-age=300, s-maxage=3600',
    api: 'public, max-age=60, s-maxage=300',
  },
  
  // Critical CSS and resource hints
  criticalResources: [
    '/fonts/inter-var.woff2',
    '/css/critical.css',
  ],
  
  // Preconnect to external domains
  preconnectDomains: [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ],
}