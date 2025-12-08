// Smart Automation Actions
export interface AutomationRule {
  id: string
  name: string
  description: string
  trigger: {
    type: 'deal_stage_change' | 'client_added' | 'task_overdue' | 'date_based'
    condition: string
    value?: string
  }
  actions: {
    type: 'create_task' | 'send_notification' | 'update_field' | 'send_email'
    params: Record<string, any>
  }[]
  active: boolean
  created_at: string
}

// Predefined automation templates
export const automationTemplates = {
  clientFollowUp: {
    name: 'New Client Follow-up',
    description: 'Automatically create follow-up tasks for new clients',
    trigger: {
      type: 'client_added' as const,
      condition: 'new_client',
    },
    actions: [{
      type: 'create_task' as const,
      params: {
        title: 'Welcome call with {{client_name}}',
        description: 'Initial consultation and needs assessment',
        due_date_offset: 1, // 1 day from now
        priority: 'High'
      }
    }, {
      type: 'create_task' as const,
      params: {
        title: 'Follow-up email to {{client_name}}',
        description: 'Send market update and available properties',
        due_date_offset: 3, // 3 days from now
        priority: 'Medium'
      }
    }]
  },

  dealStageAutomation: {
    name: 'Deal Stage Tasks',
    description: 'Auto-create tasks when deals reach specific stages',
    trigger: {
      type: 'deal_stage_change' as const,
      condition: 'stage_equals',
      value: 'Under Contract'
    },
    actions: [{
      type: 'create_task' as const,
      params: {
        title: 'Schedule inspection for {{deal_title}}',
        description: 'Coordinate home inspection with client and inspector',
        due_date_offset: 2,
        priority: 'High'
      }
    }, {
      type: 'create_task' as const,
      params: {
        title: 'Order appraisal for {{deal_title}}',
        description: 'Contact appraiser and schedule property appraisal',
        due_date_offset: 1,
        priority: 'High'
      }
    }, {
      type: 'send_notification' as const,
      params: {
        message: '🎉 Deal "{{deal_title}}" is now under contract! Check your new tasks.',
        type: 'success'
      }
    }]
  },

  closingReminders: {
    name: 'Closing Date Alerts',
    description: 'Get reminded before important closing dates',
    trigger: {
      type: 'date_based' as const,
      condition: 'days_before_closing',
      value: '7'
    },
    actions: [{
      type: 'create_task' as const,
      params: {
        title: 'Closing preparation for {{deal_title}}',
        description: 'Review documents, confirm wire details, schedule final walkthrough',
        due_date_offset: 0,
        priority: 'High'
      }
    }, {
      type: 'send_notification' as const,
      params: {
        message: '📅 Deal "{{deal_title}}" closes in 7 days! Preparation checklist created.',
        type: 'warning'
      }
    }]
  },

  leadScoring: {
    name: 'Smart Lead Scoring',
    description: 'Automatically score leads based on engagement',
    trigger: {
      type: 'client_added' as const,
      condition: 'new_client'
    },
    actions: [{
      type: 'update_field' as const,
      params: {
        field: 'lead_score',
        value: 'calculate_based_on_activity'
      }
    }]
  }
}

// Automation execution functions
export const executeAutomation = {
  async createClientFollowUp(clientId: string, clientName: string) {
    // Create follow-up tasks for new client
    const tasks = [
      {
        title: `Welcome call with ${clientName}`,
        description: 'Initial consultation and needs assessment',
        client_id: clientId,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        priority: 'High',
        type: 'Call'
      },
      {
        title: `Follow-up email to ${clientName}`,
        description: 'Send market update and available properties',
        client_id: clientId,
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        priority: 'Medium',
        type: 'Email'
      }
    ]

    // In a real implementation, this would create tasks via API
    console.log('Creating follow-up tasks:', tasks)
    return tasks
  },

  async createDealStageTasks(dealId: string, dealTitle: string, stage: string) {
    if (stage === 'Under Contract') {
      const tasks = [
        {
          title: `Schedule inspection for ${dealTitle}`,
          description: 'Coordinate home inspection with client and inspector',
          deal_id: dealId,
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
          priority: 'High',
          type: 'Meeting'
        },
        {
          title: `Order appraisal for ${dealTitle}`,
          description: 'Contact appraiser and schedule property appraisal',
          deal_id: dealId,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          priority: 'High',
          type: 'Document'
        }
      ]

      console.log('Creating deal stage tasks:', tasks)
      return tasks
    }
    return []
  },

  async setupClosingReminders(dealId: string, dealTitle: string, closingDate: Date) {
    const reminderDate = new Date(closingDate.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days before

    const reminder = {
      title: `Closing preparation for ${dealTitle}`,
      description: 'Review documents, confirm wire details, schedule final walkthrough',
      deal_id: dealId,
      due_date: reminderDate,
      priority: 'High',
      type: 'Document'
    }

    console.log('Setting up closing reminder:', reminder)
    return reminder
  },

  async enableSmartNotifications() {
    // Enable various smart notifications
    const notifications = [
      'Deal milestone alerts',
      'Overdue task reminders', 
      'Lead activity notifications',
      'Market opportunity alerts'
    ]

    console.log('Enabling smart notifications:', notifications)
    return notifications
  }
}

// Context-aware suggestion generator
export const generateSmartSuggestions = (context: {
  page: string
  userActivity: any
  recentData: any
}) => {
  const suggestions = []

  // Add suggestions based on user's current context
  if (context.page.includes('clients') && context.recentData?.newClients > 0) {
    suggestions.push({
      id: 'bulk-client-automation',
      title: 'Bulk Client Setup',
      description: `Set up follow-up automation for your ${context.recentData.newClients} new clients`,
      priority: 'high',
      action: () => executeAutomation.createClientFollowUp
    })
  }

  return suggestions
}