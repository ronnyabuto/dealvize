import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { complianceManager } from '@/lib/security/compliance'
import { chatSecurity } from '@/lib/security/chat-security'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Rate limiting - max 1 export per hour per user
    const rateLimit = await chatSecurity.checkRateLimit(user.id, 'conversations')
    if (!rateLimit.success) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Data exports are limited.',
        resetTime: rateLimit.resetTime
      }, { status: 429 })
    }

    const body = await request.json()
    const { format = 'json', dataTypes = ['profile', 'conversations', 'clients', 'deals'] } = body

    // Export user data
    const result = await complianceManager.exportUserData({
      userId: user.id,
      email: user.email,
      dataTypes,
      format: format as 'json' | 'csv'
    })

    if (!result.success) {
      return NextResponse.json({
        error: result.error || 'Export failed'
      }, { status: 500 })
    }

    const exportData = result.data

    // Generate export file based on format
    let responseData: any
    let contentType: string
    let filename: string

    switch (format) {
      case 'csv':
        responseData = convertToCSV(exportData)
        contentType = 'text/csv'
        filename = `dealvize-export-${user.id}-${Date.now()}.csv`
        break
      
      case 'xml':
        responseData = convertToXML(exportData)
        contentType = 'application/xml'
        filename = `dealvize-export-${user.id}-${Date.now()}.xml`
        break
      
      default: // json
        responseData = JSON.stringify(exportData, null, 2)
        contentType = 'application/json'
        filename = `dealvize-export-${user.id}-${Date.now()}.json`
    }

    // Return the export data
    return new NextResponse(responseData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Export-Records': exportData.total_records?.toString() || '0',
        'X-Export-Format': format
      }
    })

  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json({
      error: 'Internal server error during data export'
    }, { status: 500 })
  }
}

// Helper function to convert data to CSV
function convertToCSV(data: Record<string, any>): string {
  const lines: string[] = []
  
  // Add metadata
  lines.push('Export Metadata')
  lines.push(`Export Timestamp,${data.export_timestamp}`)
  lines.push(`User ID,${data.user_id}`)
  if (data.tenant_id) lines.push(`Tenant ID,${data.tenant_id}`)
  lines.push('')

  // Add data for each table
  Object.entries(data).forEach(([tableName, tableData]) => {
    if (Array.isArray(tableData) && tableData.length > 0) {
      lines.push(tableName.toUpperCase())
      
      // Headers
      const headers = Object.keys(tableData[0])
      lines.push(headers.join(','))
      
      // Data rows
      tableData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          return `"${String(value).replace(/"/g, '""')}"`
        })
        lines.push(values.join(','))
      })
      
      lines.push('')
    }
  })

  return lines.join('\n')
}

// Helper function to convert data to XML
function convertToXML(data: Record<string, any>): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<dealvize_export>\n'
  
  xml += '  <metadata>\n'
  xml += `    <export_timestamp>${data.export_timestamp}</export_timestamp>\n`
  xml += `    <user_id>${data.user_id}</user_id>\n`
  if (data.tenant_id) xml += `    <tenant_id>${data.tenant_id}</tenant_id>\n`
  xml += '  </metadata>\n'

  Object.entries(data).forEach(([tableName, tableData]) => {
    if (Array.isArray(tableData)) {
      xml += `  <${tableName}>\n`
      
      tableData.forEach(row => {
        xml += `    <record>\n`
        Object.entries(row).forEach(([key, value]) => {
          xml += `      <${key}>${escapeXML(String(value || ''))}</${key}>\n`
        })
        xml += `    </record>\n`
      })
      
      xml += `  </${tableName}>\n`
    }
  })

  xml += '</dealvize_export>'
  return xml
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}