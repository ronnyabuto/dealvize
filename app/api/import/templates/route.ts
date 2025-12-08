import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'clients'

  try {
    let csvContent = ''
    let filename = ''

    switch (type) {
      case 'clients':
        csvContent = 'name,email,phone,address,company,status\n' +
                    'John Doe,john.doe@email.com,(555) 123-4567,"123 Main St, City, State 12345",Acme Corp,Buyer\n' +
                    'Jane Smith,jane.smith@email.com,(555) 987-6543,"456 Oak Ave, City, State 12345",Real Estate LLC,Seller\n' +
                    'Bob Johnson,bob.johnson@email.com,(555) 456-7890,"789 Pine St, City, State 12345","",Buyer'
        filename = 'clients_import_template.csv'
        break

      case 'deals':
        csvContent = 'title,client_name,value,status,property_address,property_type,expected_close_date\n' +
                    'Downtown Condo Sale,John Doe,450000,active,"123 Main St, Downtown",Condo,2024-03-15\n' +
                    'Suburban House Purchase,Jane Smith,650000,negotiating,"456 Oak Ave, Suburbs",House,2024-04-20\n' +
                    'Commercial Property,Bob Johnson,1200000,lead,"789 Business Blvd",Commercial,2024-05-10'
        filename = 'deals_import_template.csv'
        break

      case 'tasks':
        csvContent = 'title,description,due_date,priority,status,client_name\n' +
                    'Call client about inspection,Follow up on home inspection schedule,2024-02-15,High,Pending,John Doe\n' +
                    'Prepare listing documents,Gather all required documents for listing,2024-02-20,Medium,Pending,Jane Smith\n' +
                    'Schedule property showing,Coordinate viewing time with client,2024-02-18,High,Pending,Bob Johnson'
        filename = 'tasks_import_template.csv'
        break

      default:
        return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error('Error generating template:', error)
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get available template information
    const templates = [
      {
        type: 'clients',
        name: 'Client Import Template',
        description: 'Import client contacts with name, email, phone, address, company, and status.',
        required_fields: ['name', 'email'],
        optional_fields: ['phone', 'address', 'company', 'status'],
        valid_statuses: ['Buyer', 'Seller', 'In Contract'],
        sample_count: 3,
        download_url: '/api/import/templates?type=clients'
      },
      {
        type: 'deals',
        name: 'Deal Import Template', 
        description: 'Import deals with title, client, value, status, property details, and expected close date.',
        required_fields: ['title', 'client_name', 'value'],
        optional_fields: ['status', 'property_address', 'property_type', 'expected_close_date'],
        valid_statuses: ['lead', 'active', 'negotiating', 'under_contract', 'won', 'lost'],
        sample_count: 3,
        download_url: '/api/import/templates?type=deals'
      },
      {
        type: 'tasks',
        name: 'Task Import Template',
        description: 'Import tasks with title, description, due date, priority, and assigned client.',
        required_fields: ['title'],
        optional_fields: ['description', 'due_date', 'priority', 'status', 'client_name'],
        valid_priorities: ['Low', 'Medium', 'High'],
        valid_statuses: ['Pending', 'In Progress', 'Completed'],
        sample_count: 3,
        download_url: '/api/import/templates?type=tasks'
      }
    ]

    return NextResponse.json({
      templates,
      instructions: {
        format: 'CSV (Comma Separated Values)',
        requirements: [
          'First row must contain column headers',
          'Use double quotes around fields containing commas',
          'Date format should be YYYY-MM-DD',
          'Phone format can be (555) 123-4567 or 555-123-4567',
          'Status values are case-sensitive'
        ],
        tips: [
          'Download the template file to see the exact format',
          'You can add or remove optional columns as needed',
          'Empty rows will be skipped during import',
          'Invalid data will be reported with row numbers'
        ]
      }
    })

  } catch (error) {
    console.error('Error getting template info:', error)
    return NextResponse.json({ error: 'Failed to get template information' }, { status: 500 })
  }
}