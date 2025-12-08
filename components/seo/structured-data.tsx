'use client'

import { generateOrganizationSchema, generateWebsiteSchema, generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/metadata'

interface StructuredDataProps {
  type?: 'organization' | 'website' | 'breadcrumb' | 'article'
  breadcrumbs?: BreadcrumbItem[]
  article?: {
    headline: string
    author: string
    datePublished: string
    dateModified?: string
    image?: string
    description: string
  }
}

export function StructuredData({ type = 'website', breadcrumbs, article }: StructuredDataProps) {
  const getSchemaData = () => {
    switch (type) {
      case 'organization':
        return generateOrganizationSchema()
      case 'website':
        return generateWebsiteSchema()
      case 'breadcrumb':
        return breadcrumbs ? generateBreadcrumbSchema(breadcrumbs) : null
      case 'article':
        if (!article) return null
        return {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.headline,
          description: article.description,
          author: {
            '@type': 'Person',
            name: article.author,
          },
          publisher: {
            '@type': 'Organization',
            name: 'Dealvize',
            logo: {
              '@type': 'ImageObject',
              url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dealvize.com'}/logo.png`,
            },
          },
          datePublished: article.datePublished,
          dateModified: article.dateModified || article.datePublished,
          image: article.image,
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': typeof window !== 'undefined' ? window.location.href : '',
          },
        }
      default:
        return generateWebsiteSchema()
    }
  }

  const schemaData = getSchemaData()

  if (!schemaData) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schemaData),
      }}
    />
  )
}

export function SEOBreadcrumbs({ breadcrumbs }: { breadcrumbs: BreadcrumbItem[] }) {
  return (
    <>
      <StructuredData type="breadcrumb" breadcrumbs={breadcrumbs} />
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-4">
          {breadcrumbs.map((item, index) => (
            <li key={index}>
              <div className="flex items-center">
                {index > 0 && (
                  <svg
                    className="flex-shrink-0 h-5 w-5 text-gray-300"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                  </svg>
                )}
                {item.href ? (
                  <a
                    href={item.href}
                    className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                    aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
                  >
                    {item.name}
                  </a>
                ) : (
                  <span className="ml-4 text-sm font-medium text-gray-500" aria-current="page">
                    {item.name}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}