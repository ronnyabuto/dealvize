'use client'

/**
 * Permission Guard Component
 * Conditional rendering based on user permissions and roles
 */

import { ReactNode } from 'react'
import { useRBAC } from '@/lib/rbac/context'
import { PermissionResource, PermissionAction, PermissionScope } from '@/lib/rbac/permissions'

interface PermissionGuardProps {
  children: ReactNode
  fallback?: ReactNode
  loading?: ReactNode
  
  // Permission-based access
  permission?: string
  permissions?: string[]
  requireAll?: boolean // If true, user must have ALL permissions; if false, user needs ANY permission
  
  // Resource-based access
  resource?: PermissionResource
  action?: PermissionAction
  scope?: PermissionScope
  
  // Role-based access
  roles?: string[]
  minRole?: 'viewer' | 'agent' | 'manager' | 'admin' | 'owner'
  
  // Inverse logic
  not?: boolean
  
  // Custom condition
  condition?: (context: ReturnType<typeof useRBAC>) => boolean
}

const ROLE_HIERARCHY = {
  viewer: 0,
  agent: 1,
  manager: 2,
  admin: 3,
  owner: 4
}

export function PermissionGuard({
  children,
  fallback = null,
  loading = null,
  permission,
  permissions,
  requireAll = false,
  resource,
  action,
  scope,
  roles,
  minRole,
  not = false,
  condition
}: PermissionGuardProps) {
  const rbacContext = useRBAC()
  const { 
    isLoading, 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    canAccessResource,
    userRole
  } = rbacContext

  // Show loading state
  if (isLoading && loading) {
    return <>{loading}</>
  }

  // Skip checks if still loading and no loading component provided
  if (isLoading) {
    return <>{fallback}</>
  }

  let hasAccess = true

  // Custom condition check
  if (condition) {
    hasAccess = condition(rbacContext)
  }
  
  // Single permission check
  else if (permission) {
    hasAccess = hasPermission(permission)
  }
  
  // Multiple permissions check
  else if (permissions && permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }
  
  // Resource-based permission check
  else if (resource && action) {
    hasAccess = canAccessResource(resource, action, scope)
  }
  
  // Role-based access check
  else if (roles && roles.length > 0) {
    hasAccess = roles.includes(userRole?.id || '')
  }
  
  // Minimum role check
  else if (minRole) {
    const userRoleLevel = ROLE_HIERARCHY[userRole?.id as keyof typeof ROLE_HIERARCHY] ?? -1
    const requiredLevel = ROLE_HIERARCHY[minRole]
    hasAccess = userRoleLevel >= requiredLevel
  }

  // Apply inverse logic if requested
  if (not) {
    hasAccess = !hasAccess
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

// Specialized permission guards for common use cases
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard minRole="admin" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function ManagerOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard minRole="manager" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function OwnerOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGuard roles={['owner']} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function ClientPermissionGuard({ 
  children, 
  action, 
  scope = 'own', 
  fallback = null 
}: { 
  children: ReactNode
  action: PermissionAction
  scope?: PermissionScope
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard resource="clients" action={action} scope={scope} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function DealPermissionGuard({ 
  children, 
  action, 
  scope = 'own', 
  fallback = null 
}: { 
  children: ReactNode
  action: PermissionAction
  scope?: PermissionScope
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard resource="deals" action={action} scope={scope} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

export function ReportsPermissionGuard({ 
  children, 
  scope = 'own', 
  fallback = null 
}: { 
  children: ReactNode
  scope?: PermissionScope
  fallback?: ReactNode 
}) {
  return (
    <PermissionGuard resource="reports" action="view" scope={scope} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

// Higher-order component version
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<PermissionGuardProps, 'children' | 'fallback'>
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGuard {...guardProps}>
        <Component {...props} />
      </PermissionGuard>
    )
  }
}

// Hook for conditional logic based on permissions
export function usePermissionGuard({
  permission,
  permissions,
  requireAll = false,
  resource,
  action,
  scope,
  roles,
  minRole,
  condition
}: Omit<PermissionGuardProps, 'children' | 'fallback' | 'loading' | 'not'>) {
  const rbacContext = useRBAC()
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    canAccessResource,
    userRole
  } = rbacContext

  // Custom condition check
  if (condition) {
    return condition(rbacContext)
  }
  
  // Single permission check
  if (permission) {
    return hasPermission(permission)
  }
  
  // Multiple permissions check
  if (permissions && permissions.length > 0) {
    return requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }
  
  // Resource-based permission check
  if (resource && action) {
    return canAccessResource(resource, action, scope)
  }
  
  // Role-based access check
  if (roles && roles.length > 0) {
    return roles.includes(userRole?.id || '')
  }
  
  // Minimum role check
  if (minRole) {
    const userRoleLevel = ROLE_HIERARCHY[userRole?.id as keyof typeof ROLE_HIERARCHY] ?? -1
    const requiredLevel = ROLE_HIERARCHY[minRole]
    return userRoleLevel >= requiredLevel
  }

  return true
}

// Loading states for permission checks
export function PermissionSkeleton({ className = "h-4 w-20 bg-gray-200 rounded animate-pulse" }: { className?: string }) {
  return <div className={className} />
}

export function PermissionSpinner({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`} />
  )
}

// Error boundaries for permission failures
export function PermissionDenied({ 
  message = "You don't have permission to access this resource.",
  action
}: { 
  message?: string
  action?: ReactNode 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-4xl mb-4">🔒</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  )
}

// Utility component for debugging permissions
export function PermissionDebug() {
  const { userRole, userPermissions, currentTenant, isLoading } = useRBAC()

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="font-bold mb-2">Permission Debug</div>
      <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
      <div>Tenant: {currentTenant || 'None'}</div>
      <div>Role: {userRole?.name || 'None'} ({userRole?.id})</div>
      <div>Permissions: {userPermissions.length}</div>
      <details className="mt-2">
        <summary className="cursor-pointer">View Permissions</summary>
        <div className="mt-1 max-h-32 overflow-y-auto">
          {userPermissions.map(permission => (
            <div key={permission} className="text-gray-300">{permission}</div>
          ))}
        </div>
      </details>
    </div>
  )
}