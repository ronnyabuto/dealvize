import { createClient } from '@/lib/supabase/server'
import { type User } from '@/lib/types'
import { redirect } from 'next/navigation'

export async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  
  const { data: { user: authUser }, error } = await supabase.auth.getUser()
  if (error || !authUser) return null

  // We rely on the DB trigger to have created this.
  // If it's missing, it means the system is in a critical fail state, 
  // but we shouldn't try to "fix" it here in a read function.
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!userProfile) return null

  return {
    id: userProfile.id,
    name: userProfile.name,
    email: userProfile.email,
    avatar: userProfile.avatar,
    role: userProfile.role,
    phone: userProfile.phone,
    licenseNumber: userProfile.license_number,
    isSuperAdmin: false // Implement RBAC logic here if needed
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getUser()
  if (!user) redirect('/auth/signin')
  return user
}