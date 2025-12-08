import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SAMPLE_DATA = {
  clients: [
    {
      name: 'John & Sarah Martinez',
      email: 'john.martinez@email.com',
      phone: '+1 (555) 123-4567',
      address: '1234 Oak Street, Beverly Hills, CA 90210',
      company: 'Martinez Family Trust',
      status: 'Buyer'
    },
    {
      name: 'Emily Chen',
      email: 'emily.chen@gmail.com',
      phone: '+1 (555) 234-5678',
      address: '5678 Pine Avenue, Manhattan Beach, CA 90266',
      company: 'Tech Startup CEO',
      status: 'Seller'
    },
    {
      name: 'Robert & Lisa Thompson',
      email: 'rthompson@email.com',
      phone: '+1 (555) 345-6789',
      address: '9012 Maple Drive, Malibu, CA 90265',
      company: 'Thompson Investments',
      status: 'Buyer'
    },
    {
      name: 'David Wilson',
      email: 'david.wilson@outlook.com',
      phone: '+1 (555) 456-7890',
      address: '3456 Cedar Lane, Santa Monica, CA 90401',
      company: 'Wilson Real Estate Holdings',
      status: 'In Contract'
    },
    {
      name: 'Jessica & Mark Rodriguez',
      email: 'jessica.rodriguez@email.com',
      phone: '+1 (555) 567-8901',
      address: '7890 Elm Street, Pasadena, CA 91101',
      company: 'Rodriguez Family',
      status: 'Buyer'
    }
  ],
  
  deals: [
    {
      title: 'Beverly Hills Luxury Home - Martinez Family',
      value: 2850000,
      stage: 'negotiating',
      status: 'active',
      probability: 75,
      expected_close_date: '2025-02-15'
    },
    {
      title: 'Manhattan Beach Condo - Chen Property',
      value: 1650000,
      stage: 'listing',
      status: 'active', 
      probability: 90,
      expected_close_date: '2025-01-30'
    },
    {
      title: 'Malibu Ocean View Estate - Thompson Purchase',
      value: 4200000,
      stage: 'qualified',
      status: 'active',
      probability: 60,
      expected_close_date: '2025-03-20'
    },
    {
      title: 'Santa Monica Investment Property - Wilson',
      value: 1950000,
      stage: 'contract',
      status: 'active',
      probability: 95,
      expected_close_date: '2025-01-25'
    },
    {
      title: 'Pasadena Family Home - Rodriguez',
      value: 875000,
      stage: 'prospect',
      status: 'active',
      probability: 40,
      expected_close_date: '2025-04-10'
    }
  ],
  
  tasks: [
    {
      title: 'Schedule final walkthrough with Martinez family',
      description: 'Coordinate final property inspection before closing on Beverly Hills home',
      due_date: '2025-01-18T14:00:00Z',
      priority: 'high',
      status: 'pending',
      task_type: 'appointment'
    },
    {
      title: 'Upload marketing photos for Chen listing',
      description: 'Professional photography session completed, need to upload to MLS',
      due_date: '2025-01-16T09:00:00Z',
      priority: 'medium',
      status: 'pending',
      task_type: 'marketing'
    },
    {
      title: 'Send property disclosures to Thompson buyers',
      description: 'Compile and send all required seller disclosures for Malibu property',
      due_date: '2025-01-17T12:00:00Z',
      priority: 'high',
      status: 'pending',
      task_type: 'documentation'
    },
    {
      title: 'Follow up with Wilson on financing pre-approval',
      description: 'Check status of loan application and coordinate with lender',
      due_date: '2025-01-15T16:00:00Z',
      priority: 'urgent',
      status: 'pending',
      task_type: 'financing'
    },
    {
      title: 'Research comparable sales for Rodriguez budget',
      description: 'Prepare CMA for Pasadena area properties under $900k',
      due_date: '2025-01-19T10:00:00Z',
      priority: 'medium',
      status: 'pending',
      task_type: 'research'
    },
    {
      title: 'Schedule open house for Chen property',
      description: 'Coordinate weekend open house for Manhattan Beach condo listing',
      due_date: '2025-01-20T11:00:00Z',
      priority: 'medium',
      status: 'pending',
      task_type: 'marketing'
    },
    {
      title: 'Prepare closing documents for Wilson deal',
      description: 'Draft HUD-1, deed, and coordinate with title company',
      due_date: '2025-01-22T14:00:00Z',
      priority: 'high',
      status: 'in_progress',
      task_type: 'closing'
    }
  ]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to add sample data' 
      }, { status: 401 })
    }

    const results = {
      clients: { created: 0, errors: [] },
      deals: { created: 0, errors: [] },
      tasks: { created: 0, errors: [] }
    }

    // Insert clients
    console.log('Inserting sample clients...')
    for (const client of SAMPLE_DATA.clients) {
      try {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            ...client,
            user_id: user.id
          })
          .select()

        if (error) {
          results.clients.errors.push(`${client.name}: ${error.message}`)
        } else {
          results.clients.created++
          console.log(`✅ Created client: ${client.name}`)
        }
      } catch (err: any) {
        results.clients.errors.push(`${client.name}: ${err.message}`)
      }
    }

    // Get created client IDs for deals and tasks
    const { data: createdClients } = await supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', user.id)

    const clientMap = new Map(createdClients?.map(c => [c.name, c.id]) || [])

    // Insert deals
    console.log('Inserting sample deals...')
    for (let i = 0; i < SAMPLE_DATA.deals.length; i++) {
      const deal = SAMPLE_DATA.deals[i]
      const clientName = SAMPLE_DATA.clients[i]?.name
      const client_id = clientMap.get(clientName)

      try {
        const { data, error } = await supabase
          .from('deals')
          .insert({
            ...deal,
            user_id: user.id,
            client_id
          })
          .select()

        if (error) {
          results.deals.errors.push(`${deal.title}: ${error.message}`)
        } else {
          results.deals.created++
          console.log(`✅ Created deal: ${deal.title}`)
        }
      } catch (err: any) {
        results.deals.errors.push(`${deal.title}: ${err.message}`)
      }
    }

    // Insert tasks
    console.log('Inserting sample tasks...')
    for (let i = 0; i < SAMPLE_DATA.tasks.length; i++) {
      const task = SAMPLE_DATA.tasks[i]
      const clientName = SAMPLE_DATA.clients[i % SAMPLE_DATA.clients.length]?.name
      const client_id = clientMap.get(clientName)

      try {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            ...task,
            user_id: user.id,
            client_id
          })
          .select()

        if (error) {
          results.tasks.errors.push(`${task.title}: ${error.message}`)
        } else {
          results.tasks.created++
          console.log(`✅ Created task: ${task.title}`)
        }
      } catch (err: any) {
        results.tasks.errors.push(`${task.title}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sample data created successfully!',
      results,
      summary: {
        totalCreated: results.clients.created + results.deals.created + results.tasks.created,
        clientsCreated: results.clients.created,
        dealsCreated: results.deals.created,
        tasksCreated: results.tasks.created
      }
    })

  } catch (error: any) {
    console.error('Sample data creation error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create sample data',
      message: error.message
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to delete sample data' 
      }, { status: 401 })
    }

    const results = {
      clients: { deleted: 0, errors: [] },
      deals: { deleted: 0, errors: [] },
      tasks: { deleted: 0, errors: [] }
    }

    // Delete tasks first (due to foreign key constraints)
    console.log('Deleting all tasks...')
    const { error: tasksError, count: tasksCount } = await supabase
      .from('tasks')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)

    if (tasksError) {
      results.tasks.errors.push(tasksError.message)
    } else {
      results.tasks.deleted = tasksCount || 0
      console.log(`✅ Deleted ${tasksCount} tasks`)
    }

    // Delete deals
    console.log('Deleting all deals...')
    const { error: dealsError, count: dealsCount } = await supabase
      .from('deals')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)

    if (dealsError) {
      results.deals.errors.push(dealsError.message)
    } else {
      results.deals.deleted = dealsCount || 0
      console.log(`✅ Deleted ${dealsCount} deals`)
    }

    // Delete clients last
    console.log('Deleting all clients...')
    const { error: clientsError, count: clientsCount } = await supabase
      .from('clients')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)

    if (clientsError) {
      results.clients.errors.push(clientsError.message)
    } else {
      results.clients.deleted = clientsCount || 0
      console.log(`✅ Deleted ${clientsCount} clients`)
    }

    return NextResponse.json({
      success: true,
      message: 'All data deleted successfully!',
      results,
      summary: {
        totalDeleted: results.clients.deleted + results.deals.deleted + results.tasks.deleted,
        clientsDeleted: results.clients.deleted,
        dealsDeleted: results.deals.deleted,
        tasksDeleted: results.tasks.deleted
      }
    })

  } catch (error: any) {
    console.error('Sample data deletion error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete sample data',
      message: error.message
    }, { status: 500 })
  }
}