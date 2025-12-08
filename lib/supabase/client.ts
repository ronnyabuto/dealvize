import { createBrowserClient } from '@supabase/ssr'

function validateEnvironmentVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please check your .env.local file and ensure it contains a valid Supabase URL.'
    )
  }

  if (!supabaseKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please check your .env.local file and ensure it contains a valid Supabase anonymous key.'
    )
  }

  // Basic URL format validation
  if (!supabaseUrl.startsWith('https://') && !supabaseUrl.startsWith('http://')) {
    throw new Error(
      'Invalid NEXT_PUBLIC_SUPABASE_URL format. ' +
      'URL must start with https:// or http:// for local development.'
    )
  }

  return { supabaseUrl, supabaseKey }
}

export function createClient() {
  const { supabaseUrl, supabaseKey } = validateEnvironmentVars()
  
  return createBrowserClient(supabaseUrl, supabaseKey)
}