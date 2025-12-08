import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealvize.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/auth/signin',
          '/auth/signup', 
          '/blog',
          '/blog/*',
          '/pricing',
          '/features',
          '/about',
          '/contact',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/clients',
          '/clients/*',
          '/deals',
          '/deals/*',
          '/tasks',
          '/tasks/*',
          '/settings',
          '/settings/*',
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
          '*.json$',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/auth/signin',
          '/auth/signup',
          '/blog',
          '/blog/*',
          '/pricing',
          '/features',
          '/about',
          '/contact',
          '/privacy',
          '/terms',
          '/docs', // Allow docs for better API discoverability
        ],
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/clients',
          '/clients/*',
          '/deals',
          '/deals/*',
          '/tasks',
          '/tasks/*',
          '/settings',
          '/settings/*',
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
        ],
        crawlDelay: 1,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}