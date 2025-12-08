import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/utils'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.FROM_EMAIL || 'noreply@dealvize.com'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    
    const body = await request.json()
    const { to, subject, message, clientId, templateId } = body

    // Validate required fields
    if (!to || !subject || !message) {
      return NextResponse.json({ 
        error: 'Recipient email, subject, and message are required' 
      }, { status: 400 })
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ 
        error: 'Email service not configured. Please contact your administrator.' 
      }, { status: 503 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Get user info for reply-to
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single()

    const senderName = userProfile 
      ? `${userProfile.first_name} ${userProfile.last_name}`.trim()
      : user.user_metadata?.name || 'Agent'

    const replyTo = userProfile?.email || user.email

    try {
      // Send email via Resend
      const emailResponse = await resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [to],
        subject: subject,
        text: message,
        html: message.replace(/\n/g, '<br>'),
        replyTo: replyTo
      })

      // Log the email in the database
      const { data: emailLog, error: logError } = await supabase
        .from('email_logs')
        .insert({
          user_id: user.id,
          client_id: clientId || null,
          template_id: templateId || null,
          to_email: to,
          subject: subject,
          message_content: message,
          resend_message_id: emailResponse.data?.id,
          status: 'sent',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (logError) {
        console.error('Failed to log email:', logError)
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

      // Update template usage if templateId is provided
      if (templateId) {
        await supabase
          .from('email_templates')
          .update({
            usage_count: supabase.sql`usage_count + 1`,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', templateId)
      }

      return NextResponse.json({
        success: true,
        messageId: emailResponse.data?.id,
        status: 'sent'
      })

    } catch (resendError: any) {
      console.error('Resend error:', resendError)
      
      // Handle specific Resend errors
      let errorMessage = 'Failed to send email'
      if (resendError.message?.includes('Invalid email')) {
        errorMessage = 'Invalid email address'
      } else if (resendError.message?.includes('rate limit')) {
        errorMessage = 'Email rate limit exceeded. Please try again later.'
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
}