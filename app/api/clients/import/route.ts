import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'text/csv') {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    // Read file content
    const content = await file.text()
    const lines = content.split('\n').filter(line => line.trim() !== '')
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 })
    }

    // Parse CSV header
    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    
    const expectedHeaders = ['name', 'email', 'phone', 'address', 'company', 'status']
    const headerMap: { [key: string]: number } = {}
    
    expectedHeaders.forEach(expectedHeader => {
      const index = header.findIndex(h => h.toLowerCase() === expectedHeader.toLowerCase())
      if (index !== -1) {
        headerMap[expectedHeader] = index
      }
    })

    // Check required headers
    if (!headerMap['name'] && !headerMap['email']) {
      return NextResponse.json({ 
        error: 'CSV must contain at least "name" or "email" column' 
      }, { status: 400 })
    }

    const clientsToImport = []
    const errors = []

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
      
      if (row.length === 0 || (row.length === 1 && row[0] === '')) {
        continue // Skip empty rows
      }

      try {
        const clientData: any = {
          user_id: user.id
        }

        // Extract name
        if (headerMap['name'] !== undefined && row[headerMap['name']]) {
          clientData.name = row[headerMap['name']].trim()
        }

        // Extract other fields
        if (headerMap['email'] !== undefined) {
          clientData.email = row[headerMap['email']] || null
        }
        if (headerMap['phone'] !== undefined) {
          clientData.phone = row[headerMap['phone']] || null
        }
        if (headerMap['address'] !== undefined) {
          clientData.address = row[headerMap['address']] || null
        }
        if (headerMap['company'] !== undefined) {
          clientData.company = row[headerMap['company']] || null
        }
        if (headerMap['status'] !== undefined) {
          const status = row[headerMap['status']]
          if (status && ['Buyer', 'Seller', 'In Contract'].includes(status)) {
            clientData.status = status
          } else {
            clientData.status = 'Buyer' // Default status
          }
        } else {
          clientData.status = 'Buyer' // Default status
        }

        // Validate required fields
        if (!clientData.name && !clientData.email) {
          errors.push(`Row ${i + 1}: Missing both name and email`)
          continue
        }

        clientsToImport.push(clientData)
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`)
      }
    }

    if (clientsToImport.length === 0) {
      return NextResponse.json({ 
        error: 'No valid client data found in CSV',
        details: errors
      }, { status: 400 })
    }

    // Insert clients in batch
    const { data: insertedClients, error: insertError } = await supabase
      .from('clients')
      .insert(clientsToImport)
      .select()

    if (insertError) {
      console.error('Error inserting clients:', insertError)
      return NextResponse.json({ 
        error: 'Failed to import clients',
        details: insertError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: insertedClients?.length || 0,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error in POST /api/clients/import:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}