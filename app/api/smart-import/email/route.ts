import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EmailParser } from '@/lib/smart-import/email-parser'
import { z } from 'zod'

const parseEmailSchema = z.object({
  emailContent: z.string().min(10, 'Email content is required'),
  emailMetadata: z.object({
    subject: z.string().optional(),
    sender: z.string().optional(),
    timestamp: z.string().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = parseEmailSchema.parse(body)

    const { emailContent, emailMetadata } = validatedData

    try {
      // Process email content
      const result = EmailParser.parsePropertyEmail(emailContent, emailMetadata as any)

      // Log the import attempt
      const { error: logError } = await supabase
        .from('import_logs')
        .insert({
          user_id: user.id,
          import_type: 'email',
          status: result.success ? 'success' : 'failed',
          source_data: {
            subject: emailMetadata?.subject,
            sender: emailMetadata?.sender,
            timestamp: emailMetadata?.timestamp,
            content_length: emailContent.length
          },
          extracted_data: result.data || null,
          errors: result.errors || null,
          confidence_score: result.confidence
        })

      if (logError) {
        console.warn('Failed to log import attempt:', logError)
      }

      // Check if email is from known real estate platform
      const isFromPlatform = emailMetadata?.sender ? 
        EmailParser.isFromRealEstatePlatform(emailMetadata.sender) : false

      // Try to extract multiple listings if confidence is low for single property
      let multipleListings: any[] = []
      if (!result.success && emailContent.length > 1000) {
        multipleListings = EmailParser.parseMultipleListings(emailContent)
      }

      return NextResponse.json({
        success: result.success,
        data: result.data,
        errors: result.errors,
        warnings: result.warnings,
        confidence: result.confidence,
        rawEmail: result.rawEmail,
        isFromRealEstatePlatform: isFromPlatform,
        multipleListings: multipleListings.length > 0 ? multipleListings : undefined
      })

    } catch (processingError) {
      console.error('Email processing error:', processingError)
      
      // Log failed processing
      const { error: logError } = await supabase
        .from('import_logs')
        .insert({
          user_id: user.id,
          import_type: 'email',
          status: 'failed',
          source_data: {
            subject: emailMetadata?.subject,
            sender: emailMetadata?.sender,
            timestamp: emailMetadata?.timestamp,
            content_length: emailContent.length
          },
          errors: [processingError instanceof Error ? processingError.message : 'Processing failed']
        })

      if (logError) {
        console.warn('Failed to log import attempt:', logError)
      }

      return NextResponse.json({
        success: false,
        errors: ['Failed to process email content'],
        confidence: 0
      }, { status: 500 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Error in POST /api/smart-import/email:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // success, failed, all

    let query = supabase
      .from('import_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('import_type', 'email')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: imports, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching email import history:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch import history' 
      }, { status: 500 })
    }

    // Get statistics
    const { data: stats } = await supabase
      .from('import_logs')
      .select('status')
      .eq('user_id', user.id)
      .eq('import_type', 'email')

    const statistics = {
      total: stats?.length || 0,
      successful: stats?.filter(s => s.status === 'success').length || 0,
      failed: stats?.filter(s => s.status === 'failed').length || 0
    }

    return NextResponse.json({
      imports: imports || [],
      statistics,
      pagination: {
        limit,
        offset,
        total: imports?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in GET /api/smart-import/email:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}