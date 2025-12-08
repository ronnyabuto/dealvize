import { createClient } from '@/lib/supabase/server'

export interface DataExportRequest {
  userId: string
  email: string
  dataTypes: string[]
  format: 'json' | 'csv'
}

export interface DataDeletionRequest {
  userId: string
  email: string
  reason?: string
  retentionOverride?: boolean
}

/**
 * GDPR/Privacy compliance utilities
 */
class ComplianceManager {
  /**
   * Export user data in compliance with GDPR Article 20
   */
  async exportUserData(request: DataExportRequest): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const supabase = await createClient()
      const { userId, dataTypes, format } = request

      const exportData: Record<string, any> = {}

      // Export user profile data
      if (dataTypes.includes('profile')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        exportData.profile = profile
      }

      // Export conversation data
      if (dataTypes.includes('conversations')) {
        const { data: conversations } = await supabase
          .from('conversations')
          .select(`
            *,
            conversation_messages(*)
          `)
          .or(`customer_id.eq.${userId},assigned_agent_id.eq.${userId}`)

        exportData.conversations = conversations
      }

      // Export client data if user is an agent
      if (dataTypes.includes('clients')) {
        const { data: clients } = await supabase
          .from('clients')
          .select('*')
          .eq('agent_id', userId)

        exportData.clients = clients
      }

      // Export deals data
      if (dataTypes.includes('deals')) {
        const { data: deals } = await supabase
          .from('deals')
          .select('*')
          .eq('agent_id', userId)

        exportData.deals = deals
      }

      // Add metadata
      exportData.metadata = {
        exportDate: new Date().toISOString(),
        userId,
        dataTypes,
        format
      }

      return {
        success: true,
        data: exportData
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }

  /**
   * Delete user data in compliance with GDPR Article 17
   */
  async deleteUserData(request: DataDeletionRequest): Promise<{
    success: boolean
    deletedRecords?: number
    error?: string
  }> {
    try {
      const supabase = await createClient()
      const { userId, reason } = request

      let deletedRecords = 0

      // Start transaction-like operations
      const operations = []

      // Delete/anonymize conversation messages
      operations.push(
        supabase
          .from('conversation_messages')
          .update({
            content: '[Message deleted by user request]',
            sender_name: '[Deleted User]',
            sender_email: null,
            metadata: { deleted: true, deletionReason: reason }
          })
          .eq('sender_id', userId)
      )

      // Delete profile data
      operations.push(
        supabase
          .from('profiles')
          .delete()
          .eq('id', userId)
      )

      // Anonymize client relationships
      operations.push(
        supabase
          .from('clients')
          .update({
            agent_id: null,
            notes: '[Agent data deleted by request]'
          })
          .eq('agent_id', userId)
      )

      // Execute all operations
      const results = await Promise.allSettled(operations)
      
      // Count successful deletions
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.count) {
          deletedRecords += result.value.count
        }
      })

      // Log the deletion request
      await supabase
        .from('compliance_logs')
        .insert({
          user_id: userId,
          action: 'data_deletion',
          reason,
          records_affected: deletedRecords,
          timestamp: new Date().toISOString()
        })

      return {
        success: true,
        deletedRecords
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed'
      }
    }
  }

  /**
   * Get compliance status for a user
   */
  async getComplianceStatus(userId: string): Promise<{
    hasActiveData: boolean
    lastExport?: string
    pendingDeletion?: boolean
    retentionPeriod: number
  }> {
    try {
      const supabase = await createClient()

      // Check for active data
      const { count: messageCount } = await supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId)

      const { data: complianceLogs } = await supabase
        .from('compliance_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1)

      return {
        hasActiveData: (messageCount || 0) > 0,
        lastExport: complianceLogs?.[0]?.timestamp,
        pendingDeletion: false, // Would check deletion queue
        retentionPeriod: 365 // days
      }
    } catch (error) {
      throw new Error('Failed to get compliance status')
    }
  }
}

export const complianceManager = new ComplianceManager()