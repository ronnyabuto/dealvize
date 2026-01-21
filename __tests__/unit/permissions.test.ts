import {
    PermissionChecker,
    ContextualPermissionChecker,
    SYSTEM_ROLES,
    CORE_PERMISSIONS,
    ClientPermissions,
    DealPermissions,
    AdminPermissions,
} from '@/lib/rbac/permissions'

describe('RBAC Permission System', () => {
    describe('PermissionChecker.hasPermission', () => {
        it('returns true when permission exists', () => {
            const permissions = ['CLIENTS_VIEW_OWN', 'DEALS_CREATE']
            expect(PermissionChecker.hasPermission(permissions, 'CLIENTS_VIEW_OWN')).toBe(true)
        })

        it('returns false when permission does not exist', () => {
            const permissions = ['CLIENTS_VIEW_OWN']
            expect(PermissionChecker.hasPermission(permissions, 'DEALS_CREATE')).toBe(false)
        })

        it('returns false for empty permissions array', () => {
            expect(PermissionChecker.hasPermission([], 'CLIENTS_VIEW_OWN')).toBe(false)
        })
    })

    describe('PermissionChecker.hasAnyPermission', () => {
        it('returns true when at least one permission matches', () => {
            const permissions = ['CLIENTS_VIEW_OWN', 'TASKS_CREATE']
            const required = ['DEALS_CREATE', 'CLIENTS_VIEW_OWN']
            expect(PermissionChecker.hasAnyPermission(permissions, required)).toBe(true)
        })

        it('returns false when no permissions match', () => {
            const permissions = ['CLIENTS_VIEW_OWN']
            const required = ['DEALS_CREATE', 'TASKS_DELETE_OWN']
            expect(PermissionChecker.hasAnyPermission(permissions, required)).toBe(false)
        })

        it('returns false for empty permissions array', () => {
            const required = ['DEALS_CREATE']
            expect(PermissionChecker.hasAnyPermission([], required)).toBe(false)
        })
    })

    describe('PermissionChecker.hasAllPermissions', () => {
        it('returns true when all permissions match', () => {
            const permissions = ['CLIENTS_VIEW_OWN', 'DEALS_CREATE', 'TASKS_CREATE']
            const required = ['CLIENTS_VIEW_OWN', 'DEALS_CREATE']
            expect(PermissionChecker.hasAllPermissions(permissions, required)).toBe(true)
        })

        it('returns false when some permissions are missing', () => {
            const permissions = ['CLIENTS_VIEW_OWN']
            const required = ['CLIENTS_VIEW_OWN', 'DEALS_CREATE']
            expect(PermissionChecker.hasAllPermissions(permissions, required)).toBe(false)
        })

        it('returns true for empty required array', () => {
            const permissions = ['CLIENTS_VIEW_OWN']
            expect(PermissionChecker.hasAllPermissions(permissions, [])).toBe(true)
        })
    })

    describe('PermissionChecker.canAccessResource', () => {
        it('checks resource access with scope', () => {
            const permissions = ['CLIENTS_VIEW_OWN']
            expect(PermissionChecker.canAccessResource(permissions, 'clients', 'view', 'own')).toBe(true)
        })

        it('returns false for wrong scope', () => {
            const permissions = ['CLIENTS_VIEW_OWN']
            expect(PermissionChecker.canAccessResource(permissions, 'clients', 'view', 'tenant')).toBe(false)
        })

        it('checks resource access without scope', () => {
            const permissions = ['CLIENTS_CREATE']
            expect(PermissionChecker.canAccessResource(permissions, 'clients', 'create')).toBe(true)
        })
    })

    describe('PermissionChecker.getPermissionLevel', () => {
        it('returns tenant for ALL scope permissions', () => {
            const permissions = ['CLIENTS_VIEW_ALL', 'CLIENTS_UPDATE_ALL']
            expect(PermissionChecker.getPermissionLevel(permissions, 'clients')).toBe('tenant')
        })

        it('returns team for TEAM scope permissions', () => {
            const permissions = ['CLIENTS_VIEW_TEAM']
            expect(PermissionChecker.getPermissionLevel(permissions, 'clients')).toBe('team')
        })

        it('returns own when no higher scope permissions exist', () => {
            const permissions = ['CLIENTS_VIEW_OWN']
            expect(PermissionChecker.getPermissionLevel(permissions, 'clients')).toBe('own')
        })

        it('returns tenant over team when both exist', () => {
            const permissions = ['CLIENTS_VIEW_ALL', 'CLIENTS_UPDATE_ALL']
            expect(PermissionChecker.getPermissionLevel(permissions, 'clients')).toBe('tenant')
        })
    })
})

describe('SYSTEM_ROLES', () => {
    it('has 5 system roles', () => {
        expect(SYSTEM_ROLES).toHaveLength(5)
    })

    it('owner role has all permissions', () => {
        const ownerRole = SYSTEM_ROLES.find((r) => r.id === 'owner')
        expect(ownerRole).toBeDefined()
        expect(ownerRole?.permissions).toEqual(Object.keys(CORE_PERMISSIONS))
    })

    it('viewer role has limited permissions', () => {
        const viewerRole = SYSTEM_ROLES.find((r) => r.id === 'viewer')
        expect(viewerRole).toBeDefined()
        expect(viewerRole?.permissions).toContain('CLIENTS_VIEW_OWN')
        expect(viewerRole?.permissions).not.toContain('CLIENTS_CREATE')
    })

    it('agent role can create but not delete all', () => {
        const agentRole = SYSTEM_ROLES.find((r) => r.id === 'agent')
        expect(agentRole).toBeDefined()
        expect(agentRole?.permissions).toContain('CLIENTS_CREATE')
        expect(agentRole?.permissions).not.toContain('CLIENTS_DELETE_ALL')
    })

    it('admin role cannot manage billing', () => {
        const adminRole = SYSTEM_ROLES.find((r) => r.id === 'admin')
        expect(adminRole).toBeDefined()
        expect(adminRole?.permissions).not.toContain('BILLING_MANAGE')
    })

    it('all roles are marked as system roles', () => {
        SYSTEM_ROLES.forEach((role) => {
            expect(role.isSystem).toBe(true)
        })
    })
})

describe('ClientPermissions helpers', () => {
    const agentPerms = ['CLIENTS_VIEW_OWN', 'CLIENTS_CREATE', 'CLIENTS_UPDATE_OWN']

    it('canView checks view permission', () => {
        expect(ClientPermissions.canView(agentPerms, 'own')).toBe(true)
        expect(ClientPermissions.canView(agentPerms, 'tenant')).toBe(false)
    })

    it('canCreate checks create permission', () => {
        expect(ClientPermissions.canCreate(agentPerms)).toBe(true)
    })

    it('canUpdate checks update permission with scope', () => {
        expect(ClientPermissions.canUpdate(agentPerms, 'own')).toBe(true)
        expect(ClientPermissions.canUpdate(agentPerms, 'tenant')).toBe(false)
    })

    it('canDelete checks delete permission', () => {
        expect(ClientPermissions.canDelete(agentPerms, 'own')).toBe(false)
    })
})

describe('DealPermissions helpers', () => {
    const managerPerms = ['DEALS_VIEW_TEAM', 'DEALS_CREATE', 'DEALS_UPDATE_TEAM']

    it('canView checks team scope', () => {
        expect(DealPermissions.canView(managerPerms, 'team')).toBe(true)
    })

    it('canApprove checks approve permission', () => {
        expect(DealPermissions.canApprove(managerPerms)).toBe(false)

        const adminPerms = [...managerPerms, 'DEALS_APPROVE']
        expect(DealPermissions.canApprove(adminPerms)).toBe(true)
    })
})

describe('AdminPermissions helpers', () => {
    const adminPerms = ['MEMBERS_MANAGE', 'MEMBERS_INVITE', 'SETTINGS_MANAGE', 'AUDIT_LOGS_VIEW']

    it('canManageMembers checks manage permission', () => {
        expect(AdminPermissions.canManageMembers(adminPerms)).toBe(true)
    })

    it('canInviteMembers checks invite permission', () => {
        expect(AdminPermissions.canInviteMembers(adminPerms)).toBe(true)
    })

    it('canManageSettings checks settings permission', () => {
        expect(AdminPermissions.canManageSettings(adminPerms)).toBe(true)
    })

    it('canManageBilling requires billing permission', () => {
        expect(AdminPermissions.canManageBilling(adminPerms)).toBe(false)

        const ownerPerms = [...adminPerms, 'BILLING_MANAGE']
        expect(AdminPermissions.canManageBilling(ownerPerms)).toBe(true)
    })

    it('canViewAuditLogs checks audit logs permission', () => {
        expect(AdminPermissions.canViewAuditLogs(adminPerms)).toBe(true)
    })
})

describe('ContextualPermissionChecker', () => {
    const context = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        teamIds: ['team-1', 'team-2'],
        location: 'US',
        deviceType: 'desktop' as const,
    }

    it('returns true when permission exists and no conditions', () => {
        const permissions = ['CLIENTS_VIEW_OWN']
        expect(
            ContextualPermissionChecker.hasContextualPermission(
                permissions,
                'CLIENTS_VIEW_OWN',
                context
            )
        ).toBe(true)
    })

    it('returns false when permission does not exist', () => {
        const permissions = ['CLIENTS_VIEW_OWN']
        expect(
            ContextualPermissionChecker.hasContextualPermission(permissions, 'DEALS_CREATE', context)
        ).toBe(false)
    })

    it('evaluates eq condition correctly', () => {
        const permissions = ['CLIENTS_VIEW_OWN']
        const conditions = [{ field: 'location', operator: 'eq' as const, value: 'US' }]

        expect(
            ContextualPermissionChecker.hasContextualPermission(
                permissions,
                'CLIENTS_VIEW_OWN',
                context,
                conditions
            )
        ).toBe(true)
    })

    it('evaluates ne condition correctly', () => {
        const permissions = ['CLIENTS_VIEW_OWN']
        const conditions = [{ field: 'deviceType', operator: 'ne' as const, value: 'mobile' }]

        expect(
            ContextualPermissionChecker.hasContextualPermission(
                permissions,
                'CLIENTS_VIEW_OWN',
                context,
                conditions
            )
        ).toBe(true)
    })

    it('evaluates in condition correctly', () => {
        const permissions = ['CLIENTS_VIEW_OWN']
        const conditions = [{ field: 'location', operator: 'in' as const, value: ['US', 'CA', 'UK'] }]

        expect(
            ContextualPermissionChecker.hasContextualPermission(
                permissions,
                'CLIENTS_VIEW_OWN',
                context,
                conditions
            )
        ).toBe(true)
    })

    it('fails when condition is not met', () => {
        const permissions = ['CLIENTS_VIEW_OWN']
        const conditions = [{ field: 'location', operator: 'eq' as const, value: 'UK' }]

        expect(
            ContextualPermissionChecker.hasContextualPermission(
                permissions,
                'CLIENTS_VIEW_OWN',
                context,
                conditions
            )
        ).toBe(false)
    })
})
