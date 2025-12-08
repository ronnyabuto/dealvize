import { createClient } from '@/lib/supabase/server'

export interface ActivityData {
  client_id: string
  activity_type: string
  activity_data?: any
  source?: string
  user_id?: string
}

/**
 * Record a lead activity that will trigger automatic lead scoring
 */
export async function recordLeadActivity(data: ActivityData) {
  try {
    const supabase = await createClient()
    
    // Get the current user if not provided
    let userId = data.user_id
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      userId = user.id
    }

    // Insert the activity (triggers will handle score calculation)
    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert({
        user_id: userId,
        client_id: data.client_id,
        activity_type: data.activity_type,
        activity_data: data.activity_data || {},
        source: data.source || 'system'
      })
      .select()
      .single()

    if (error) {
      console.error('Error recording lead activity:', error)
      return { success: false, error: error.message }
    }

    // Get the updated lead score
    const { data: leadScore } = await supabase
      .from('lead_scores')
      .select('current_score, score_category')
      .eq('user_id', userId)
      .eq('client_id', data.client_id)
      .single()

    return {
      success: true,
      activity,
      updated_score: leadScore
    }
  } catch (error) {
    console.error('Error in recordLeadActivity:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Initialize default scoring rules for a user
 */
export async function initializeDefaultScoringRules(userId: string) {
  try {
    const supabase = await createClient()

    const defaultRules = [
      {
        rule_name: 'Email Opened',
        rule_type: 'engagement',
        trigger_event: 'email_opened',
        score_impact: 5,
        priority: 1
      },
      {
        rule_name: 'Email Link Clicked',
        rule_type: 'engagement',
        trigger_event: 'email_link_clicked',
        score_impact: 10,
        priority: 2
      },
      {
        rule_name: 'Property Viewed',
        rule_type: 'behavioral',
        trigger_event: 'property_viewed',
        score_impact: 15,
        priority: 3
      },
      {
        rule_name: 'Contact Form Submitted',
        rule_type: 'behavioral',
        trigger_event: 'form_submitted',
        score_impact: 25,
        priority: 5
      },
      {
        rule_name: 'Phone Call Made',
        rule_type: 'engagement',
        trigger_event: 'phone_call_made',
        score_impact: 20,
        priority: 4
      },
      {
        rule_name: 'Meeting Scheduled',
        rule_type: 'engagement',
        trigger_event: 'meeting_scheduled',
        score_impact: 30,
        priority: 6
      },
      {
        rule_name: 'Website Visit',
        rule_type: 'behavioral',
        trigger_event: 'website_visit',
        score_impact: 2,
        priority: 1
      },
      {
        rule_name: 'Deal Created',
        rule_type: 'behavioral',
        trigger_event: 'deal_created',
        score_impact: 40,
        priority: 7
      },
      {
        rule_name: 'Lead Created',
        rule_type: 'demographic',
        trigger_event: 'lead_created',
        score_impact: 10,
        priority: 1
      }
    ]

    const rulesWithUserId = defaultRules.map(rule => ({
      ...rule,
      user_id: userId
    }))

    const { error } = await supabase
      .from('scoring_rules')
      .insert(rulesWithUserId)

    if (error && !error.message.includes('duplicate')) {
      console.error('Error initializing scoring rules:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in initializeDefaultScoringRules:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Initialize default lead segments for a user
 */
export async function initializeDefaultLeadSegments(userId: string) {
  try {
    const supabase = await createClient()

    const defaultSegments = [
      {
        segment_name: 'Hot Leads',
        description: 'Highly engaged leads ready for contact',
        criteria: { score_min: 60, score_max: 100 },
        color: 'red',
        auto_assign: true,
        priority: 4
      },
      {
        segment_name: 'Warm Leads',
        description: 'Moderately engaged leads with potential',
        criteria: { score_min: 30, score_max: 59 },
        color: 'orange',
        auto_assign: true,
        priority: 3
      },
      {
        segment_name: 'Cold Leads',
        description: 'Low engagement leads needing nurturing',
        criteria: { score_min: 0, score_max: 29 },
        color: 'blue',
        auto_assign: true,
        priority: 2
      },
      {
        segment_name: 'Qualified Leads',
        description: 'Leads ready for sales process',
        criteria: { score_min: 80, score_max: 100 },
        color: 'green',
        auto_assign: true,
        priority: 5
      },
      {
        segment_name: 'New Leads',
        description: 'Recently added leads requiring initial contact',
        criteria: { days_since_created: 7 },
        color: 'purple',
        auto_assign: true,
        priority: 1
      }
    ]

    const segmentsWithUserId = defaultSegments.map(segment => ({
      ...segment,
      user_id: userId
    }))

    const { error } = await supabase
      .from('lead_segments')
      .insert(segmentsWithUserId)

    if (error && !error.message.includes('duplicate')) {
      console.error('Error initializing lead segments:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in initializeDefaultLeadSegments:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Helper function to track common CRM activities
 */
export const LeadScoringActivities = {
  // Email activities
  emailOpened: (clientId: string, emailId?: string) => ({
    client_id: clientId,
    activity_type: 'email_opened',
    activity_data: { email_id: emailId },
    source: 'email'
  }),

  emailLinkClicked: (clientId: string, emailId?: string, linkUrl?: string) => ({
    client_id: clientId,
    activity_type: 'email_link_clicked',
    activity_data: { email_id: emailId, link_url: linkUrl },
    source: 'email'
  }),

  // Behavioral activities
  propertyViewed: (clientId: string, propertyId?: string) => ({
    client_id: clientId,
    activity_type: 'property_viewed',
    activity_data: { property_id: propertyId },
    source: 'website'
  }),

  formSubmitted: (clientId: string, formType?: string) => ({
    client_id: clientId,
    activity_type: 'form_submitted',
    activity_data: { form_type: formType },
    source: 'website'
  }),

  websiteVisit: (clientId: string, page?: string) => ({
    client_id: clientId,
    activity_type: 'website_visit',
    activity_data: { page },
    source: 'website'
  }),

  // Engagement activities
  phoneCallMade: (clientId: string, duration?: number, outcome?: string) => ({
    client_id: clientId,
    activity_type: 'phone_call_made',
    activity_data: { duration, outcome },
    source: 'phone'
  }),

  meetingScheduled: (clientId: string, meetingDate?: string, meetingType?: string) => ({
    client_id: clientId,
    activity_type: 'meeting_scheduled',
    activity_data: { meeting_date: meetingDate, meeting_type: meetingType },
    source: 'calendar'
  }),

  // CRM activities
  dealCreated: (clientId: string, dealId?: string, dealValue?: number) => ({
    client_id: clientId,
    activity_type: 'deal_created',
    activity_data: { deal_id: dealId, deal_value: dealValue },
    source: 'crm'
  }),

  taskCompleted: (clientId: string, taskId?: string, taskType?: string) => ({
    client_id: clientId,
    activity_type: 'task_completed',
    activity_data: { task_id: taskId, task_type: taskType },
    source: 'crm'
  }),

  // Social activities
  socialInteraction: (clientId: string, platform?: string, interactionType?: string) => ({
    client_id: clientId,
    activity_type: 'social_interaction',
    activity_data: { platform, interaction_type: interactionType },
    source: 'social'
  }),

  // Lead lifecycle activities
  leadCreated: (clientId: string, initialStatus?: string) => ({
    client_id: clientId,
    activity_type: 'lead_created',
    activity_data: { initial_status: initialStatus },
    source: 'crm'
  })
}