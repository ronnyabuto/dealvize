import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()

    const { template_id, variables = {}, client_id, deal_id } = body

    if (!template_id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', template_id)
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Collect context data
    let contextData = { ...variables }

    // Add user data
    contextData.agent_name = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Agent'
    contextData.agent_email = user.email || ''
    contextData.agent_phone = user.user_metadata?.phone || ''

    // Get client data if client_id provided
    if (client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client_id)
        .eq('user_id', user.id)
        .single()

      if (client) {
        contextData.client_name = `${client.first_name} ${client.last_name}`.trim()
        contextData.client_first_name = client.first_name || ''
        contextData.client_last_name = client.last_name || ''
        contextData.client_email = client.email || ''
        contextData.client_phone = client.phone || ''
        contextData.client_address = client.address || ''
        contextData.client_city = client.city || ''
        contextData.client_state = client.state || ''
        contextData.client_zip = client.zip_code || ''
      }
    }

    // Get deal data if deal_id provided
    if (deal_id) {
      const { data: deal } = await supabase
        .from('deals')
        .select('*, property:properties(*)')
        .eq('id', deal_id)
        .eq('user_id', user.id)
        .single()

      if (deal) {
        contextData.deal_title = deal.title || ''
        contextData.deal_status = deal.status || ''
        contextData.deal_value = formatCurrency(deal.value || 0)
        contextData.deal_commission = formatCurrency((deal.value || 0) * (deal.commission_percentage || 0) / 100)
        
        if (deal.property) {
          contextData.property_address = deal.property.address || ''
          contextData.property_city = deal.property.city || ''
          contextData.property_state = deal.property.state || ''
          contextData.property_zip = deal.property.zip_code || ''
          contextData.property_price = formatCurrency(deal.property.price || 0)
          contextData.property_type = deal.property.property_type || ''
          contextData.property_bedrooms = deal.property.bedrooms?.toString() || ''
          contextData.property_bathrooms = deal.property.bathrooms?.toString() || ''
          contextData.property_sqft = deal.property.square_feet?.toLocaleString() || ''
          contextData.property_highlights = deal.property.features?.join(', ') || ''
        }
      }
    }

    // Process the template
    const processedSubject = processTemplate(template.subject, contextData)
    const processedBodyText = processTemplate(template.body_text, contextData)
    const processedBodyHtml = template.body_html ? processTemplate(template.body_html, contextData) : null

    // Update usage statistics
    await supabase
      .from('email_templates')
      .update({
        usage_count: template.usage_count + 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', template_id)

    return NextResponse.json({
      processed_template: {
        id: template.id,
        name: template.name,
        category: template.category,
        subject: processedSubject,
        body_text: processedBodyText,
        body_html: processedBodyHtml,
        variables_used: Object.keys(contextData)
      },
      context_data: contextData
    })
  } catch (error) {
    console.error('Error processing template:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}

// Helper function to process template variables
function processTemplate(template: string, variables: Record<string, any>): string {
  let processed = template

  // Process {{variable}} patterns
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    processed = processed.replace(regex, String(value || ''))
  })

  // Clean up any remaining unreplaced variables
  processed = processed.replace(/\{\{\s*\w+\s*\}\}/g, '')

  return processed
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}