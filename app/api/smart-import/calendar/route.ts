import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CalendarIntegration } from '@/lib/smart-import/calendar-integration'
import { z } from 'zod'

const importCalendarSchema = z.object({
  provider: z.enum(['google', 'outlook', 'apple']),
  accessToken: z.string().min(1, 'Access token is required'),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  eventTypes: z.array(z.string()).optional(),
  options: z.object({
    autoCreateTasks: z.boolean().default(true),
    defaultPriority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
    filterRealEstateOnly: z.boolean().default(true)
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = importCalendarSchema.parse(body)

    const { provider, accessToken, dateRange, eventTypes, options = {} } = validatedData

    try {
      // Fetch calendar events from provider
      let calendarEvents: any[] = []
      
      switch (provider) {
        case 'google':
          calendarEvents = await fetchGoogleCalendarEvents(accessToken, dateRange, eventTypes)
          break
        case 'outlook':
          calendarEvents = await fetchOutlookCalendarEvents(accessToken, dateRange, eventTypes)
          break
        case 'apple':
          // Apple Calendar integration would require additional setup
          return NextResponse.json({
            error: 'Apple Calendar integration not yet supported'
          }, { status: 400 })
        default:
          return NextResponse.json({
            error: 'Unsupported calendar provider'
          }, { status: 400 })
      }

      // Parse events into our format
      const parsedEvents = provider === 'google' 
        ? CalendarIntegration.parseGoogleCalendarEvents(calendarEvents)
        : CalendarIntegration.parseOutlookCalendarEvents(calendarEvents)

      // Process events and create tasks
      const result = await CalendarIntegration.importCalendarEvents(parsedEvents, options)

      // Create tasks if auto-create is enabled
      let createdTasks: any[] = []
      if (result.success && (options as any).autoCreateTasks && result.data) {
        for (const event of result.data) {
          const taskData = CalendarIntegration.convertEventToTask(event, (options as any).defaultPriority || 'Medium')
          
          if (taskData) {
            try {
              // Create task in database
              const { data: task, error: taskError } = await supabase
                .from('tasks')
                .insert({
                  ...taskData,
                  user_id: user.id
                })
                .select()
                .single()

              if (!taskError && task) {
                createdTasks.push(task)
              }
            } catch (taskCreateError) {
              console.warn('Failed to create task from calendar event:', taskCreateError)
            }
          }
        }
      }

      // Log the import attempt
      const { error: logError } = await supabase
        .from('import_logs')
        .insert({
          user_id: user.id,
          import_type: 'calendar',
          status: result.success ? 'success' : 'failed',
          source_data: {
            provider,
            event_count: parsedEvents.length,
            date_range: dateRange,
            event_types: eventTypes
          },
          extracted_data: {
            events: result.data,
            tasks_created: createdTasks.length
          },
          errors: result.errors || null
        })

      if (logError) {
        console.warn('Failed to log import attempt:', logError)
      }

      const summary = CalendarIntegration.generateSyncSummary({
        ...result,
        tasksCreated: createdTasks.length
      })

      return NextResponse.json({
        success: result.success,
        data: result.data,
        errors: result.errors,
        tasksCreated: createdTasks.length,
        clientsLinked: result.clientsLinked,
        summary,
        tasks: createdTasks
      })

    } catch (processingError) {
      console.error('Calendar processing error:', processingError)
      
      // Log failed processing
      const { error: logError } = await supabase
        .from('import_logs')
        .insert({
          user_id: user.id,
          import_type: 'calendar',
          status: 'failed',
          source_data: {
            provider,
            date_range: dateRange,
            event_types: eventTypes
          },
          errors: [processingError instanceof Error ? processingError.message : 'Processing failed']
        })

      if (logError) {
        console.warn('Failed to log import attempt:', logError)
      }

      return NextResponse.json({
        success: false,
        errors: ['Failed to process calendar events'],
        tasksCreated: 0
      }, { status: 500 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Error in POST /api/smart-import/calendar:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const provider = searchParams.get('provider') // google, outlook, apple

    let query = supabase
      .from('import_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('import_type', 'calendar')
      .order('created_at', { ascending: false })

    if (provider) {
      query = query.contains('source_data', { provider })
    }

    const { data: imports, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching calendar import history:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch import history' 
      }, { status: 500 })
    }

    return NextResponse.json({
      imports: imports || [],
      pagination: {
        limit,
        offset,
        total: imports?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in GET /api/smart-import/calendar:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Helper functions for calendar API integration
async function fetchGoogleCalendarEvents(
  accessToken: string, 
  dateRange?: { start: string, end: string }, 
  eventTypes?: string[]
): Promise<any[]> {
  try {
    const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    const params = new URLSearchParams({
      access_token: accessToken,
      orderBy: 'startTime',
      singleEvents: 'true',
      maxResults: '50'
    })

    if (dateRange) {
      params.append('timeMin', dateRange.start)
      params.append('timeMax', dateRange.end)
    }

    const response = await fetch(`${baseUrl}?${params}`)
    
    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`)
    }

    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error)
    throw error
  }
}

async function fetchOutlookCalendarEvents(
  accessToken: string, 
  dateRange?: { start: string, end: string }, 
  eventTypes?: string[]
): Promise<any[]> {
  try {
    const baseUrl = 'https://graph.microsoft.com/v1.0/me/events'
    const params = new URLSearchParams({
      '$top': '50',
      '$orderby': 'start/dateTime'
    })

    if (dateRange) {
      params.append('$filter', `start/dateTime ge '${dateRange.start}' and start/dateTime le '${dateRange.end}'`)
    }

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Outlook Calendar API error: ${response.status}`)
    }

    const data = await response.json()
    return data.value || []
  } catch (error) {
    console.error('Error fetching Outlook Calendar events:', error)
    throw error
  }
}