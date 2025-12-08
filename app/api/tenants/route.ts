import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const tenant_id = searchParams.get('tenant_id')
    const include_members = searchParams.get('include_members') === 'true'
    const include_settings = searchParams.get('include_settings') === 'true'

    if (tenant_id) {
      return await getTenant(supabase, user.id, tenant_id, include_members, include_settings)
    } else {
      return await getUserTenants(supabase, user.id, include_members)
    }
  } catch (error) {
    console.error('Error fetching tenant data:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      subdomain,
      plan_type = 'starter', // starter, professional, enterprise
      industry,
      company_size,
      settings = {},
      branding = {}
    } = body

    // Validate required fields
    if (!name || !subdomain) {
      return NextResponse.json({
        error: 'Name and subdomain are required'
      }, { status: 400 })
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return NextResponse.json({
        error: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
      }, { status: 400 })
    }

    // Check if subdomain is already taken
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single()

    if (existingTenant) {
      return NextResponse.json({
        error: 'Subdomain is already taken'
      }, { status: 409 })
    }

    // Create tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        name,
        subdomain,
        plan_type,
        industry,
        company_size,
        settings: {
          timezone: 'UTC',
          date_format: 'MM/DD/YYYY',
          currency: 'USD',
          language: 'en',
          business_hours: {
            monday: { start: '09:00', end: '17:00', enabled: true },
            tuesday: { start: '09:00', end: '17:00', enabled: true },
            wednesday: { start: '09:00', end: '17:00', enabled: true },
            thursday: { start: '09:00', end: '17:00', enabled: true },
            friday: { start: '09:00', end: '17:00', enabled: true },
            saturday: { start: '09:00', end: '17:00', enabled: false },
            sunday: { start: '09:00', end: '17:00', enabled: false }
          },
          features: {
            ai_scoring: plan_type !== 'starter',
            advanced_automation: plan_type === 'enterprise',
            white_labeling: plan_type === 'enterprise',
            api_access: plan_type !== 'starter',
            custom_integrations: plan_type === 'enterprise'
          },
          limits: getPlanLimits(plan_type),
          ...settings
        },
        branding: {
          primary_color: '#3b82f6',
          secondary_color: '#64748b',
          logo_url: null,
          favicon_url: null,
          custom_css: null,
          ...branding
        },
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Add creator as admin member
    await supabase
      .from('tenant_members')
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'admin',
        permissions: ['all'],
        invited_by: user.id,
        joined_at: new Date().toISOString(),
        status: 'active'
      })

    // Create default tenant settings
    await initializeTenantDefaults(supabase, tenant.id, user.id)

    return NextResponse.json({ tenant }, { status: 201 })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('id')
    const body = await request.json()

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    // Check user permissions
    const hasPermission = await checkTenantPermission(supabase, user.id, tenantId, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    }

    // Don't allow changing subdomain after creation for security reasons
    delete updateData.subdomain

    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Error updating tenant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getTenant(supabase: any, userId: string, tenantId: string, includeMembers: boolean, includeSettings: boolean) {
  // Check if user has access to this tenant
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role, permissions, status')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .single()

  if (!membership || membership.status !== 'active') {
    return NextResponse.json({ error: 'Tenant not found or access denied' }, { status: 404 })
  }

  let selectFields = `
    id, name, subdomain, plan_type, industry, company_size, status, created_at, updated_at
  `

  if (includeSettings && ['admin', 'owner'].includes(membership.role)) {
    selectFields += ', settings, branding'
  }

  if (includeMembers && ['admin', 'owner', 'manager'].includes(membership.role)) {
    selectFields += `, tenant_members(
      id, user_id, role, permissions, status, joined_at,
      user:users(id, email, full_name, avatar_url)
    )`
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select(selectFields)
    .eq('id', tenantId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Add user's membership info
  const tenantWithMembership = {
    ...tenant,
    user_membership: membership
  }

  return NextResponse.json({ tenant: tenantWithMembership })
}

async function getUserTenants(supabase: any, userId: string, includeMembers: boolean) {
  let selectFields = `
    tenant:tenants(
      id, name, subdomain, plan_type, industry, company_size, status, created_at
    ),
    role, permissions, status, joined_at
  `

  if (includeMembers) {
    selectFields = `
      tenant:tenants(
        id, name, subdomain, plan_type, industry, company_size, status, created_at,
        tenant_members(
          id, user_id, role, status,
          user:users(id, email, full_name, avatar_url)
        )
      ),
      role, permissions, status, joined_at
    `
  }

  const { data: memberships, error } = await supabase
    .from('tenant_members')
    .select(selectFields)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const tenants = (memberships || []).map((membership: any) => ({
    ...membership.tenant,
    user_membership: {
      role: membership.role,
      permissions: membership.permissions,
      status: membership.status,
      joined_at: membership.joined_at
    }
  }))

  return NextResponse.json({ tenants })
}

async function checkTenantPermission(supabase: any, userId: string, tenantId: string, permission: string) {
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role, permissions, status')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .single()

  if (!membership || membership.status !== 'active') {
    return false
  }

  // Admin and owner have all permissions
  if (['admin', 'owner'].includes(membership.role)) {
    return true
  }

  // Check specific permission
  return membership.permissions?.includes(permission) || membership.permissions?.includes('all')
}

async function initializeTenantDefaults(supabase: any, tenantId: string, userId: string) {
  // Create default pipeline stages
  const defaultStages = [
    { name: 'Lead', order_index: 0, color: '#6b7280', is_default: true },
    { name: 'Qualified', order_index: 1, color: '#3b82f6', is_default: false },
    { name: 'Proposal', order_index: 2, color: '#f59e0b', is_default: false },
    { name: 'Negotiation', order_index: 3, color: '#ef4444', is_default: false },
    { name: 'Closed Won', order_index: 4, color: '#10b981', is_default: false },
    { name: 'Closed Lost', order_index: 5, color: '#6b7280', is_default: false }
  ]

  const stageInserts = defaultStages.map(stage => ({
    ...stage,
    tenant_id: tenantId,
    user_id: userId,
    created_at: new Date().toISOString()
  }))

  await supabase
    .from('pipeline_stages')
    .insert(stageInserts)

  // Create default email templates
  const defaultTemplates = [
    {
      name: 'Welcome Email',
      subject: 'Welcome to {{tenant_name}}!',
      content: 'Hello {{client_name}},\n\nWelcome to our platform! We\'re excited to work with you.\n\nBest regards,\n{{user_name}}',
      template_type: 'welcome',
      is_default: true
    },
    {
      name: 'Follow-up Email',
      subject: 'Following up on your inquiry',
      content: 'Hi {{client_name}},\n\nI wanted to follow up on your recent inquiry. Please let me know if you have any questions.\n\nBest regards,\n{{user_name}}',
      template_type: 'follow_up',
      is_default: true
    }
  ]

  const templateInserts = defaultTemplates.map(template => ({
    ...template,
    tenant_id: tenantId,
    user_id: userId,
    created_at: new Date().toISOString()
  }))

  await supabase
    .from('email_templates')
    .insert(templateInserts)

  // Create default roles and permissions
  const defaultRoles = [
    {
      name: 'Sales Rep',
      description: 'Standard sales representative',
      permissions: ['view_leads', 'manage_own_leads', 'create_deals', 'manage_own_deals'],
      is_default: true
    },
    {
      name: 'Sales Manager',
      description: 'Sales team manager',
      permissions: ['view_leads', 'manage_all_leads', 'create_deals', 'manage_all_deals', 'view_reports'],
      is_default: true
    }
  ]

  const roleInserts = defaultRoles.map(role => ({
    ...role,
    tenant_id: tenantId,
    created_by: userId,
    created_at: new Date().toISOString()
  }))

  await supabase
    .from('tenant_roles')
    .insert(roleInserts)
}

function getPlanLimits(planType: string) {
  const limits = {
    starter: {
      max_users: 5,
      max_clients: 1000,
      max_deals: 500,
      max_storage_gb: 5,
      max_api_calls_per_month: 1000,
      max_email_sends_per_month: 1000,
      max_sms_sends_per_month: 100,
      max_automations: 5,
      max_custom_fields: 10
    },
    professional: {
      max_users: 25,
      max_clients: 10000,
      max_deals: 5000,
      max_storage_gb: 50,
      max_api_calls_per_month: 10000,
      max_email_sends_per_month: 10000,
      max_sms_sends_per_month: 1000,
      max_automations: 25,
      max_custom_fields: 50
    },
    enterprise: {
      max_users: -1, // unlimited
      max_clients: -1,
      max_deals: -1,
      max_storage_gb: -1,
      max_api_calls_per_month: -1,
      max_email_sends_per_month: -1,
      max_sms_sends_per_month: -1,
      max_automations: -1,
      max_custom_fields: -1
    }
  }

  return limits[planType as keyof typeof limits] || limits.starter
}