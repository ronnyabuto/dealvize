import { createClient as createBrowserClient } from '@/lib/supabase/client'

// Helper to get CSRF token from client-readable cookie
function getCSRFToken(): string | null {
  // Read from the client-accessible cookie (double-submit pattern)
  const cookies = document.cookie.split(';')
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf-token-client') {
      return decodeURIComponent(value)
    }
  }
  return null
}

export const clientAuthUtils = {
  signOut: async () => {
    try {
      const csrfToken = getCSRFToken()

      // Call server-side signout API to ensure proper session cleanup
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'x-csrf-token': csrfToken })
        }
      })

      // Don't block on API response - continue with client-side cleanup
      if (!response.ok) {
        console.warn('Server signout returned error, continuing with client cleanup')
      }

      // Clear client-side session
      const supabase = createBrowserClient()
      await supabase.auth.signOut()

      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Clear localStorage items related to auth
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key)
          }
        })

        // Force hard redirect using replace to prevent back button issues
        window.location.replace('/auth/signin')
      }
    } catch (error) {
      console.error('Signout error:', error)
      // Fallback: force redirect regardless of error
      if (typeof window !== 'undefined') {
        window.location.replace('/auth/signin')
      }
    }
  },

  getCurrentUser: async () => {
    const supabase = createBrowserClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    return error ? null : user
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const supabase = createBrowserClient()
    return supabase.auth.onAuthStateChange(callback)
  }
}