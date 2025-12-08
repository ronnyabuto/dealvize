/**
 * Advanced Audit Logging API
 * Comprehensive activity tracking with filtering, search, and export capabilities
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const AuditQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 50, 100)).optional(),
  action: z.string().optional(),
  entity_type: z.string().optional(),
  user_id: z.string().optional(),
  tenant_id: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  search: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  success: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  export_format: z.enum(['json', 'csv', 'xlsx']).optional()
})

// GET - Advanced audit log querying with filtering
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    try {
      const queryParams = AuditQuerySchema.parse(Object.fromEntries(searchParams))
      
      const {
        page = 1,
        limit = 50,
        action,
        entity_type,
        user_id,
        tenant_id,
        start_date,
        end_date,
        search,
        severity,
        ip_address,
        user_agent,
        success,
        export_format
      } = queryParams

      const offset = (page - 1) * limit

      // Build base query
      let query = serviceClient
        .from('audit_logs')
        .select(`
          *,
          user:profiles(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          ),
          tenant:tenants(
            id,
            name,
            domain
          )
        `)

      // Apply filters
      if (action) {
        if (action.includes('*')) {
          const pattern = action.replace('*', '%')
          query = query.like('action', pattern)
        } else {
          query = query.eq('action', action)
        }
      }

      if (entity_type) query = query.eq('entity_type', entity_type)
      if (user_id) query = query.eq('user_id', user_id)
      if (tenant_id) query = query.eq('tenant_id', tenant_id)
      if (severity) query = query.eq('severity', severity)
      if (ip_address) query = query.eq('ip_address', ip_address)
      if (success !== undefined) query = query.eq('success', success)

      // Date range filter
      if (start_date) query = query.gte('created_at', start_date)
      if (end_date) query = query.lte('created_at', end_date)

      // User agent filter (partial match)
      if (user_agent) query = query.ilike('user_agent', `%${user_agent}%`)

      // Full-text search across multiple fields
      if (search) {
        query = query.or(`
          action.ilike.%${search}%,
          entity_type.ilike.%${search}%,
          metadata->>'description'.ilike.%${search}%,
          metadata->>'target'.ilike.%${search}%,
          details.ilike.%${search}%
        `)
      }

      // Get total count for pagination
      let countQuery = serviceClient
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })

      // Apply same filters to count query
      if (action) {
        if (action.includes('*')) {
          const pattern = action.replace('*', '%')
          countQuery = countQuery.like('action', pattern)
        } else {
          countQuery = countQuery.eq('action', action)
        }
      }
      if (entity_type) countQuery = countQuery.eq('entity_type', entity_type)
      if (user_id) countQuery = countQuery.eq('user_id', user_id)
      if (tenant_id) countQuery = countQuery.eq('tenant_id', tenant_id)
      if (severity) countQuery = countQuery.eq('severity', severity)
      if (success !== undefined) countQuery = countQuery.eq('success', success)
      if (start_date) countQuery = countQuery.gte('created_at', start_date)
      if (end_date) countQuery = countQuery.lte('created_at', end_date)
      if (search) {
        countQuery = countQuery.or(`
          action.ilike.%${search}%,
          entity_type.ilike.%${search}%,
          metadata->>'description'.ilike.%${search}%
        `)
      }

      const { count } = await countQuery

      // Handle export requests
      if (export_format) {
        const { data: exportData } = await query
          .order('created_at', { ascending: false })
          .limit(10000) // Limit exports to prevent memory issues

        return handleAuditExport(exportData || [], export_format)
      }

      // Get paginated results
      const { data: logs, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Get summary statistics
      const summary = await getAuditSummary(serviceClient, queryParams)

      return NextResponse.json({
        logs: logs || [],
        summary,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        filters: {
          actions: await getUniqueActions(serviceClient),
          entity_types: await getUniqueEntityTypes(serviceClient),
          severities: ['low', 'medium', 'high', 'critical']
        }
      })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Invalid query parameters',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }, { status: 400 })
      }

      console.error('Error fetching audit logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      )
    }
  }, {
    resource: 'audit_logs',
    action: 'view',
    requireTenant: false
  })
}

// POST - Create audit log entry (for manual entries or system events)
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()

    try {
      const body = await request.json()
      const {
        action,
        entity_type,
        entity_id,
        tenant_id,
        details,
        metadata = {},
        severity = 'medium',
        success = true,
        ip_address,
        user_agent
      } = body

      if (!action || !entity_type) {
        return NextResponse.json({
          error: 'Action and entity_type are required'
        }, { status: 400 })
      }

      const auditEntry = {
        user_id: context.userId,
        tenant_id: tenant_id || context.tenantId,
        action,
        entity_type,
        entity_id: entity_id || null,
        details: details || null,
        metadata: {
          ...metadata,
          source: 'manual_entry',
          admin_created: true
        },
        severity,
        success,
        ip_address: ip_address || req.ip,
        user_agent: user_agent || req.headers.get('user-agent'),
        created_at: new Date().toISOString()
      }

      const { data: log, error } = await serviceClient
        .from('audit_logs')
        .insert(auditEntry)
        .select(`
          *,
          user:profiles(first_name, last_name, email),
          tenant:tenants(name, domain)
        `)
        .single()

      if (error) throw error

      return NextResponse.json({
        message: 'Audit log entry created successfully',
        log
      }, { status: 201 })

    } catch (error) {
      console.error('Error creating audit log:', error)
      return NextResponse.json(
        { error: 'Failed to create audit log entry' },
        { status: 500 }
      )
    }
  }, {
    resource: 'audit_logs',
    action: 'manage',
    requireTenant: false
  })
}

// Helper function to get audit summary
async function getAuditSummary(serviceClient: any, queryParams: any) {
  const { start_date, end_date, tenant_id, user_id } = queryParams
  
  let summaryQuery = serviceClient.from('audit_logs').select('*')
  
  if (start_date) summaryQuery = summaryQuery.gte('created_at', start_date)
  if (end_date) summaryQuery = summaryQuery.lte('created_at', end_date)
  if (tenant_id) summaryQuery = summaryQuery.eq('tenant_id', tenant_id)
  if (user_id) summaryQuery = summaryQuery.eq('user_id', user_id)

  const { data: summaryLogs } = await summaryQuery.limit(10000)

  if (!summaryLogs) return {}

  const actionCounts = summaryLogs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1
    return acc
  }, {})

  const entityCounts = summaryLogs.reduce((acc, log) => {
    acc[log.entity_type] = (acc[log.entity_type] || 0) + 1
    return acc
  }, {})

  const severityCounts = summaryLogs.reduce((acc, log) => {
    acc[log.severity] = (acc[log.severity] || 0) + 1
    return acc
  }, {})

  const successRate = summaryLogs.length > 0 
    ? Math.round((summaryLogs.filter(log => log.success).length / summaryLogs.length) * 100)
    : 0

  // Get top users by activity
  const userActivity = summaryLogs.reduce((acc, log) => {
    if (log.user_id) {
      acc[log.user_id] = (acc[log.user_id] || 0) + 1
    }
    return acc
  }, {})

  const topUsers = Object.entries(userActivity)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([userId, count]) => ({ user_id: userId, activity_count: count }))

  return {
    total_events: summaryLogs.length,
    success_rate: successRate,
    top_actions: Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count })),
    entity_types: Object.entries(entityCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([entity_type, count]) => ({ entity_type, count })),
    severity_distribution: severityCounts,
    top_users: topUsers,
    unique_users: Object.keys(userActivity).length,
    date_range: {
      start: start_date || null,
      end: end_date || null
    }
  }
}

// Helper function to get unique actions for filtering
async function getUniqueActions(serviceClient: any) {
  const { data } = await serviceClient
    .from('audit_logs')
    .select('action')
    .limit(1000)

  if (!data) return []

  const uniqueActions = [...new Set(data.map(item => item.action))]
  return uniqueActions.sort()
}

// Helper function to get unique entity types
async function getUniqueEntityTypes(serviceClient: any) {
  const { data } = await serviceClient
    .from('audit_logs')
    .select('entity_type')
    .limit(1000)

  if (!data) return []

  const uniqueTypes = [...new Set(data.map(item => item.entity_type))]
  return uniqueTypes.sort()
}

// Helper function to handle audit log exports
async function handleAuditExport(data: any[], format: string) {
  const headers = new Headers()
  
  switch (format) {
    case 'csv':
      const csvContent = generateCSV(data)
      headers.set('Content-Type', 'text/csv')
      headers.set('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`)
      return new Response(csvContent, { headers })

    case 'xlsx':
      // In a real implementation, you'd use a library like 'xlsx' to generate Excel files
      headers.set('Content-Type', 'application/json')
      return NextResponse.json({
        error: 'XLSX export not yet implemented',
        suggestion: 'Use CSV export instead'
      }, { status: 501 })

    case 'json':
    default:
      headers.set('Content-Type', 'application/json')
      headers.set('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`)
      return NextResponse.json(data, { headers })
  }
}

// Helper function to generate CSV content
function generateCSV(data: any[]): string {
  if (data.length === 0) return 'No data available'

  const headers = [
    'Timestamp',
    'Action',
    'Entity Type',
    'Entity ID',
    'User',
    'Tenant',
    'Success',
    'Severity',
    'IP Address',
    'Details'
  ]

  const rows = data.map(log => [
    log.created_at,
    log.action,
    log.entity_type,
    log.entity_id || '',
    log.user ? `${log.user.first_name} ${log.user.last_name} (${log.user.email})` : '',
    log.tenant ? `${log.tenant.name} (${log.tenant.domain})` : '',
    log.success ? 'Success' : 'Failed',
    log.severity,
    log.ip_address || '',
    log.details || ''
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return csvContent
}