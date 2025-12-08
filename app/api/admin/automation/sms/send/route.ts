/**
 * Admin SMS Sending API
 * Twilio-powered SMS delivery with comprehensive logging
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { withRBAC } from '@/lib/rbac/middleware'
import { z } from 'zod'

const SendSmsSchema = z.object({
  to: z.string().min(1, 'Recipient phone number is required'),
  message: z.string().min(1, 'Message is required').max(1600, 'Message too long'),
  template_id: z.string().optional(),
  client_id: z.string().optional(),
  user_id: z.string().optional(),
  scheduled_at: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
})

// POST - Send SMS message
export async function POST(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()

    try {
      const body = await request.json()
      const validatedData = SendSmsSchema.parse(body)

      // Validate phone number format
      const phoneNumber = normalizePhoneNumber(validatedData.to)
      if (!isValidPhoneNumber(phoneNumber)) {
        return NextResponse.json({
          error: 'Invalid phone number format'
        }, { status: 400 })
      }

      // Check if scheduled or immediate send
      if (validatedData.scheduled_at) {
        const scheduledTime = new Date(validatedData.scheduled_at)
        if (scheduledTime <= new Date()) {
          return NextResponse.json({
            error: 'Scheduled time must be in the future'
          }, { status: 400 })
        }

        // Store scheduled SMS
        const { data: scheduledSms, error } = await serviceClient
          .from('scheduled_sms')
          .insert({
            user_id: validatedData.user_id || context.userId,
            client_id: validatedData.client_id,
            template_id: validatedData.template_id,
            to_phone: phoneNumber,
            message: validatedData.message,
            scheduled_at: scheduledTime.toISOString(),
            status: 'scheduled',
            metadata: validatedData.metadata || {}
          })
          .select()
          .single()

        if (error) throw error

        return NextResponse.json({
          message: 'SMS scheduled successfully',
          scheduled_sms: scheduledSms
        }, { status: 201 })
      }

      // Send SMS immediately
      const smsResult = await sendSmsWithTwilio({
        to: phoneNumber,
        message: validatedData.message,
        metadata: validatedData.metadata
      })

      // Log the SMS in the database
      const messageData = {
        user_id: validatedData.user_id || context.userId,
        client_id: validatedData.client_id || null,
        template_id: validatedData.template_id || null,
        direction: 'outbound',
        message_type: 'sms',
        content: validatedData.message,
        recipient_phone: phoneNumber,
        status: smsResult.success ? 'sent' : 'failed',
        provider: 'twilio',
        provider_message_id: smsResult.sid,
        metadata: {
          ...validatedData.metadata,
          error: smsResult.error || null,
          cost: smsResult.cost || null
        },
        sent_at: new Date().toISOString()
      }

      const { data: loggedMessage, error: logError } = await serviceClient
        .from('messages')
        .insert(messageData)
        .select()
        .single()

      if (logError) {
        console.error('Failed to log SMS:', logError)
      }

      // Update client's last contact if client_id provided
      if (validatedData.client_id) {
        await serviceClient
          .from('clients')
          .update({
            last_contact: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', validatedData.client_id)
      }

      // Log activity
      await serviceClient
        .from('tenant_activity_logs')
        .insert({
          user_id: context.userId,
          action: 'sms.sent',
          entity_type: 'sms_message',
          entity_id: loggedMessage?.id,
          metadata: {
            to: phoneNumber,
            success: smsResult.success,
            provider: 'twilio',
            sent_by: 'admin'
          }
        })

      if (smsResult.success) {
        return NextResponse.json({
          success: true,
          message_id: smsResult.sid,
          status: 'sent',
          cost: smsResult.cost
        })
      } else {
        return NextResponse.json({
          success: false,
          error: smsResult.error,
          status: 'failed'
        }, { status: 400 })
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          error: 'Validation error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }, { status: 400 })
      }

      console.error('Error sending SMS:', error)
      return NextResponse.json(
        { error: 'Failed to send SMS' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'manage',
    requireTenant: false
  })
}

// GET - Get SMS delivery status and analytics
export async function GET(request: NextRequest) {
  return withRBAC(request, async (req, context) => {
    const serviceClient = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const timeRange = searchParams.get('range') || '7d'
    const user_id = searchParams.get('user_id')
    const status = searchParams.get('status')

    try {
      const now = new Date()
      let startDate = new Date()

      switch (timeRange) {
        case '24h':
          startDate.setDate(now.getDate() - 1)
          break
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
        default:
          startDate.setDate(now.getDate() - 7)
      }

      let query = serviceClient
        .from('messages')
        .select(`
          id,
          user_id,
          client_id,
          status,
          sent_at,
          metadata,
          recipient_phone,
          content,
          profiles(first_name, last_name, email)
        `)
        .eq('message_type', 'sms')
        .gte('sent_at', startDate.toISOString())

      if (user_id) query = query.eq('user_id', user_id)
      if (status) query = query.eq('status', status)

      const { data: messages, error } = await query
        .order('sent_at', { ascending: false })
        .limit(100)

      if (error) throw error

      // Calculate analytics
      const totalMessages = messages?.length || 0
      const sentMessages = messages?.filter(m => m.status === 'sent').length || 0
      const deliveredMessages = messages?.filter(m => m.status === 'delivered').length || 0
      const failedMessages = messages?.filter(m => m.status === 'failed').length || 0

      const analytics = {
        total_messages: totalMessages,
        sent_messages: sentMessages,
        delivered_messages: deliveredMessages,
        failed_messages: failedMessages,
        delivery_rate: totalMessages > 0 ? Math.round((deliveredMessages / totalMessages) * 100) : 0,
        failure_rate: totalMessages > 0 ? Math.round((failedMessages / totalMessages) * 100) : 0,
        total_cost: messages?.reduce((sum, msg) => {
          const cost = msg.metadata?.cost || 0
          return sum + (typeof cost === 'number' ? cost : 0)
        }, 0) || 0
      }

      // Daily breakdown
      const dailyBreakdown = []
      for (let i = Math.min(6, Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))); i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayMessages = messages?.filter(m => m.sent_at.startsWith(dateStr)) || []
        const dayDelivered = dayMessages.filter(m => m.status === 'delivered').length
        const dayFailed = dayMessages.filter(m => m.status === 'failed').length

        dailyBreakdown.push({
          date: dateStr,
          total: dayMessages.length,
          delivered: dayDelivered,
          failed: dayFailed,
          delivery_rate: dayMessages.length > 0 ? Math.round((dayDelivered / dayMessages.length) * 100) : 0
        })
      }

      return NextResponse.json({
        analytics,
        daily_breakdown: dailyBreakdown,
        recent_messages: messages?.slice(0, 20) || [],
        time_range: timeRange
      })

    } catch (error) {
      console.error('Error fetching SMS analytics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch SMS analytics' },
        { status: 500 }
      )
    }
  }, {
    resource: 'automation',
    action: 'view',
    requireTenant: false
  })
}

// Helper function to send SMS with Twilio
async function sendSmsWithTwilio(smsData: { to: string; message: string; metadata?: any }) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return {
        success: false,
        error: 'Twilio credentials not configured'
      }
    }

    const twilio = require('twilio')
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

    const message = await client.messages.create({
      body: smsData.message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: smsData.to,
      statusCallback: process.env.TWILIO_WEBHOOK_URL // Optional webhook for delivery status
    })

    console.log('SMS sent successfully:', {
      sid: message.sid,
      to: smsData.to,
      status: message.status
    })

    return {
      success: true,
      sid: message.sid,
      status: message.status,
      cost: message.price ? parseFloat(message.price) : null
    }

  } catch (error: any) {
    console.error('Twilio SMS error:', error)
    
    let errorMessage = 'Failed to send SMS'
    if (error.code === 21211) {
      errorMessage = 'Invalid phone number'
    } else if (error.code === 21614) {
      errorMessage = 'Invalid sender phone number'
    } else if (error.code === 21408) {
      errorMessage = 'Phone number cannot receive SMS'
    }

    return {
      success: false,
      error: errorMessage,
      twilio_error: error.message
    }
  }
}

// Helper function to normalize phone number
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Add country code if missing (assuming US +1)
  if (digits.length === 10) {
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  
  // Return as-is if it already looks international
  return digits.length > 10 ? `+${digits}` : phone
}

// Helper function to validate phone number
function isValidPhoneNumber(phone: string): boolean {
  // Basic validation for international phone numbers
  const phoneRegex = /^\+\d{10,15}$/
  return phoneRegex.test(phone)
}