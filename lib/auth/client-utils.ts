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

      if (!response.ok) {
        console.error('Server signout failed:', await response.text())
      }

      // Also clear client-side session as fallback
      const supabase = createBrowserClient()
      await supabase.auth.signOut()

      // Force reload to clear any cached state
      window.location.href = '/auth/signin'
    } catch (error) {
      console.error('Signout error:', error)
      // Fallback: still try to redirect user
      window.location.href = '/auth/signin'
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