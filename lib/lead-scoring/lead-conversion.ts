/**
 * Lead Conversion Service - Industry Standard Lead-to-Deal Conversion
 * Implements best practices from Salesforce, HubSpot, Pipedrive
 * 
 * Lead Lifecycle: Client → Lead Scoring → Qualified Lead → Deal Creation
 */

import { createClient } from '@/lib/supabase/server'
import { LeadScoringService } from '@/lib/lead-scoring/lead-service'

export interface LeadConversionResult {
  success: boolean
  dealId?: string
  error?: string
  leadScore?: number
}

export interface ConversionCriteria {
  minScore: number
  requiredActivities: string[]
  timeThreshold?: number // days since last activity
}

/**
 * Lead Conversion Service following industry best practices
 */
export class LeadConversionService {
  
  /**
   * Default qualification criteria (can be customized per user)
   */
  static DEFAULT_CRITERIA: ConversionCriteria = {
    minScore: 60,
    requiredActivities: ['email_opened', 'property_viewed'],
    timeThreshold: 30
  }

  /**
   * Checks if a lead is ready for conversion to deal
   */
  static async isLeadQualified(userId: string, clientId: string, criteria?: ConversionCriteria): Promise<boolean> {
    try {
      const supabase = await createClient()
      const conversionCriteria = criteria || this.DEFAULT_CRITERIA

      // Get lead score
      const leadScore = await LeadScoringService.getLeadScore(userId, clientId)
      if (!leadScore) return false

      // Check minimum score threshold
      if (leadScore.current_score < conversionCriteria.minScore) return false

      // Check for required activities
      const { data: activities } = await supabase
        .from('lead_activities')
        .select('activity_type, created_at')
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (!activities || activities.length === 0) return false

      // Check if required activities exist
      const activityTypes = new Set(activities.map(a => a.activity_type))
      const hasRequiredActivities = conversionCriteria.requiredActivities.some(required => 
        activityTypes.has(required)
      )

      if (!hasRequiredActivities) return false

      // Check time threshold (recent activity)
      if (conversionCriteria.timeThreshold) {
        const thresholdDate = new Date()
        thresholdDate.setDate(thresholdDate.getDate() - conversionCriteria.timeThreshold)
        
        const recentActivity = activities.some(activity => 
          new Date(activity.created_at) >= thresholdDate
        )
        
        if (!recentActivity) return false
      }

      return true
    } catch (error) {
      console.error('Error checking lead qualification:', error)
      return false
    }
  }

  /**
   * Converts a qualified lead to a deal (industry standard process)
   */
  static async convertLeadToDeal(
    userId: string, 
    clientId: string, 
    dealData: {
      title: string
      value?: number
      expected_close_date?: string
      property_address?: string
      property_type?: string
    }
  ): Promise<LeadConversionResult> {
    try {
      const supabase = await createClient()

      // Verify lead is qualified
      const isQualified = await this.isLeadQualified(userId, clientId)
      if (!isQualified) {
        return {
          success: false,
          error: 'Lead does not meet qualification criteria for conversion'
        }
      }

      // Get current lead score for reference
      const leadScore = await LeadScoringService.getLeadScore(userId, clientId)

      // Check if client already has an active deal
      const { data: existingDeals } = await supabase
        .from('deals')
        .select('id, status')
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .in('status', ['Qualified', 'In Progress', 'Under Contract'])

      if (existingDeals && existingDeals.length > 0) {
        return {
          success: false,
          error: 'Client already has an active deal'
        }
      }

      // Create the deal (converted from lead)
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          ...dealData,
          client_id: clientId,
          user_id: userId,
          status: 'Qualified', // Industry standard: qualified leads become qualified deals
          probability: Math.min(leadScore?.current_score || 50, 90), // Use lead score for initial probability
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (dealError) {
        return {
          success: false,
          error: `Failed to create deal: ${dealError.message}`
        }
      }

      // Record lead conversion activity
      await LeadScoringService.recordActivityWithScoring(
        userId,
        {
          client_id: clientId,
          activity_type: 'lead_converted',
          activity_data: {
            deal_id: deal.id,
            deal_title: dealData.title,
            conversion_score: leadScore?.current_score,
            deal_value: dealData.value
          },
          source: 'conversion'
        }
      )

      // Update lead score to reflect conversion
      if (leadScore) {
        await supabase
          .from('lead_scores')
          .update({
            score_category: 'qualified',
            current_score: Math.min(leadScore.current_score + 20, 100), // Bonus for conversion
            last_activity_date: new Date().toISOString(),
            last_score_change: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('client_id', clientId)
      }

      return {
        success: true,
        dealId: deal.id,
        leadScore: leadScore?.current_score
      }

    } catch (error) {
      console.error('Error converting lead to deal:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Gets leads ready for conversion (SQL - Sales Qualified Leads)
   */
  static async getQualifiedLeads(userId: string, criteria?: ConversionCriteria): Promise<any[]> {
    try {
      const supabase = await createClient()
      const conversionCriteria = criteria || this.DEFAULT_CRITERIA

      // Get all leads with scores above threshold
      const { data: leadScores } = await supabase
        .from('lead_scores')
        .select(`
          *,
          client:clients(id, name, email, phone, status)
        `)
        .eq('user_id', userId)
        .gte('current_score', conversionCriteria.minScore)
        .order('current_score', { ascending: false })

      if (!leadScores) return []

      // Filter leads that don't already have active deals
      const { data: existingDeals } = await supabase
        .from('deals')
        .select('client_id')
        .eq('user_id', userId)
        .in('status', ['Qualified', 'In Progress', 'Under Contract'])

      const dealsClientIds = new Set(existingDeals?.map(d => d.client_id) || [])

      // Filter and check qualification criteria
      const qualifiedLeads = []
      for (const leadScore of leadScores) {
        // Skip if already has active deal
        if (dealsClientIds.has(leadScore.client_id)) continue

        // Check full qualification criteria
        const isQualified = await this.isLeadQualified(userId, leadScore.client_id, conversionCriteria)
        if (isQualified) {
          qualifiedLeads.push({
            ...leadScore,
            ready_for_conversion: true,
            qualification_score: leadScore.current_score
          })
        }
      }

      return qualifiedLeads
    } catch (error) {
      console.error('Error getting qualified leads:', error)
      return []
    }
  }

  /**
   * Auto-converts highly qualified leads (automation feature)
   */
  static async autoConvertQualifiedLeads(userId: string): Promise<{
    converted: number
    failed: number
    errors: string[]
  }> {
    try {
      const qualifiedLeads = await this.getQualifiedLeads(userId, {
        minScore: 80, // Higher threshold for auto-conversion
        requiredActivities: ['email_opened', 'property_viewed', 'form_submitted'],
        timeThreshold: 7 // Recent activity within 7 days
      })

      const results = {
        converted: 0,
        failed: 0,
        errors: [] as string[]
      }

      for (const lead of qualifiedLeads) {
        try {
          const conversionResult = await this.convertLeadToDeal(
            userId,
            lead.client_id,
            {
              title: `Opportunity for ${lead.client.name}`,
              value: 0, // Default value, can be updated later
              property_address: ''
            }
          )

          if (conversionResult.success) {
            results.converted++
          } else {
            results.failed++
            results.errors.push(`${lead.client.name}: ${conversionResult.error}`)
          }
        } catch (error) {
          results.failed++
          results.errors.push(`${lead.client.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return results
    } catch (error) {
      console.error('Error in auto-conversion:', error)
      return {
        converted: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
}

// Convenience exports
export const isLeadQualified = LeadConversionService.isLeadQualified
export const convertLeadToDeal = LeadConversionService.convertLeadToDeal
export const getQualifiedLeads = LeadConversionService.getQualifiedLeads