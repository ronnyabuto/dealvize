import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'
import { createClient } from '@/lib/supabase/server'
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const body = await request.json()
    const { to, message, clientId } = body

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json({ error: 'Phone number and message are required' }, { status: 400 })
    }

    // Check if Twilio is configured
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return NextResponse.json({ 
        error: 'SMS service not configured. Please contact your administrator.' 
      }, { status: 503 })
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(to.replace(/[\s-()]/g, ''))) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken)

    const formattedPhone = to.startsWith('+') ? to : `+${to.replace(/[\s-()]/g, '')}`

    try {
      // Send SMS via Twilio
      const messageResponse = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: formattedPhone
      })

      // Log the SMS in the database
      const { data: smsLog, error: logError } = await supabase
        .from('sms_logs')
        .insert({
          user_id: user.id,
          client_id: clientId || null,
          to_number: formattedPhone,
          message_content: message,
          twilio_message_id: messageResponse.sid,
          status: messageResponse.status,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (logError) {
        console.error('Failed to log SMS:', logError)
        // Don't fail the request if logging fails
      }

      // Update client's last contact date if clientId is provided
      if (clientId) {
        await supabase
          .from('clients')
          .update({ 
            last_contact: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId)
          .eq('user_id', user.id)
      }

      return NextResponse.json({
        success: true,
        messageId: messageResponse.sid,
        status: messageResponse.status
      })

    } catch (twilioError: any) {
      console.error('Twilio error:', twilioError)
      
      // Handle specific Twilio errors
      let errorMessage = 'Failed to send SMS'
      if (twilioError.code === 21211) {
        errorMessage = 'Invalid phone number'
      } else if (twilioError.code === 21408) {
        errorMessage = 'Cannot reach this phone number'  
      } else if (twilioError.code === 21614) {
        errorMessage = 'Invalid phone number format'
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

  } catch (error) {
    console.error('SMS send error:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}