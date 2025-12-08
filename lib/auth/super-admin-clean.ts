// Clean Super Admin Authentication
// Senior Developer Implementation - Simple, Secure, Performant

import { createClient } from '@/lib/supabase/server'
import { User } from '@/lib/types'

/**
 * Check if user is super admin (simple database query)
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    
    return !!data && !error
  } catch {
    return false
  }
}

/**
 * Get current user and verify super admin status
 */
export async function getCurrentSuperAdmin(): Promise<{
  user: User | null
  isSuperAdmin: boolean
}> {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      return { user: null, isSuperAdmin: false }
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profileError || !profile) {
      return { user: null, isSuperAdmin: false }
    }

    const user: User = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar,
      role: profile.role,
      phone: profile.phone,
      licenseNumber: profile.license_number,
    }

    // Check super admin status
    const isSuper = await isSuperAdmin(authUser.id)
    
    return { user, isSuperAdmin: isSuper }
  } catch {
    return { user: null, isSuperAdmin: false }
  }
}

/**
 * Get platform statistics (for super admin dashboard)
 */
export async function getPlatformStats() {
  const supabase = await createClient()
  
  // Simple parallel queries
  const [
    { count: totalUsers },
    { count: totalDeals },
    { count: totalClients },
    { data: revenueData },
    { data: recentUsers }
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('deals').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('deals').select('value').eq('status', 'Closed'),
    supabase.from('users').select('name, email, role, created_at').order('created_at', { ascending: false }).limit(5)
  ])

  // Calculate total revenue
  const totalRevenue = (revenueData || []).reduce((sum, deal) => {
    const value = typeof deal.value === 'string' 
      ? parseFloat(deal.value.replace(/[$,]/g, '')) || 0
      : deal.value || 0
    return sum + value
  }, 0)

  return {
    totalUsers: totalUsers || 0,
    totalDeals: totalDeals || 0, 
    totalClients: totalClients || 0,
    totalRevenue: Math.round(totalRevenue),
    recentUsers: recentUsers || []
  }
}

/**
 * Get all platform users (for user management)
 */
export async function getAllUsers() {
  const supabase = await createClient()
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, role, phone, license_number, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return users || []
}