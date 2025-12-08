import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const reportId = searchParams.get('id')
    const includeData = searchParams.get('include_data') === 'true'
    
    if (reportId) {
      // Get specific report
      let query = supabase
        .from('custom_reports')
        .select('*')
        .eq('id', reportId)
        .eq('user_id', user.id)
        .single()
        
      const { data: report, error } = await query
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      }
      
      // Generate report data if requested
      let reportData = null
      if (includeData) {
        reportData = await generateReportData(supabase, user.id, report)
      }
      
      return NextResponse.json({
        report,
        data: reportData
      })
    } else {
      // Get all reports for user
      const { data: reports, error } = await supabase
        .from('custom_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      return NextResponse.json({ reports: reports || [] })
    }
  } catch (error) {
    console.error('Error fetching reports:', error)
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
      description,
      report_type, // 'table', 'chart', 'dashboard'
      configuration, // JSON object with report settings
      data_sources, // Array of data source configurations
      filters,
      grouping,
      sorting,
      chart_config,
      is_template = false
    } = body
    
    // Validate required fields
    if (!name || !report_type || !data_sources || !Array.isArray(data_sources)) {
      return NextResponse.json({
        error: 'Name, report type, and data sources are required'
      }, { status: 400 })
    }
    
    // Validate data sources
    for (const source of data_sources) {
      if (!source.table || !source.fields || !Array.isArray(source.fields)) {
        return NextResponse.json({
          error: 'Each data source must have table and fields'
        }, { status: 400 })
      }
    }
    
    // Create report
    const { data: report, error } = await supabase
      .from('custom_reports')
      .insert({
        user_id: user.id,
        name,
        description,
        report_type,
        configuration,
        data_sources,
        filters: filters || {},
        grouping: grouping || {},
        sorting: sorting || [],
        chart_config: chart_config || {},
        is_template
      })
      .select()
      .single()
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('id')
    const body = await request.json()
    
    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }
    
    const {
      name,
      description,
      configuration,
      data_sources,
      filters,
      grouping,
      sorting,
      chart_config
    } = body
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (configuration) updateData.configuration = configuration
    if (data_sources) updateData.data_sources = data_sources
    if (filters) updateData.filters = filters
    if (grouping) updateData.grouping = grouping
    if (sorting) updateData.sorting = sorting
    if (chart_config) updateData.chart_config = chart_config
    
    const { data: report, error } = await supabase
      .from('custom_reports')
      .update(updateData)
      .eq('id', reportId)
      .eq('user_id', user.id)
      .select()
      .single()
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ report })
  } catch (error) {
    console.error('Error updating report:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('id')
    
    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('custom_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', user.id)
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting report:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

async function generateReportData(supabase: any, userId: string, report: any) {
  try {
    const results: any = {}
    
    // Process each data source
    for (const source of report.data_sources) {
      let query = supabase
        .from(source.table)
        .select(source.fields.join(', '))
      
      // Add user filter for security
      if (source.table !== 'communication_channels' && source.table !== 'lead_categories') {
        query = query.eq('user_id', userId)
      }
      
      // Apply filters
      if (report.filters && report.filters[source.table]) {
        const filters = report.filters[source.table]
        Object.entries(filters).forEach(([key, value]: [string, any]) => {
          if (value !== null && value !== undefined && value !== '') {
            if (Array.isArray(value)) {
              query = query.in(key, value)
            } else if (typeof value === 'object' && value.operator) {
              switch (value.operator) {
                case 'gte':
                  query = query.gte(key, value.value)
                  break
                case 'lte':
                  query = query.lte(key, value.value)
                  break
                case 'gt':
                  query = query.gt(key, value.value)
                  break
                case 'lt':
                  query = query.lt(key, value.value)
                  break
                case 'like':
                  query = query.like(key, `%${value.value}%`)
                  break
                case 'ilike':
                  query = query.ilike(key, `%${value.value}%`)
                  break
                default:
                  query = query.eq(key, value.value)
              }
            } else {
              query = query.eq(key, value)
            }
          }
        })
      }
      
      // Apply sorting
      if (report.sorting && report.sorting.length > 0) {
        report.sorting.forEach((sort: any) => {
          if (source.fields.includes(sort.field)) {
            query = query.order(sort.field, { ascending: sort.direction === 'asc' })
          }
        })
      }
      
      // Apply limit if specified
      if (source.limit && source.limit > 0) {
        query = query.limit(Math.min(source.limit, 1000)) // Max 1000 records
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error(`Error querying ${source.table}:`, error)
        results[source.table] = { error: error.message, data: [] }
      } else {
        results[source.table] = { data: data || [] }
        
        // Apply grouping if specified
        if (report.grouping && report.grouping[source.table]) {
          results[source.table].grouped = applyGrouping(
            data || [], 
            report.grouping[source.table]
          )
        }
        
        // Calculate aggregations if specified
        if (source.aggregations) {
          results[source.table].aggregations = calculateAggregations(
            data || [], 
            source.aggregations
          )
        }
      }
    }
    
    return results
  } catch (error) {
    console.error('Error generating report data:', error)
    return { error: 'Failed to generate report data' }
  }
}

function applyGrouping(data: any[], groupConfig: any) {
  const { field, aggregations } = groupConfig
  
  if (!field || !data.length) return {}
  
  const grouped = data.reduce((acc, item) => {
    const key = item[field] || 'Unknown'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {})
  
  // Apply aggregations to each group
  if (aggregations) {
    Object.keys(grouped).forEach(key => {
      grouped[key] = {
        items: grouped[key],
        aggregations: calculateAggregations(grouped[key], aggregations)
      }
    })
  }
  
  return grouped
}

function calculateAggregations(data: any[], aggregations: any[]) {
  const results: any = {}
  
  aggregations.forEach(agg => {
    const { field, operation, alias } = agg
    const key = alias || `${operation}_${field}`
    
    switch (operation) {
      case 'count':
        results[key] = data.length
        break
      case 'sum':
        results[key] = data.reduce((sum, item) => {
          const value = parseFloat(item[field]) || 0
          return sum + value
        }, 0)
        break
      case 'avg':
        const sum = data.reduce((sum, item) => {
          const value = parseFloat(item[field]) || 0
          return sum + value
        }, 0)
        results[key] = data.length > 0 ? sum / data.length : 0
        break
      case 'min':
        results[key] = Math.min(...data.map(item => parseFloat(item[field]) || 0))
        break
      case 'max':
        results[key] = Math.max(...data.map(item => parseFloat(item[field]) || 0))
        break
      default:
        results[key] = null
    }
  })
  
  return results
}