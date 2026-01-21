import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please add it to your Vercel environment variables.'
    )
  }
  return url
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please add it to your Vercel environment variables.'
    )
  }
  return key
}

function getSupabaseServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'Please add it to your Vercel environment variables.'
    )
  }
  return key
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: any) {
          try {
            cookiesToSet.forEach(({ name, value, options }: any) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export function createServiceClient() {
  return createServerClient(
    getSupabaseUrl(),
    getSupabaseServiceKey(),
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // Service client doesn't need cookies
        },
      },
    }
  )
}