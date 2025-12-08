import { CalendarEvent, CalendarImportResult } from '@/lib/smart-import/types'
import { Task } from '@/lib/types'

/**
 * Calendar Integration Service
 * Handles calendar sync and automatic task creation from appointments
 */
export class CalendarIntegration {
  private static readonly REAL_ESTATE_EVENT_KEYWORDS = [
    'showing', 'open house', 'inspection', 'closing', 'walk-through',
    'appraisal', 'property', 'listing', 'buyer', 'seller', 'client meeting',
    'contract review', 'signing', 'final walk', 'home inspection'
  ]

  private static readonly EVENT_TYPE_MAPPING: Record<string, Task['type']> = {
    'showing': 'Meeting',
    'open house': 'Meeting', 
    'inspection': 'Meeting',
    'closing': 'Meeting',
    'walk-through': 'Meeting',
    'appraisal': 'Meeting',
    'call': 'Call',
    'phone': 'Call',
    'email': 'Email',
    'follow-up': 'Follow-up',
    'follow up': 'Follow-up',
    'document': 'Document',
    'contract': 'Document',
    'paperwork': 'Document'
  }

  /**
   * Import calendar events and convert to tasks
   */
  static async importCalendarEvents(
    events: CalendarEvent[], 
    options: {
      autoCreateTasks?: boolean
      defaultPriority?: Task['priority']
      filterRealEstateOnly?: boolean
    } = {}
  ): Promise<CalendarImportResult> {
    try {
      const {
        autoCreateTasks = true,
        defaultPriority = 'Medium',
        filterRealEstateOnly = true
      } = options

      // Filter events if requested
      let filteredEvents = events
      if (filterRealEstateOnly) {
        filteredEvents = events.filter(event => this.isRealEstateEvent(event))
      }

      const tasksCreated: Task[] = []
      const clientsLinked: string[] = []

      if (autoCreateTasks) {
        for (const event of filteredEvents) {
          const task = this.convertEventToTask(event, defaultPriority)
          if (task) {
            tasksCreated.push(task)
            
            // Try to link to existing client
            const linkedClient = await this.findMatchingClient(event)
            if (linkedClient) {
              clientsLinked.push(linkedClient)
            }
          }
        }
      }

      return {
        success: true,
        data: filteredEvents,
        tasksCreated: tasksCreated.length,
        clientsLinked: [...new Set(clientsLinked)].length,
        source: 'calendar'
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Calendar import failed'],
        source: 'calendar'
      }
    }
  }

  /**
   * Check if calendar event is real estate related
   */
  static isRealEstateEvent(event: CalendarEvent): boolean {
    const searchText = `${event.title} ${event.description || ''} ${event.location || ''}`.toLowerCase()
    
    return this.REAL_ESTATE_EVENT_KEYWORDS.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    )
  }

  /**
   * Convert calendar event to task
   */
  static convertEventToTask(event: CalendarEvent, defaultPriority: Task['priority']): Partial<Task> | null {
    try {
      // Determine task type based on event title/description
      const taskType = this.determineTaskType(event)
      
      // Calculate priority based on event timing and type
      const priority = this.calculateTaskPriority(event, defaultPriority)

      // Extract client information from event
      const clientInfo = this.extractClientInfo(event)

      const task: Partial<Task> = {
        title: this.generateTaskTitle(event),
        description: this.generateTaskDescription(event),
        dueDate: event.startTime.toISOString(),
        priority,
        status: 'Pending',
        type: taskType,
        // Client linking will be handled by the API endpoint
        ...(clientInfo.clientId && { clientId: clientInfo.clientId })
      }

      return task
    } catch (error) {
      console.error('Error converting event to task:', error)
      return null
    }
  }

  /**
   * Determine task type from event content
   */
  private static determineTaskType(event: CalendarEvent): Task['type'] {
    const searchText = `${event.title} ${event.description || ''}`.toLowerCase()
    
    for (const [keyword, taskType] of Object.entries(this.EVENT_TYPE_MAPPING)) {
      if (searchText.includes(keyword)) {
        return taskType
      }
    }

    // Default based on event type
    if (event.eventType) {
      switch (event.eventType) {
        case 'showing':
        case 'meeting':
        case 'inspection':
        case 'closing':
          return 'Meeting'
        case 'call':
          return 'Call'
        default:
          return 'Other'
      }
    }

    return 'Meeting' // Default for calendar events
  }

  /**
   * Calculate task priority based on event details
   */
  private static calculateTaskPriority(event: CalendarEvent, defaultPriority: Task['priority']): Task['priority'] {
    const searchText = `${event.title} ${event.description || ''}`.toLowerCase()
    const now = new Date()
    const timeDiff = event.startTime.getTime() - now.getTime()
    const hoursUntilEvent = timeDiff / (1000 * 60 * 60)

    // High priority keywords
    const highPriorityKeywords = ['closing', 'contract signing', 'final walk', 'urgent', 'asap']
    if (highPriorityKeywords.some(keyword => searchText.includes(keyword))) {
      return 'High'
    }

    // Time-based priority
    if (hoursUntilEvent <= 24) {
      return 'High' // Less than 24 hours
    } else if (hoursUntilEvent <= 72) {
      return 'Medium' // Less than 3 days
    }

    return defaultPriority
  }

  /**
   * Generate appropriate task title from calendar event
   */
  private static generateTaskTitle(event: CalendarEvent): string {
    let title = event.title

    // Clean up title for task context
    const cleanupPatterns = [
      /^(prepare\s+for\s+)?/i,
      /\s*-\s*calendar\s*$/i,
      /\s*\(.*\)\s*$/
    ]

    cleanupPatterns.forEach(pattern => {
      title = title.replace(pattern, '')
    })

    // Ensure task-oriented language
    if (!title.match(/^(prepare|attend|complete|follow|call|email|meet)/i)) {
      if (event.eventType === 'showing' || title.toLowerCase().includes('showing')) {
        title = `Attend property showing: ${title}`
      } else if (event.eventType === 'closing' || title.toLowerCase().includes('closing')) {
        title = `Attend closing: ${title}`
      } else if (title.toLowerCase().includes('call')) {
        title = `Complete ${title}`
      } else {
        title = `Attend ${title}`
      }
    }

    return title.trim()
  }

  /**
   * Generate task description from calendar event
   */
  private static generateTaskDescription(event: CalendarEvent): string {
    const parts: string[] = []

    if (event.description && event.description !== event.title) {
      parts.push(event.description)
    }

    if (event.location) {
      parts.push(`Location: ${event.location}`)
    }

    if (event.attendees && event.attendees.length > 0) {
      parts.push(`Attendees: ${event.attendees.join(', ')}`)
    }

    // Add time information
    const startTime = event.startTime.toLocaleString()
    const endTime = event.endTime.toLocaleString()
    parts.push(`Scheduled: ${startTime} - ${endTime}`)

    parts.push('📅 Auto-created from calendar event')

    return parts.join('\n\n')
  }

  /**
   * Extract client information from event details
   */
  private static extractClientInfo(event: CalendarEvent): { 
    clientId?: string 
    clientName?: string 
    clientEmail?: string 
  } {
    const result: { clientId?: string, clientName?: string, clientEmail?: string } = {}

    // Extract from attendees
    if (event.attendees) {
      for (const attendee of event.attendees) {
        if (attendee.includes('@') && !this.isInternalEmail(attendee)) {
          result.clientEmail = attendee
          break
        }
      }
    }

    // Extract name from title or description
    const namePatterns = [
      /(?:with|for|client)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:showing|meeting|call)/i
    ]

    const searchText = `${event.title} ${event.description || ''}`
    for (const pattern of namePatterns) {
      const match = searchText.match(pattern)
      if (match && match[1]) {
        result.clientName = match[1].trim()
        break
      }
    }

    return result
  }

  /**
   * Check if email is internal (agent/team email)
   */
  private static isInternalEmail(email: string): boolean {
    // This would be configured based on the agent's domain/team
    const internalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com'] // Basic check
    return internalDomains.some(domain => email.toLowerCase().includes(domain))
  }

  /**
   * Find matching client based on event information
   */
  private static async findMatchingClient(event: CalendarEvent): Promise<string | null> {
    try {
      const clientInfo = this.extractClientInfo(event)
      
      if (!clientInfo.clientEmail && !clientInfo.clientName) {
        return null
      }

      // This would typically make an API call to find matching clients
      // For now, return null (will be implemented in the API endpoint)
      return null
    } catch (error) {
      console.error('Error finding matching client:', error)
      return null
    }
  }

  /**
   * Parse Google Calendar API response
   */
  static parseGoogleCalendarEvents(googleEvents: any[]): CalendarEvent[] {
    return googleEvents.map(event => ({
      id: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description,
      startTime: new Date(event.start?.dateTime || event.start?.date),
      endTime: new Date(event.end?.dateTime || event.end?.date),
      location: event.location,
      attendees: event.attendees?.map((attendee: any) => attendee.email) || [],
      eventType: this.inferEventType(event.summary, event.description)
    }))
  }

  /**
   * Parse Outlook Calendar API response
   */
  static parseOutlookCalendarEvents(outlookEvents: any[]): CalendarEvent[] {
    return outlookEvents.map(event => ({
      id: event.id,
      title: event.subject || 'Untitled Event',
      description: event.body?.content,
      startTime: new Date(event.start?.dateTime),
      endTime: new Date(event.end?.dateTime),
      location: event.location?.displayName,
      attendees: event.attendees?.map((attendee: any) => attendee.emailAddress?.address) || [],
      eventType: this.inferEventType(event.subject, event.body?.content)
    }))
  }

  /**
   * Infer event type from title and description
   */
  private static inferEventType(title?: string, description?: string): CalendarEvent['eventType'] {
    const searchText = `${title || ''} ${description || ''}`.toLowerCase()

    if (searchText.includes('showing') || searchText.includes('show house')) return 'showing'
    if (searchText.includes('meeting')) return 'meeting'
    if (searchText.includes('call') || searchText.includes('phone')) return 'call'
    if (searchText.includes('inspection')) return 'inspection'
    if (searchText.includes('closing')) return 'closing'

    return 'other'
  }

  /**
   * Generate calendar sync summary
   */
  static generateSyncSummary(result: CalendarImportResult): string {
    if (!result.success) {
      return `Calendar sync failed: ${result.errors?.join(', ') || 'Unknown error'}`
    }

    const parts: string[] = []
    
    if (result.data && result.data.length > 0) {
      parts.push(`${result.data.length} calendar events processed`)
    }

    if (result.tasksCreated && result.tasksCreated > 0) {
      parts.push(`${result.tasksCreated} tasks created`)
    }

    if (result.clientsLinked && result.clientsLinked > 0) {
      parts.push(`${result.clientsLinked} clients linked`)
    }

    return parts.length > 0 ? parts.join(', ') : 'No events processed'
  }
}