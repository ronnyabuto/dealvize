import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    // Get built-in report templates
    const templates = [
      {
        id: 'sales-performance',
        name: 'Sales Performance Report',
        description: 'Track deals, revenue, and conversion rates over time',
        report_type: 'dashboard',
        category: 'sales',
        data_sources: [
          {
            table: 'deals',
            fields: ['id', 'title', 'value', 'status', 'created_at', 'closed_at', 'probability'],
            aggregations: [
              { field: 'value', operation: 'sum', alias: 'total_revenue' },
              { field: 'id', operation: 'count', alias: 'total_deals' }
            ]
          },
          {
            table: 'clients',
            fields: ['id', 'created_at', 'lead_score'],
            aggregations: [
              { field: 'id', operation: 'count', alias: 'total_clients' },
              { field: 'lead_score', operation: 'avg', alias: 'avg_lead_score' }
            ]
          }
        ],
        filters: {
          deals: {
            created_at: { operator: 'gte', value: '{{date_range_start}}' }
          }
        },
        chart_config: {
          type: 'combination',
          charts: [
            { type: 'bar', field: 'total_revenue', label: 'Revenue' },
            { type: 'line', field: 'total_deals', label: 'Deal Count' }
          ]
        }
      },
      {
        id: 'client-engagement',
        name: 'Client Engagement Report',
        description: 'Analyze client interactions, messages, and task completion',
        report_type: 'table',
        category: 'engagement',
        data_sources: [
          {
            table: 'messages',
            fields: ['id', 'client_id', 'direction', 'channel_id', 'created_at'],
            joins: [
              {
                table: 'clients',
                on: 'clients.id = messages.client_id',
                fields: ['first_name', 'last_name', 'email', 'phone']
              }
            ]
          },
          {
            table: 'tasks',
            fields: ['id', 'client_id', 'status', 'due_date', 'completed_at'],
            aggregations: [
              { field: 'id', operation: 'count', alias: 'total_tasks' }
            ]
          }
        ],
        grouping: {
          messages: { field: 'client_id' }
        }
      },
      {
        id: 'lead-conversion',
        name: 'Lead Conversion Funnel',
        description: 'Track leads through the conversion process',
        report_type: 'chart',
        category: 'leads',
        data_sources: [
          {
            table: 'clients',
            fields: ['id', 'lead_score', 'lead_status', 'created_at', 'last_contact_date'],
            aggregations: [
              { field: 'id', operation: 'count', alias: 'lead_count' }
            ]
          },
          {
            table: 'deals',
            fields: ['id', 'client_id', 'status', 'value'],
            aggregations: [
              { field: 'value', operation: 'sum', alias: 'converted_value' }
            ]
          }
        ],
        grouping: {
          clients: { field: 'lead_status' }
        },
        chart_config: {
          type: 'funnel',
          stages: ['new', 'contacted', 'qualified', 'converted']
        }
      },
      {
        id: 'revenue-forecast',
        name: 'Revenue Forecast',
        description: 'Project future revenue based on pipeline and probability',
        report_type: 'chart',
        category: 'forecast',
        data_sources: [
          {
            table: 'deals',
            fields: ['id', 'value', 'probability', 'status', 'expected_close_date'],
            aggregations: [
              { field: 'value', operation: 'sum', alias: 'pipeline_value' }
            ]
          }
        ],
        filters: {
          deals: {
            status: ['pending', 'negotiation', 'proposal']
          }
        },
        chart_config: {
          type: 'line',
          x_axis: 'expected_close_date',
          y_axis: 'weighted_value'
        }
      },
      {
        id: 'marketing-roi',
        name: 'Marketing ROI Analysis',
        description: 'Measure the return on investment for marketing channels',
        report_type: 'dashboard',
        category: 'marketing',
        data_sources: [
          {
            table: 'marketing_channels',
            fields: ['id', 'name', 'cost_per_lead', 'total_cost', 'leads_generated'],
            aggregations: [
              { field: 'total_cost', operation: 'sum', alias: 'total_spend' },
              { field: 'leads_generated', operation: 'sum', alias: 'total_leads' }
            ]
          },
          {
            table: 'clients',
            fields: ['id', 'lead_source', 'created_at'],
            joins: [
              {
                table: 'deals',
                on: 'deals.client_id = clients.id',
                fields: ['value', 'status']
              }
            ]
          }
        ],
        grouping: {
          clients: { field: 'lead_source' }
        }
      },
      {
        id: 'task-productivity',
        name: 'Task Productivity Report',
        description: 'Analyze task completion rates and productivity metrics',
        report_type: 'table',
        category: 'productivity',
        data_sources: [
          {
            table: 'tasks',
            fields: ['id', 'title', 'status', 'priority', 'due_date', 'completed_at', 'created_at'],
            aggregations: [
              { field: 'id', operation: 'count', alias: 'total_tasks' }
            ]
          }
        ],
        grouping: {
          tasks: { field: 'status' }
        },
        chart_config: {
          type: 'donut',
          field: 'status'
        }
      },
      {
        id: 'communication-summary',
        name: 'Communication Summary',
        description: 'Overview of all client communications and response rates',
        report_type: 'dashboard',
        category: 'communication',
        data_sources: [
          {
            table: 'messages',
            fields: ['id', 'direction', 'channel_id', 'status', 'created_at'],
            joins: [
              {
                table: 'communication_channels',
                on: 'communication_channels.id = messages.channel_id',
                fields: ['name', 'type']
              }
            ],
            aggregations: [
              { field: 'id', operation: 'count', alias: 'message_count' }
            ]
          },
          {
            table: 'call_logs',
            fields: ['id', 'outcome', 'duration_seconds', 'call_start_time'],
            aggregations: [
              { field: 'duration_seconds', operation: 'sum', alias: 'total_call_time' },
              { field: 'id', operation: 'count', alias: 'total_calls' }
            ]
          }
        ],
        grouping: {
          messages: { field: 'direction' },
          call_logs: { field: 'outcome' }
        }
      }
    ]
    
    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching report templates:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()
    
    const { template_id, name, customizations = {} } = body
    
    if (!template_id) {
      return NextResponse.json({
        error: 'Template ID is required'
      }, { status: 400 })
    }
    
    // Get the template
    const templatesResponse = await fetch(new URL('/api/report-templates', request.url))
    const { templates } = await templatesResponse.json()
    
    const template = templates.find((t: any) => t.id === template_id)
    if (!template) {
      return NextResponse.json({
        error: 'Template not found'
      }, { status: 404 })
    }
    
    // Apply customizations
    const reportConfig = {
      ...template,
      name: name || template.name,
      description: template.description,
      ...customizations
    }
    
    // Remove template-specific fields
    delete reportConfig.id
    delete reportConfig.category
    
    // Create the custom report
    const { data: report, error } = await supabase
      .from('custom_reports')
      .insert({
        user_id: user.id,
        ...reportConfig,
        is_template: false
      })
      .select()
      .single()
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('Error creating report from template:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}