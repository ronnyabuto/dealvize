import { createClient } from '@/lib/supabase/server'
import { type User } from '@/lib/types'
import { redirect } from 'next/navigation'

export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  
  const { data: { user: authUser }, error } = await supabase.auth.getUser()
  
  if (error || !authUser) {
    return null
  }

  // Fetch profile. We assume the DB trigger created it.
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!userProfile) {
    // If we have an Auth User but no Profile, the Trigger failed or wasn't set up.
    // In production, we might log this to Sentry.
    // For now, return minimal data from Auth to prevent blocking the user entirely.
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || 'User',
      email: authUser.email || '',
      avatar: authUser.user_metadata?.avatar_url,
      role: 'Agent', // Default fallback
      isSuperAdmin: false
    }
  }

  return {
    id: userProfile.id,
    name: userProfile.name,
    email: userProfile.email,
    avatar: userProfile.avatar_url, // Mapped correctly
    role: userProfile.role,
    phone: userProfile.phone,
    licenseNumber: userProfile.license_number,
    isSuperAdmin: false // Implement logic if needed
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getUser()
  if (!user) {
    redirect('/auth/signin')
  }
  return user
}