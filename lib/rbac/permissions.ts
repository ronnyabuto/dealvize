/**
 * RBAC Permission System
 * Enterprise-grade permission management for multi-tenant CRM
 */

export type PermissionAction = 
  | 'create' | 'read' | 'update' | 'delete'
  | 'manage' | 'view' | 'assign' | 'export'
  | 'approve' | 'configure' | 'invite'

export type PermissionResource =
  | 'clients' | 'deals' | 'tasks' | 'notes' | 'conversations'
  | 'reports' | 'analytics' | 'settings' | 'members' | 'billing'
  | 'integrations' | 'automation' | 'api_keys' | 'templates'
  | 'lead_scoring' | 'workflows' | 'notifications' | 'audit_logs'
  | 'mls' | 'documents' | 'calendar' | 'communication' | 'affiliates'
  | 'tenant_analytics' | 'sso' | 'blog' | 'admin_dashboard' | 'webhooks'
  | 'system_monitoring' | 'feature_flags'

export type PermissionScope = 'own' | 'team' | 'tenant' | 'all'

export interface Permission {
  resource: PermissionResource
  action: PermissionAction
  scope?: PermissionScope
  conditions?: PermissionCondition[]
}

export interface PermissionCondition {
  field: string
  operator: 'eq' | 'ne' | 'in' | 'not_in' | 'contains' | 'gt' | 'lt'
  value: any
}

// Permission string format: "resource:action:scope"
export type PermissionString = `${PermissionResource}:${PermissionAction}:${PermissionScope}` | 
                              `${PermissionResource}:${PermissionAction}`

// Core permission definitions
export const CORE_PERMISSIONS: Record<string, Permission[]> = {
  // Client Management
  CLIENTS_VIEW_OWN: [{ resource: 'clients', action: 'view', scope: 'own' }],
  CLIENTS_VIEW_TEAM: [{ resource: 'clients', action: 'view', scope: 'team' }],
  CLIENTS_VIEW_ALL: [{ resource: 'clients', action: 'view', scope: 'tenant' }],
  CLIENTS_CREATE: [{ resource: 'clients', action: 'create' }],
  CLIENTS_UPDATE_OWN: [{ resource: 'clients', action: 'update', scope: 'own' }],
  CLIENTS_UPDATE_TEAM: [{ resource: 'clients', action: 'update', scope: 'team' }],
  CLIENTS_UPDATE_ALL: [{ resource: 'clients', action: 'update', scope: 'tenant' }],
  CLIENTS_DELETE_OWN: [{ resource: 'clients', action: 'delete', scope: 'own' }],
  CLIENTS_DELETE_ALL: [{ resource: 'clients', action: 'delete', scope: 'tenant' }],
  CLIENTS_EXPORT: [{ resource: 'clients', action: 'export' }],
  CLIENTS_ASSIGN: [{ resource: 'clients', action: 'assign' }],

  // Deal Management
  DEALS_VIEW_OWN: [{ resource: 'deals', action: 'view', scope: 'own' }],
  DEALS_VIEW_TEAM: [{ resource: 'deals', action: 'view', scope: 'team' }],
  DEALS_VIEW_ALL: [{ resource: 'deals', action: 'view', scope: 'tenant' }],
  DEALS_CREATE: [{ resource: 'deals', action: 'create' }],
  DEALS_UPDATE_OWN: [{ resource: 'deals', action: 'update', scope: 'own' }],
  DEALS_UPDATE_TEAM: [{ resource: 'deals', action: 'update', scope: 'team' }],
  DEALS_UPDATE_ALL: [{ resource: 'deals', action: 'update', scope: 'tenant' }],
  DEALS_DELETE_OWN: [{ resource: 'deals', action: 'delete', scope: 'own' }],
  DEALS_DELETE_ALL: [{ resource: 'deals', action: 'delete', scope: 'tenant' }],
  DEALS_APPROVE: [{ resource: 'deals', action: 'approve' }],

  // Task Management
  TASKS_VIEW_OWN: [{ resource: 'tasks', action: 'view', scope: 'own' }],
  TASKS_VIEW_TEAM: [{ resource: 'tasks', action: 'view', scope: 'team' }],
  TASKS_CREATE: [{ resource: 'tasks', action: 'create' }],
  TASKS_UPDATE_OWN: [{ resource: 'tasks', action: 'update', scope: 'own' }],
  TASKS_UPDATE_ALL: [{ resource: 'tasks', action: 'update', scope: 'tenant' }],
  TASKS_DELETE_OWN: [{ resource: 'tasks', action: 'delete', scope: 'own' }],
  TASKS_ASSIGN: [{ resource: 'tasks', action: 'assign' }],

  // Communication
  CONVERSATIONS_VIEW_OWN: [{ resource: 'conversations', action: 'view', scope: 'own' }],
  CONVERSATIONS_VIEW_ALL: [{ resource: 'conversations', action: 'view', scope: 'tenant' }],
  CONVERSATIONS_CREATE: [{ resource: 'conversations', action: 'create' }],
  COMMUNICATION_MANAGE: [{ resource: 'communication', action: 'manage' }],

  // Reports & Analytics
  REPORTS_VIEW_BASIC: [{ resource: 'reports', action: 'view', scope: 'own' }],
  REPORTS_VIEW_ALL: [{ resource: 'reports', action: 'view', scope: 'tenant' }],
  REPORTS_CREATE: [{ resource: 'reports', action: 'create' }],
  REPORTS_EXPORT: [{ resource: 'reports', action: 'export' }],
  ANALYTICS_VIEW: [{ resource: 'analytics', action: 'view' }],
  ANALYTICS_MANAGE: [{ resource: 'analytics', action: 'manage' }],

  // Team & Member Management
  MEMBERS_VIEW: [{ resource: 'members', action: 'view' }],
  MEMBERS_INVITE: [{ resource: 'members', action: 'invite' }],
  MEMBERS_MANAGE: [{ resource: 'members', action: 'manage' }],
  MEMBERS_DELETE: [{ resource: 'members', action: 'delete' }],

  // Settings & Configuration
  SETTINGS_VIEW: [{ resource: 'settings', action: 'view' }],
  SETTINGS_MANAGE: [{ resource: 'settings', action: 'manage' }],
  BILLING_VIEW: [{ resource: 'billing', action: 'view' }],
  BILLING_MANAGE: [{ resource: 'billing', action: 'manage' }],

  // Integrations & Automation
  INTEGRATIONS_VIEW: [{ resource: 'integrations', action: 'view' }],
  INTEGRATIONS_MANAGE: [{ resource: 'integrations', action: 'manage' }],
  AUTOMATION_VIEW: [{ resource: 'automation', action: 'view' }],
  AUTOMATION_MANAGE: [{ resource: 'automation', action: 'manage' }],
  WORKFLOWS_CREATE: [{ resource: 'workflows', action: 'create' }],
  WORKFLOWS_MANAGE: [{ resource: 'workflows', action: 'manage' }],

  // Advanced Features
  API_KEYS_VIEW: [{ resource: 'api_keys', action: 'view' }],
  API_KEYS_MANAGE: [{ resource: 'api_keys', action: 'manage' }],
  LEAD_SCORING_VIEW: [{ resource: 'lead_scoring', action: 'view' }],
  LEAD_SCORING_CONFIGURE: [{ resource: 'lead_scoring', action: 'configure' }],
  MLS_MANAGE: [{ resource: 'mls', action: 'manage' }],
  
  // Audit & Compliance
  AUDIT_LOGS_VIEW: [{ resource: 'audit_logs', action: 'view' }],
  AUDIT_LOGS_EXPORT: [{ resource: 'audit_logs', action: 'export' }],
}

// Role definitions with permission sets
export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  isSystem: boolean
  tenantId?: string
  color?: string
  icon?: string
}

export const SYSTEM_ROLES: Role[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Full access to all tenant resources and settings',
    isSystem: true,
    color: '#10b981',
    icon: '👑',
    permissions: Object.keys(CORE_PERMISSIONS)
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access except billing and member deletion',
    isSystem: true,
    color: '#3b82f6',
    icon: '⚡',
    permissions: [
      'CLIENTS_VIEW_ALL', 'CLIENTS_CREATE', 'CLIENTS_UPDATE_ALL', 'CLIENTS_EXPORT', 'CLIENTS_ASSIGN',
      'DEALS_VIEW_ALL', 'DEALS_CREATE', 'DEALS_UPDATE_ALL', 'DEALS_APPROVE',
      'TASKS_VIEW_TEAM', 'TASKS_CREATE', 'TASKS_UPDATE_ALL', 'TASKS_ASSIGN',
      'CONVERSATIONS_VIEW_ALL', 'CONVERSATIONS_CREATE', 'COMMUNICATION_MANAGE',
      'REPORTS_VIEW_ALL', 'REPORTS_CREATE', 'REPORTS_EXPORT', 'ANALYTICS_VIEW', 'ANALYTICS_MANAGE',
      'MEMBERS_VIEW', 'MEMBERS_INVITE', 'MEMBERS_MANAGE',
      'SETTINGS_VIEW', 'SETTINGS_MANAGE',
      'INTEGRATIONS_VIEW', 'INTEGRATIONS_MANAGE',
      'AUTOMATION_VIEW', 'AUTOMATION_MANAGE', 'WORKFLOWS_CREATE', 'WORKFLOWS_MANAGE',
      'LEAD_SCORING_VIEW', 'LEAD_SCORING_CONFIGURE',
      'MLS_MANAGE',
      'AUDIT_LOGS_VIEW'
    ]
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Team management and oversight capabilities',
    isSystem: true,
    color: '#8b5cf6',
    icon: '👥',
    permissions: [
      'CLIENTS_VIEW_TEAM', 'CLIENTS_CREATE', 'CLIENTS_UPDATE_TEAM', 'CLIENTS_ASSIGN',
      'DEALS_VIEW_TEAM', 'DEALS_CREATE', 'DEALS_UPDATE_TEAM',
      'TASKS_VIEW_TEAM', 'TASKS_CREATE', 'TASKS_UPDATE_ALL', 'TASKS_ASSIGN',
      'CONVERSATIONS_VIEW_ALL', 'CONVERSATIONS_CREATE',
      'REPORTS_VIEW_ALL', 'REPORTS_CREATE', 'ANALYTICS_VIEW',
      'MEMBERS_VIEW',
      'SETTINGS_VIEW',
      'AUTOMATION_VIEW', 'WORKFLOWS_CREATE',
      'LEAD_SCORING_VIEW'
    ]
  },
  {
    id: 'agent',
    name: 'Agent',
    description: 'Standard agent with full client and deal management',
    isSystem: true,
    color: '#f59e0b',
    icon: '🏠',
    permissions: [
      'CLIENTS_VIEW_OWN', 'CLIENTS_CREATE', 'CLIENTS_UPDATE_OWN', 'CLIENTS_EXPORT',
      'DEALS_VIEW_OWN', 'DEALS_CREATE', 'DEALS_UPDATE_OWN',
      'TASKS_VIEW_OWN', 'TASKS_CREATE', 'TASKS_UPDATE_OWN',
      'CONVERSATIONS_VIEW_OWN', 'CONVERSATIONS_CREATE',
      'REPORTS_VIEW_BASIC',
      'SETTINGS_VIEW',
      'AUTOMATION_VIEW',
      'LEAD_SCORING_VIEW'
    ]
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to assigned resources',
    isSystem: true,
    color: '#6b7280',
    icon: '👁️',
    permissions: [
      'CLIENTS_VIEW_OWN',
      'DEALS_VIEW_OWN',
      'TASKS_VIEW_OWN',
      'CONVERSATIONS_VIEW_OWN',
      'REPORTS_VIEW_BASIC',
      'SETTINGS_VIEW'
    ]
  }
]

// Permission checking utilities
export class PermissionChecker {
  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission)
  }

  static hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => userPermissions.includes(permission))
  }

  static hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => userPermissions.includes(permission))
  }

  static canAccessResource(
    userPermissions: string[], 
    resource: PermissionResource, 
    action: PermissionAction,
    scope?: PermissionScope
  ): boolean {
    const permissionKey = this.buildPermissionKey(resource, action, scope)
    return this.hasPermission(userPermissions, permissionKey)
  }

  static buildPermissionKey(
    resource: PermissionResource, 
    action: PermissionAction, 
    scope?: PermissionScope
  ): string {
    const baseKey = `${resource.toUpperCase()}_${action.toUpperCase()}`
    if (scope) {
      return `${baseKey}_${scope.toUpperCase()}`
    }
    return baseKey
  }

  static getPermissionLevel(userPermissions: string[], resource: PermissionResource): PermissionScope {
    const actions = ['VIEW', 'UPDATE', 'DELETE']
    
    for (const action of actions) {
      if (userPermissions.includes(`${resource.toUpperCase()}_${action}_ALL`)) {
        return 'tenant'
      }
      if (userPermissions.includes(`${resource.toUpperCase()}_${action}_TEAM`)) {
        return 'team'
      }
    }
    
    return 'own'
  }
}

// Resource-specific permission helpers
export const ClientPermissions = {
  canView: (permissions: string[], scope: PermissionScope = 'own') => 
    PermissionChecker.canAccessResource(permissions, 'clients', 'view', scope),
  canCreate: (permissions: string[]) => 
    PermissionChecker.canAccessResource(permissions, 'clients', 'create'),
  canUpdate: (permissions: string[], scope: PermissionScope = 'own') => 
    PermissionChecker.canAccessResource(permissions, 'clients', 'update', scope),
  canDelete: (permissions: string[], scope: PermissionScope = 'own') => 
    PermissionChecker.canAccessResource(permissions, 'clients', 'delete', scope),
  canExport: (permissions: string[]) => 
    PermissionChecker.canAccessResource(permissions, 'clients', 'export'),
  canAssign: (permissions: string[]) => 
    PermissionChecker.canAccessResource(permissions, 'clients', 'assign'),
  getAccessLevel: (permissions: string[]) => 
    PermissionChecker.getPermissionLevel(permissions, 'clients')
}

export const DealPermissions = {
  canView: (permissions: string[], scope: PermissionScope = 'own') => 
    PermissionChecker.canAccessResource(permissions, 'deals', 'view', scope),
  canCreate: (permissions: string[]) => 
    PermissionChecker.canAccessResource(permissions, 'deals', 'create'),
  canUpdate: (permissions: string[], scope: PermissionScope = 'own') => 
    PermissionChecker.canAccessResource(permissions, 'deals', 'update', scope),
  canDelete: (permissions: string[], scope: PermissionScope = 'own') => 
    PermissionChecker.canAccessResource(permissions, 'deals', 'delete', scope),
  canApprove: (permissions: string[]) => 
    PermissionChecker.canAccessResource(permissions, 'deals', 'approve'),
  getAccessLevel: (permissions: string[]) => 
    PermissionChecker.getPermissionLevel(permissions, 'deals')
}

export const AdminPermissions = {
  canManageMembers: (permissions: string[]) => 
    PermissionChecker.hasPermission(permissions, 'MEMBERS_MANAGE'),
  canInviteMembers: (permissions: string[]) => 
    PermissionChecker.hasPermission(permissions, 'MEMBERS_INVITE'),
  canManageSettings: (permissions: string[]) => 
    PermissionChecker.hasPermission(permissions, 'SETTINGS_MANAGE'),
  canManageBilling: (permissions: string[]) => 
    PermissionChecker.hasPermission(permissions, 'BILLING_MANAGE'),
  canViewAuditLogs: (permissions: string[]) => 
    PermissionChecker.hasPermission(permissions, 'AUDIT_LOGS_VIEW'),
  canManageIntegrations: (permissions: string[]) => 
    PermissionChecker.hasPermission(permissions, 'INTEGRATIONS_MANAGE')
}

// Context-aware permissions (for future enhancements)
export interface PermissionContext {
  userId: string
  tenantId: string
  teamIds?: string[]
  location?: string
  timeZone?: string
  deviceType?: 'mobile' | 'desktop' | 'tablet'
  ipAddress?: string
}

export class ContextualPermissionChecker extends PermissionChecker {
  static hasContextualPermission(
    userPermissions: string[],
    requiredPermission: string,
    context: PermissionContext,
    conditions?: PermissionCondition[]
  ): boolean {
    // Base permission check
    if (!this.hasPermission(userPermissions, requiredPermission)) {
      return false
    }

    // Apply contextual conditions if any
    if (conditions && conditions.length > 0) {
      return this.evaluateConditions(conditions, context)
    }

    return true
  }

  private static evaluateConditions(conditions: PermissionCondition[], context: any): boolean {
    return conditions.every(condition => {
      const value = context[condition.field]
      
      switch (condition.operator) {
        case 'eq':
          return value === condition.value
        case 'ne':
          return value !== condition.value
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value)
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(value)
        case 'contains':
          return typeof value === 'string' && value.includes(condition.value)
        case 'gt':
          return value > condition.value
        case 'lt':
          return value < condition.value
        default:
          return false
      }
    })
  }
}