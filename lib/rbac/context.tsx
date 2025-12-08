'use client'

/**
 * RBAC Context Provider
 * React context for permission management and role-based access control
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Role, SYSTEM_ROLES, PermissionChecker, PermissionResource, PermissionAction, PermissionScope } from './permissions'

interface TenantMember {
  id: string
  user_id: string
  tenant_id: string
  role: string
  permissions: string[]
  status: 'active' | 'inactive' | 'pending'
  joined_at: string
}

interface RBACContextType {
  // User & Authentication
  user: User | null
  isLoading: boolean
  
  // Tenant & Role Information
  currentTenant: string | null
  userRole: Role | null
  userPermissions: string[]
  tenantMembership: TenantMember | null
  
  // Permission Checking Methods
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  canAccessResource: (resource: PermissionResource, action: PermissionAction, scope?: PermissionScope) => boolean
  getAccessLevel: (resource: PermissionResource) => PermissionScope
  
  // Role Management
  isOwner: () => boolean
  isAdmin: () => boolean
  isManager: () => boolean
  isAgent: () => boolean
  isViewer: () => boolean
  
  // Utility Methods
  refresh: () => Promise<void>
  switchTenant: (tenantId: string) => Promise<void>
}

const RBACContext = createContext<RBACContextType | undefined>(undefined)

interface RBACProviderProps {
  children: ReactNode
  initialTenantId?: string
}

export function RBACProvider({ children, initialTenantId }: RBACProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTenant, setCurrentTenant] = useState<string | null>(initialTenantId || null)
  const [userRole, setUserRole] = useState<Role | null>(null)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [tenantMembership, setTenantMembership] = useState<TenantMember | null>(null)

  const supabase = createClient()

  // Initialize user session and permissions
  useEffect(() => {
    initializeUser()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await initializeUser()
      } else if (event === 'SIGNED_OUT') {
        resetState()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load tenant membership when tenant changes
  useEffect(() => {
    if (user && currentTenant) {
      loadTenantMembership()
    }
  }, [user, currentTenant])

  const initializeUser = async () => {
    try {
      setIsLoading(true)
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        resetState()
        return
      }

      setUser(user)

      // If no current tenant is set, try to get the user's default tenant
      if (!currentTenant) {
        await loadDefaultTenant(user.id)
      }

    } catch (error) {
      console.error('Error initializing user:', error)
      resetState()
    } finally {
      setIsLoading(false)
    }
  }

  const loadDefaultTenant = async (userId: string) => {
    try {
      const { data: memberships, error } = await supabase
        .from('tenant_members')
        .select('tenant_id, role, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true })
        .limit(1)

      if (error || !memberships || memberships.length === 0) {
        return
      }

      setCurrentTenant(memberships[0].tenant_id)
    } catch (error) {
      console.error('Error loading default tenant:', error)
    }
  }

  const loadTenantMembership = async () => {
    if (!user || !currentTenant) return

    try {
      // Load tenant membership with role and permissions
      const { data: membership, error: membershipError } = await supabase
        .from('tenant_members')
        .select(`
          *,
          tenant_roles!inner(
            name,
            permissions,
            color,
            icon
          )
        `)
        .eq('user_id', user.id)
        .eq('tenant_id', currentTenant)
        .eq('status', 'active')
        .single()

      if (membershipError || !membership) {
        console.error('Error loading tenant membership:', membershipError)
        return
      }

      setTenantMembership(membership)

      // Set role information
      const roleData = membership.tenant_roles
      const systemRole = SYSTEM_ROLES.find(r => r.id === membership.role)
      
      if (systemRole) {
        setUserRole(systemRole)
        setUserPermissions(systemRole.permissions)
      } else if (roleData) {
        // Custom role
        const customRole: Role = {
          id: membership.role,
          name: roleData.name,
          description: `Custom role for ${currentTenant}`,
          permissions: roleData.permissions || [],
          isSystem: false,
          tenantId: currentTenant,
          color: roleData.color,
          icon: roleData.icon
        }
        setUserRole(customRole)
        setUserPermissions(roleData.permissions || [])
      }

    } catch (error) {
      console.error('Error loading tenant membership:', error)
    }
  }

  const resetState = () => {
    setUser(null)
    setCurrentTenant(null)
    setUserRole(null)
    setUserPermissions([])
    setTenantMembership(null)
    setIsLoading(false)
  }

  // Permission checking methods
  const hasPermission = (permission: string): boolean => {
    return PermissionChecker.hasPermission(userPermissions, permission)
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    return PermissionChecker.hasAnyPermission(userPermissions, permissions)
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    return PermissionChecker.hasAllPermissions(userPermissions, permissions)
  }

  const canAccessResource = (
    resource: PermissionResource, 
    action: PermissionAction, 
    scope?: PermissionScope
  ): boolean => {
    return PermissionChecker.canAccessResource(userPermissions, resource, action, scope)
  }

  const getAccessLevel = (resource: PermissionResource): PermissionScope => {
    return PermissionChecker.getPermissionLevel(userPermissions, resource)
  }

  // Role checking methods
  const isOwner = (): boolean => userRole?.id === 'owner'
  const isAdmin = (): boolean => userRole?.id === 'admin' || isOwner()
  const isManager = (): boolean => ['manager', 'admin', 'owner'].includes(userRole?.id || '')
  const isAgent = (): boolean => ['agent', 'manager', 'admin', 'owner'].includes(userRole?.id || '')
  const isViewer = (): boolean => userRole?.id === 'viewer'

  // Utility methods
  const refresh = async (): Promise<void> => {
    await initializeUser()
  }

  const switchTenant = async (tenantId: string): Promise<void> => {
    if (!user) return

    // Verify user has access to this tenant
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single()

    if (membership) {
      setCurrentTenant(tenantId)
    } else {
      throw new Error('Access denied to requested tenant')
    }
  }

  const value: RBACContextType = {
    // User & Authentication
    user,
    isLoading,
    
    // Tenant & Role Information
    currentTenant,
    userRole,
    userPermissions,
    tenantMembership,
    
    // Permission Checking Methods
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,
    getAccessLevel,
    
    // Role Management
    isOwner,
    isAdmin,
    isManager,
    isAgent,
    isViewer,
    
    // Utility Methods
    refresh,
    switchTenant
  }

  return (
    <RBACContext.Provider value={value}>
      {children}
    </RBACContext.Provider>
  )
}

export function useRBAC(): RBACContextType {
  const context = useContext(RBACContext)
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider')
  }
  return context
}

// Convenience hooks for common permission patterns
export function usePermission(permission: string): boolean {
  const { hasPermission } = useRBAC()
  return hasPermission(permission)
}

export function useResourcePermission(
  resource: PermissionResource, 
  action: PermissionAction, 
  scope?: PermissionScope
): boolean {
  const { canAccessResource } = useRBAC()
  return canAccessResource(resource, action, scope)
}

export function useRoleCheck() {
  const { isOwner, isAdmin, isManager, isAgent, isViewer } = useRBAC()
  return { isOwner, isAdmin, isManager, isAgent, isViewer }
}

export function useUserPermissions(): string[] {
  const { userPermissions } = useRBAC()
  return userPermissions
}

export function useTenantInfo() {
  const { currentTenant, userRole, tenantMembership } = useRBAC()
  return { currentTenant, userRole, tenantMembership }
}