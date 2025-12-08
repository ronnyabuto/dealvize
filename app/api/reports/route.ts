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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || '30days'
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const exportFormat = searchParams.get('export')

    // Calculate date range
    const now = new Date()
    let filterStartDate: Date
    let filterEndDate = new Date()

    if (startDate && endDate) {
      filterStartDate = new Date(startDate)
      filterEndDate = new Date(endDate)
    } else {
      switch (dateRange) {
        case '7days':
          filterStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '90days':
          filterStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case '1year':
          filterStartDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        default: // 30days
          filterStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
    }

    // Build query for deals
    let dealsQuery = supabase
      .from('deals')
      .select(`
        *,
        clients (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .gte('created_at', filterStartDate.toISOString())
      .lte('created_at', filterEndDate.toISOString())

    // Apply filters
    if (status) {
      dealsQuery = dealsQuery.eq('status', status)
    }
    if (clientId) {
      dealsQuery = dealsQuery.eq('client_id', clientId)
    }

    const { data: deals, error: dealsError } = await dealsQuery
    if (dealsError) throw dealsError

    // Get clients data
    let clientsQuery = supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)

    if (clientId) {
      clientsQuery = clientsQuery.eq('id', clientId)
    }

    const { data: clients, error: clientsError } = await clientsQuery
    if (clientsError) throw clientsError

    // Calculate metrics
    const parseValue = (value: string) => {
      const cleanValue = value.replace(/[$,]/g, '')
      return parseFloat(cleanValue) || 0
    }

    const closedDeals = deals?.filter(deal => deal.status === 'Closed') || []
    const totalRevenue = closedDeals.reduce((sum, deal) => sum + parseValue(deal.value), 0)
    const totalCommission = closedDeals.reduce((sum, deal) => sum + parseValue(deal.commission), 0)
    const avgDealSize = closedDeals.length > 0 ? totalRevenue / closedDeals.length : 0

    // Handle export
    if (exportFormat === 'csv') {
      const csvData = [
        ['Report Generated', new Date().toISOString()],
        ['Date Range', `${filterStartDate.toISOString().split('T')[0]} to ${filterEndDate.toISOString().split('T')[0]}`],
        [''],
        ['SUMMARY METRICS'],
        ['Total Revenue', `$${totalRevenue.toLocaleString()}`],
        ['Deals Closed', closedDeals.length.toString()],
        ['Total Clients', clients?.length.toString() || '0'],
        ['Average Deal Size', `$${avgDealSize.toLocaleString()}`],
        ['Total Commission', `$${totalCommission.toLocaleString()}`],
        [''],
        ['DEAL DETAILS'],
        ['Title', 'Status', 'Value', 'Commission', 'Client', 'Created Date'],
        ...(deals?.map(deal => [
          deal.title,
          deal.status,
          deal.value,
          deal.commission,
          deal.clients?.name || '',
          new Date(deal.created_at).toLocaleDateString()
        ]) || [])
      ]

      const csvContent = csvData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=dealvize-report-${new Date().toISOString().split('T')[0]}.csv`
        }
      })
    }

    // Return JSON data
    return NextResponse.json({
      summary: {
        totalRevenue,
        totalCommission,
        closedDealsCount: closedDeals.length,
        totalClients: clients?.length || 0,
        avgDealSize,
        dateRange: {
          start: filterStartDate.toISOString(),
          end: filterEndDate.toISOString()
        }
      },
      deals: deals || [],
      clients: clients || []
    })

  } catch (error) {
    console.error('Error in GET /api/reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}