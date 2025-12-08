/**
 * Lead Scoring Service - Centralized Lead Management
 * Implements industry best practices for lead lifecycle automation
 * 
 * This service provides a future-proof solution that:
 * 1. Automatically initializes lead scoring for new clients
 * 2. Ensures lead scores exist before recording activities
 * 3. Provides centralized lead scoring logic
 * 4. Follows enterprise-grade error handling patterns
 */

import { createClient } from '@/lib/supabase/server'
import { initializeDefaultScoringRules, initializeDefaultLeadSegments, recordLeadActivity } from '@/lib/lead-scoring-utils'

export interface LeadScoreEntry {
  id?: string
  user_id: string
  client_id: string
  current_score: number
  max_score: number
  score_category: 'cold' | 'warm' | 'hot' | 'qualified'
  last_activity_date: string
  last_score_change: string
}

export interface LeadActivity {
  client_id: string
  activity_type: string
  activity_data?: any
  source?: string
  user_id?: string
}

/**
 * Lead Scoring Service for managing lead lifecycle automation
 */
export class LeadScoringService {
  private static initialized = new Set<string>()

  /**
   * Ensures a client has lead scoring enabled and initialized
   * This is the entry point for all lead scoring operations
   */
  static async ensureLeadScoring(userId: string, clientId: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      // Initialize user's scoring system if not already done
      await this.initializeUserScoringSystem(userId)

      // Check if lead score exists
      const { data: existingScore, error: checkError } = await supabase
        .from('lead_scores')
        .select('id, current_score')
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking lead score:', checkError)
        return false
      }

      // If lead score doesn't exist, create it
      if (!existingScore) {
        await this.createInitialLeadScore(userId, clientId)
      }

      return true
    } catch (error) {
      console.error('Error ensuring lead scoring:', error)
      return false
    }
  }

  /**
   * Creates an initial lead score for a new client
   */
  private static async createInitialLeadScore(userId: string, clientId: string): Promise<LeadScoreEntry | null> {
    try {
      const supabase = await createClient()

      // Get client information to determine initial score
      const { data: client } = await supabase
        .from('clients')
        .select('status, email, phone, company')
        .eq('id', clientId)
        .eq('user_id', userId)
        .single()

      if (!client) {
        console.error('Client not found for lead score creation:', clientId)
        return null
      }

      // Calculate initial score based on available data
      let initialScore = 10 // Base score
      let category: LeadScoreEntry['score_category'] = 'cold'

      // Add points for complete contact information
      if (client.email) initialScore += 5
      if (client.phone) initialScore += 5
      if (client.company) initialScore += 5

      // Adjust based on client status
      switch (client.status) {
        case 'In Contract':
          initialScore += 20
          category = 'hot'
          break
        case 'Seller':
          initialScore += 10
          category = 'warm'
          break
        case 'Buyer':
          initialScore += 5
          category = 'warm'
          break
        default:
          category = 'cold'
      }

      // Determine final category based on score
      if (initialScore >= 60) category = 'qualified'
      else if (initialScore >= 40) category = 'hot'
      else if (initialScore >= 20) category = 'warm'
      else category = 'cold'

      const leadScoreData: Omit<LeadScoreEntry, 'id'> = {
        user_id: userId,
        client_id: clientId,
        current_score: initialScore,
        max_score: 100,
        score_category: category,
        last_activity_date: new Date().toISOString(),
        last_score_change: new Date().toISOString()
      }

      const { data: leadScore, error } = await supabase
        .from('lead_scores')
        .insert(leadScoreData)
        .select()
        .single()

      if (error) {
        console.error('Error creating lead score:', error)
        return null
      }

      return leadScore
    } catch (error) {
      console.error('Error in createInitialLeadScore:', error)
      return null
    }
  }

  /**
   * Initializes the scoring system for a user (rules, segments, etc.)
   */
  private static async initializeUserScoringSystem(userId: string): Promise<void> {
    // Only initialize once per session to avoid unnecessary database calls
    if (this.initialized.has(userId)) {
      return
    }

    try {
      await Promise.allSettled([
        initializeDefaultScoringRules(userId),
        initializeDefaultLeadSegments(userId)
      ])

      this.initialized.add(userId)
    } catch (error) {
      console.warn('User scoring system initialization failed:', error)
      // Don't mark as initialized if it failed
    }
  }

  /**
   * Records a lead activity and ensures lead scoring is enabled
   */
  static async recordActivityWithScoring(userId: string, activity: LeadActivity): Promise<boolean> {
    try {
      // Ensure lead scoring is enabled for this client
      const scoringEnabled = await this.ensureLeadScoring(userId, activity.client_id)
      if (!scoringEnabled) {
        console.warn('Lead scoring not available, activity not recorded:', activity)
        return false
      }

      // Record the activity
      const result = await recordLeadActivity({
        ...activity,
        user_id: userId
      })

      return result.success
    } catch (error) {
      console.error('Error recording activity with scoring:', error)
      return false
    }
  }

  /**
   * Gets the current lead score for a client
   */
  static async getLeadScore(userId: string, clientId: string): Promise<LeadScoreEntry | null> {
    try {
      const supabase = await createClient()

      const { data: leadScore, error } = await supabase
        .from('lead_scores')
        .select('*')
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching lead score:', error)
        return null
      }

      return leadScore
    } catch (error) {
      console.error('Error in getLeadScore:', error)
      return null
    }
  }

  /**
   * Gets lead scoring statistics for dashboard
   */
  static async getLeadScoringStats(userId: string): Promise<{
    total_leads: number
    qualified: number
    hot: number
    warm: number
    cold: number
    average_score: number
  }> {
    try {
      const supabase = await createClient()

      const { data: stats, error } = await supabase
        .from('lead_scores')
        .select('score_category, current_score')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching lead scoring stats:', error)
        return {
          total_leads: 0,
          qualified: 0,
          hot: 0,
          warm: 0,
          cold: 0,
          average_score: 0
        }
      }

      if (!stats || stats.length === 0) {
        return {
          total_leads: 0,
          qualified: 0,
          hot: 0,
          warm: 0,
          cold: 0,
          average_score: 0
        }
      }

      return {
        total_leads: stats.length,
        qualified: stats.filter(s => s.score_category === 'qualified').length,
        hot: stats.filter(s => s.score_category === 'hot').length,
        warm: stats.filter(s => s.score_category === 'warm').length,
        cold: stats.filter(s => s.score_category === 'cold').length,
        average_score: Math.round(stats.reduce((sum, s) => sum + s.current_score, 0) / stats.length)
      }
    } catch (error) {
      console.error('Error in getLeadScoringStats:', error)
      return {
        total_leads: 0,
        qualified: 0,
        hot: 0,
        warm: 0,
        cold: 0,
        average_score: 0
      }
    }
  }

  /**
   * Updates a client's lead score category based on current score
   */
  static async updateScoreCategory(userId: string, clientId: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data: leadScore } = await supabase
        .from('lead_scores')
        .select('current_score')
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .single()

      if (!leadScore) return false

      let newCategory: LeadScoreEntry['score_category'] = 'cold'
      if (leadScore.current_score >= 80) newCategory = 'qualified'
      else if (leadScore.current_score >= 60) newCategory = 'hot'
      else if (leadScore.current_score >= 30) newCategory = 'warm'
      else newCategory = 'cold'

      const { error } = await supabase
        .from('lead_scores')
        .update({
          score_category: newCategory,
          last_score_change: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('client_id', clientId)

      return !error
    } catch (error) {
      console.error('Error updating score category:', error)
      return false
    }
  }
}

// Convenience functions for common operations
export const ensureLeadScoring = LeadScoringService.ensureLeadScoring
export const recordActivityWithScoring = LeadScoringService.recordActivityWithScoring
export const getLeadScore = LeadScoringService.getLeadScore
export const getLeadScoringStats = LeadScoringService.getLeadScoringStats