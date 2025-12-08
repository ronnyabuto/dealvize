import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const propertyType = searchParams.get('property_type')
    const minValue = searchParams.get('min_value')
    const maxValue = searchParams.get('max_value')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    
    let query = supabase
      .from('deals')
      .select(`
        *,
        clients (
          id,
          first_name,
          last_name,
          name,
          email,
          phone
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (propertyType) {
      query = query.eq('property_type', propertyType)
    }

    if (minValue) {
      query = query.gte('value', parseFloat(minValue))
    }

    if (maxValue) {
      query = query.lte('value', parseFloat(maxValue))
    }

    if (dateFrom) {
      query = query.gte('expected_close_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('expected_close_date', dateTo)
    }

    const { data: deals, error } = await query

    if (error) {
      console.error('Error fetching deals for export:', error)
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
    }

    // Convert to CSV
    const csvHeaders = [
      'Deal ID',
      'Title',
      'Status',
      'Client Name',
      'Client Email',
      'Client Phone',
      'Property Type',
      'Property Address',
      'Property Bedrooms',
      'Property Bathrooms',
      'Property Sq Ft',
      'Deal Value',
      'Commission',
      'Probability %',
      'Expected Close Date',
      'Created Date'
    ]

    const csvRows = deals?.map(deal => {
      const client = deal.clients
      const clientName = client?.first_name && client?.last_name 
        ? `${client.first_name} ${client.last_name}`.trim()
        : client?.name || 'Unknown Client'

      return [
        deal.id,
        deal.title || '',
        deal.status || '',
        clientName,
        client?.email || '',
        client?.phone || '',
        deal.property_type || '',
        deal.property_address || '',
        deal.property_bedrooms || '',
        deal.property_bathrooms || '',
        deal.property_sqft || '',
        deal.value || '',
        deal.commission || '',
        deal.probability || '',
        deal.expected_close_date || '',
        new Date(deal.created_at).toLocaleDateString()
      ].map(field => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const stringField = String(field)
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`
        }
        return stringField
      }).join(',')
    }) || []

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="deals-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error('Error in GET /api/deals/export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}