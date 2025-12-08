/**
 * RBAC Middleware
 * Server-side permission checking for API routes and page access
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PermissionChecker, PermissionResource, PermissionAction, PermissionScope, SYSTEM_ROLES } from '@/lib/rbac/permissions'

export interface RBACContext {
  userId: string
  tenantId: string
  userRole: string
  userPermissions: string[]
  tenantMembership: any
}

export interface RBACMiddlewareConfig {
  // Permission requirements
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  
  // Resource-based requirements
  resource?: PermissionResource
  action?: PermissionAction
  scope?: PermissionScope
  
  // Role requirements
  roles?: string[]
  minRole?: 'viewer' | 'agent' | 'manager' | 'admin' | 'owner'
  
  // Custom validation
  validate?: (context: RBACContext) => boolean | Promise<boolean>
  
  // Tenant requirement
  requireTenant?: boolean
  
  // Error responses
  unauthorizedResponse?: NextResponse
  forbiddenResponse?: NextResponse
}

const ROLE_HIERARCHY = {
  viewer: 0,
  agent: 1,
  manager: 2,
  admin: 3,
  owner: 4
}

export class RBACMiddleware {
  /**
   * Main RBAC middleware function
   */
  static async checkPermissions(
    request: NextRequest,
    config: RBACMiddlewareConfig
  ): Promise<{ success: true; context: RBACContext } | { success: false; response: NextResponse }> {
    try {
      // Get authenticated user
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return {
          success: false,
          response: config.unauthorizedResponse || NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }
      }

      // Extract tenant ID from request
      const tenantId = await this.extractTenantId(request)

      if (config.requireTenant && !tenantId) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Tenant context required' },
            { status: 400 }
          )
        }
      }

      // Load user's tenant membership and permissions
      const membership = await this.loadTenantMembership(supabase, user.id, tenantId)

      if (!membership && config.requireTenant) {
        return {
          success: false,
          response: config.forbiddenResponse || NextResponse.json(
            { error: 'Access denied to tenant' },
            { status: 403 }
          )
        }
      }

      // Build RBAC context
      const context: RBACContext = {
        userId: user.id,
        tenantId: tenantId || '',
        userRole: membership?.role || 'viewer',
        userPermissions: await this.getUserPermissions(membership?.role || 'viewer'),
        tenantMembership: membership
      }

      // Check permissions
      const hasAccess = await this.validateAccess(context, config)

      if (!hasAccess) {
        return {
          success: false,
          response: config.forbiddenResponse || NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }
      }

      return { success: true, context }

    } catch (error) {
      console.error('RBAC middleware error:', error)
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Authorization check failed' },
          { status: 500 }
        )
      }
    }
  }

  /**
   * Extract tenant ID from various sources
   */
  private static async extractTenantId(request: NextRequest): Promise<string | null> {
    // Try URL path parameter first
    const urlPath = request.nextUrl.pathname
    const tenantMatch = urlPath.match(/\/api\/tenants\/([^\/]+)/)
    if (tenantMatch) {
      return tenantMatch[1]
    }

    // Try query parameter
    const tenantFromQuery = request.nextUrl.searchParams.get('tenantId')
    if (tenantFromQuery) {
      return tenantFromQuery
    }

    // Try request body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const body = await request.clone().json()
        if (body.tenantId) {
          return body.tenantId
        }
      } catch {
        // Ignore JSON parsing errors
      }
    }

    // Try custom header
    const tenantFromHeader = request.headers.get('x-tenant-id')
    if (tenantFromHeader) {
      return tenantFromHeader
    }

    // Try subdomain extraction (for multi-tenant subdomains)
    const hostname = request.headers.get('host')
    if (hostname && hostname.includes('.')) {
      const subdomain = hostname.split('.')[0]
      if (subdomain !== 'www' && subdomain !== 'api') {
        return subdomain
      }
    }

    return null
  }

  /**
   * Load user's membership in a tenant
   */
  private static async loadTenantMembership(supabase: any, userId: string, tenantId: string | null) {
    if (!tenantId) return null

    const { data: membership } = await supabase
      .from('tenant_members')
      .select(`
        *,
        tenant_roles(
          name,
          permissions
        )
      `)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single()

    return membership
  }

  /**
   * Get user permissions based on role
   */
  private static async getUserPermissions(role: string): Promise<string[]> {
    const systemRole = SYSTEM_ROLES.find(r => r.id === role)
    return systemRole ? systemRole.permissions : []
  }

  /**
   * Validate access based on configuration
   */
  private static async validateAccess(context: RBACContext, config: RBACMiddlewareConfig): Promise<boolean> {
    // Custom validation function
    if (config.validate) {
      return await config.validate(context)
    }

    // Permission-based validation
    if (config.permission) {
      return PermissionChecker.hasPermission(context.userPermissions, config.permission)
    }

    if (config.permissions && config.permissions.length > 0) {
      return config.requireAll
        ? PermissionChecker.hasAllPermissions(context.userPermissions, config.permissions)
        : PermissionChecker.hasAnyPermission(context.userPermissions, config.permissions)
    }

    // Resource-based validation
    if (config.resource && config.action) {
      return PermissionChecker.canAccessResource(
        context.userPermissions,
        config.resource,
        config.action,
        config.scope
      )
    }

    // Role-based validation
    if (config.roles && config.roles.length > 0) {
      return config.roles.includes(context.userRole)
    }

    // Minimum role validation
    if (config.minRole) {
      const userRoleLevel = ROLE_HIERARCHY[context.userRole as keyof typeof ROLE_HIERARCHY] ?? -1
      const requiredLevel = ROLE_HIERARCHY[config.minRole]
      return userRoleLevel >= requiredLevel
    }

    // Default: allow access if no restrictions specified
    return true
  }

  /**
   * Convenience method for API route protection
   */
  static async protectRoute(request: NextRequest, config: RBACMiddlewareConfig) {
    const result = await this.checkPermissions(request, config)
    
    if (!result.success) {
      return result.response
    }

    // Add RBAC context to request headers for downstream use
    const headers = new Headers(request.headers)
    headers.set('x-user-id', result.context.userId)
    headers.set('x-tenant-id', result.context.tenantId)
    headers.set('x-user-role', result.context.userRole)
    headers.set('x-user-permissions', JSON.stringify(result.context.userPermissions))

    return null // Continue to route handler
  }

  /**
   * Get RBAC context from request headers (set by middleware)
   */
  static getContextFromHeaders(request: NextRequest): RBACContext | null {
    try {
      const userId = request.headers.get('x-user-id')
      const tenantId = request.headers.get('x-tenant-id')
      const userRole = request.headers.get('x-user-role')
      const userPermissionsHeader = request.headers.get('x-user-permissions')

      if (!userId || !userRole) {
        return null
      }

      const userPermissions = userPermissionsHeader 
        ? JSON.parse(userPermissionsHeader)
        : []

      return {
        userId,
        tenantId: tenantId || '',
        userRole,
        userPermissions,
        tenantMembership: null
      }
    } catch {
      return null
    }
  }
}

// Convenience functions for common permission checks
export const requireAuth = (config?: Omit<RBACMiddlewareConfig, 'requireTenant'>) => 
  (request: NextRequest) => RBACMiddleware.protectRoute(request, { requireTenant: false, ...config })

export const requireTenant = (config?: RBACMiddlewareConfig) => 
  (request: NextRequest) => RBACMiddleware.protectRoute(request, { requireTenant: true, ...config })

export const requireAdmin = (request: NextRequest) => 
  RBACMiddleware.protectRoute(request, { minRole: 'admin', requireTenant: true })

export const requireOwner = (request: NextRequest) => 
  RBACMiddleware.protectRoute(request, { roles: ['owner'], requireTenant: true })

export const requirePermission = (permission: string) => 
  (request: NextRequest) => RBACMiddleware.protectRoute(request, { permission, requireTenant: true })

export const requireResource = (resource: PermissionResource, action: PermissionAction, scope?: PermissionScope) => 
  (request: NextRequest) => RBACMiddleware.protectRoute(request, { resource, action, scope, requireTenant: true })

// Utility function for API route handlers
export async function withRBAC(
  request: NextRequest,
  handler: (request: NextRequest, context: RBACContext) => Promise<NextResponse> | NextResponse,
  config: RBACMiddlewareConfig
): Promise<NextResponse> {
  const result = await RBACMiddleware.checkPermissions(request, config)
  
  if (!result.success) {
    return result.response
  }

  return await handler(request, result.context)
}

// Type guard for RBAC context
export function hasRBACContext(value: any): value is RBACContext {
  return value &&
    typeof value.userId === 'string' &&
    typeof value.tenantId === 'string' &&
    typeof value.userRole === 'string' &&
    Array.isArray(value.userPermissions)
}