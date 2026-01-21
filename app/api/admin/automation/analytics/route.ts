/**
 * Admin Email Automation Analytics API
 * Provides comprehensive analytics and performance metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'

// GET - Get automation analytics and performance metrics
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const timeRange = searchParams.get('range') || '30d'
    const userId = searchParams.get('user_id')
    const sequenceId = searchParams.get('sequence_id')
    
    const now = new Date()
    let startDate = new Date()

    // Calculate date range
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '12m':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    try {
      // Build base queries with filters
      let sequenceQuery = supabase
        .from('nurturing_sequences')
        .select(`
          id,
          sequence_name,
          user_id,
          created_at,
          is_active
        `)
        .gte('created_at', startDate.toISOString())

      let enrollmentQuery = supabase
        .from('sequence_enrollments')
        .select(`
          id,
          sequence_id,
          user_id,
          status,
          enrolled_at,
          completed_at,
          steps_completed
        `)
        .gte('enrolled_at', startDate.toISOString())

      let messageQuery = supabase
        .from('messages')
        .select(`
          id,
          user_id,
          status,
          sent_at,
          metadata
        `)
        .eq('message_type', 'email')
        .contains('metadata', { automated: true })
        .gte('sent_at', startDate.toISOString())

      // Apply user filter if specified
      if (userId) {
        sequenceQuery = sequenceQuery.eq('user_id', userId)
        enrollmentQuery = enrollmentQuery.eq('user_id', userId)
        messageQuery = messageQuery.eq('user_id', userId)
      }

      // Apply sequence filter if specified
      if (sequenceId) {
        enrollmentQuery = enrollmentQuery.eq('sequence_id', sequenceId)
        messageQuery = messageQuery.contains('metadata', { sequence_id: sequenceId })
      }

      const [
        { data: sequences, error: sequencesError },
        { data: enrollments, error: enrollmentsError },
        { data: messages, error: messagesError }
      ] = await Promise.all([
        sequenceQuery,
        enrollmentQuery,
        messageQuery
      ])

      if (sequencesError) throw sequencesError
      if (enrollmentsError) throw enrollmentsError
      if (messagesError) throw messagesError

      // Calculate overall metrics
      const totalSequences = sequences?.length || 0
      const activeSequences = sequences?.filter(s => s.is_active).length || 0
      const totalEnrollments = enrollments?.length || 0
      const completedEnrollments = enrollments?.filter(e => e.status === 'completed').length || 0
      const activeEnrollments = enrollments?.filter(e => e.status === 'active').length || 0
      
      const totalMessages = messages?.length || 0
      const sentMessages = messages?.filter(m => m.status === 'sent').length || 0
      const failedMessages = messages?.filter(m => m.status === 'failed').length || 0

      const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0
      const deliveryRate = totalMessages > 0 ? Math.round((sentMessages / totalMessages) * 100) : 0

      // Generate daily metrics for chart data
      const dailyMetrics = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayEnrollments = enrollments?.filter(e => 
          e.enrolled_at.startsWith(dateStr)
        ).length || 0
        
        const dayCompletions = enrollments?.filter(e => 
          e.completed_at?.startsWith(dateStr)
        ).length || 0

        const dayMessages = messages?.filter(m => 
          m.sent_at.startsWith(dateStr)
        ).length || 0

        const daySent = messages?.filter(m => 
          m.sent_at.startsWith(dateStr) && m.status === 'sent'
        ).length || 0

        dailyMetrics.push({
          date: dateStr,
          enrollments: dayEnrollments,
          completions: dayCompletions,
          messages_sent: dayMessages,
          successful_deliveries: daySent,
          delivery_rate: dayMessages > 0 ? Math.round((daySent / dayMessages) * 100) : 0
        })
      }

      // Top performing sequences
      const sequencePerformance = await Promise.all(
        (sequences || []).slice(0, 10).map(async (sequence) => {
          const seqEnrollments = enrollments?.filter(e => e.sequence_id === sequence.id) || []
          const seqMessages = messages?.filter(m => 
            m.metadata?.sequence_id?.toString() === sequence.id.toString()
          ) || []

          const seqSent = seqMessages.filter(m => m.status === 'sent').length
          const seqTotal = seqMessages.length
          const seqCompleted = seqEnrollments.filter(e => e.status === 'completed').length
          const seqTotalEnrollments = seqEnrollments.length

          return {
            id: sequence.id,
            name: sequence.sequence_name,
            enrollments: seqTotalEnrollments,
            completions: seqCompleted,
            completion_rate: seqTotalEnrollments > 0 ? Math.round((seqCompleted / seqTotalEnrollments) * 100) : 0,
            messages_sent: seqTotal,
            delivery_rate: seqTotal > 0 ? Math.round((seqSent / seqTotal) * 100) : 0,
            is_active: sequence.is_active
          }
        })
      )

      // User activity breakdown
      const userActivity: any = {}
      enrollments?.forEach(enrollment => {
        if (!userActivity[enrollment.user_id]) {
          userActivity[enrollment.user_id] = {
            enrollments: 0,
            completions: 0,
            messages: 0
          }
        }
        userActivity[enrollment.user_id].enrollments++
        if (enrollment.status === 'completed') {
          userActivity[enrollment.user_id].completions++
        }
      })

      messages?.forEach(message => {
        if (!userActivity[message.user_id]) {
          userActivity[message.user_id] = {
            enrollments: 0,
            completions: 0,
            messages: 0
          }
        }
        userActivity[message.user_id].messages++
      })

      return NextResponse.json({
        overview: {
          total_sequences: totalSequences,
          active_sequences: activeSequences,
          total_enrollments: totalEnrollments,
          completed_enrollments: completedEnrollments,
          active_enrollments: activeEnrollments,
          completion_rate: completionRate,
          total_messages_sent: totalMessages,
          successful_deliveries: sentMessages,
          failed_deliveries: failedMessages,
          delivery_rate: deliveryRate,
          average_steps_per_completion: completedEnrollments > 0 
            ? Math.round(enrollments?.filter(e => e.status === 'completed')
                .reduce((sum, e) => sum + (e.steps_completed || 0), 0) / completedEnrollments)
            : 0
        },
        daily_metrics: dailyMetrics,
        sequence_performance: sequencePerformance.sort((a, b) => b.completion_rate - a.completion_rate),
        user_activity: Object.entries(userActivity).map(([userId, stats]: [string, any]) => ({
          user_id: userId,
          ...stats,
          completion_rate: stats.enrollments > 0 ? Math.round((stats.completions / stats.enrollments) * 100) : 0
        })).sort((a, b) => b.enrollments - a.enrollments).slice(0, 10),
        time_range: timeRange,
        generated_at: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error fetching automation analytics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch automation analytics' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'view',
    requireTenant: false
  })
}