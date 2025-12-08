'use client'

import { useEffect, useState } from 'react'

/**
 * Component to inject CSRF token into page meta for client-side requests
 */
export function CSRFTokenMeta() {
  const [csrfToken, setCSRFToken] = useState<string>('')

  useEffect(() => {
    // Get CSRF token from client-readable cookie
    const getCookie = (name: string): string | undefined => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift()
      }
    }

    const token = getCookie('csrf-token-client')
    if (token) {
      setCSRFToken(token)
    }
  }, [])

  if (!csrfToken) {
    return null
  }

  return (
    <meta name="csrf-token" content={csrfToken} />
  )
}

/**
 * Hook to get CSRF token for API requests
 */
export function useCSRFToken(): string {
  const [csrfToken, setCSRFToken] = useState<string>('')

  useEffect(() => {
    // Try to get from meta tag first
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (metaToken) {
      setCSRFToken(metaToken)
      return
    }

    // Fallback to cookie
    const getCookie = (name: string): string | undefined => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift()
      }
    }

    const cookieToken = getCookie('csrf-token-client')
    if (cookieToken) {
      setCSRFToken(cookieToken)
    }
  }, [])

  return csrfToken
}