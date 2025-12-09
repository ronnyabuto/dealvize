import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BusinessCardScanner } from '@/lib/smart-import/business-card-scanner'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const image = formData.get('image') as File
    
    if (!image) {
      return NextResponse.json({ 
        error: 'No image provided' 
      }, { status: 400 })
    }

    // Validate file type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({
        error: 'File must be an image'
      }, { status: 400 })
    }

    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        error: 'Image file too large (max 10MB)'
      }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    
    // Determine image format
    const format = image.type.split('/')[1] as 'jpeg' | 'png' | 'webp'
    if (!['jpeg', 'png', 'webp'].includes(format)) {
      return NextResponse.json({
        error: 'Unsupported image format. Please use JPEG, PNG, or WebP'
      }, { status: 400 })
    }

    try {
      // Process business card
      const result = await BusinessCardScanner.processBusinessCard(base64Image, format)

      // Log the import attempt
      const { error: logError } = await supabase
        .from('import_logs')
        .insert({
          user_id: user.id,
          import_type: 'business_card',
          status: result.success ? 'success' : 'failed',
          source_data: {
            filename: image.name,
            size: image.size,
            type: image.type
          },
          extracted_data: result.data || null,
          errors: result.errors || null,
          processing_time: result.processingTime,
          confidence_score: result.confidence
        })

      if (logError) {
        console.warn('Failed to log import attempt:', logError)
      }

      // Return processing result
      return NextResponse.json({
        success: result.success,
        data: result.data,
        errors: result.errors,
        warnings: result.warnings,
        confidence: result.confidence,
        processingTime: result.processingTime,
        ocrText: result.ocrText
      })

    } catch (processingError) {
      console.error('Business card processing error:', processingError)
      
      // Log failed processing
      const { error: logError } = await supabase
        .from('import_logs')
        .insert({
          user_id: user.id,
          import_type: 'business_card',
          status: 'failed',
          source_data: {
            filename: image.name,
            size: image.size,
            type: image.type
          },
          errors: [processingError instanceof Error ? processingError.message : 'Processing failed']
        })

      if (logError) {
        console.warn('Failed to log import attempt:', logError)
      }

      return NextResponse.json({
        success: false,
        errors: ['Failed to process business card image'],
        confidence: 0
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in POST /api/smart-import/business-card:', error)
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

    // Get business card import history
    const { data: imports, error } = await supabase
      .from('import_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('import_type', 'business_card')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching business card import history:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch import history' 
      }, { status: 500 })
    }

    return NextResponse.json({
      imports: imports || [],
      pagination: {
        limit,
        offset,
        total: imports?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in GET /api/smart-import/business-card:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}