import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long').trim(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long').trim(),
  email: z.string().email('Invalid email address').toLowerCase(),
  phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{7,20}$/, 'Please enter a valid phone number'),
  licenseNumber: z.string().max(50, 'License number too long').optional().or(z.literal(''))
})

const createProfileSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.string().optional(),
  phone: z.string().optional(),
  license_number: z.string().optional()
})

function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const nameParts = fullName?.trim().split(/\s+/) || []
  const firstName = nameParts[0] || ''
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
  return { firstName, lastName }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile from the users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Parse name safely
    const { firstName, lastName } = parseFullName(profile.name)

    return NextResponse.json({
      id: profile.id,
      firstName,
      lastName,
      email: profile.email,
      phone: profile.phone || '',
      licenseNumber: profile.license_number || ''
    })
  } catch (error) {
    console.error('Error in GET /api/user/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use service role client for user profile creation to bypass RLS
    const serviceClient = createServiceClient()
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = createProfileSchema.parse(body)

    // Validate that the user_id is a proper UUID
    if (!validatedData.user_id || validatedData.user_id.length !== 36) {
      return NextResponse.json({ 
        error: 'Invalid user ID format', 
        details: 'User ID must be a valid UUID' 
      }, { status: 400 })
    }

    // Check if profile already exists
    const { data: existingProfile } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', validatedData.user_id)
      .single()

    if (existingProfile) {
      return NextResponse.json({ message: 'Profile already exists' }, { status: 200 })
    }

    // Create user profile using service role to bypass RLS
    const { data: profile, error } = await serviceClient
      .from('users')
      .insert({
        id: validatedData.user_id,
        name: validatedData.name,
        email: validatedData.email,
        role: validatedData.role || 'Agent',
        phone: validatedData.phone,
        license_number: validatedData.license_number
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      
      // Provide more specific error messages
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'User profile already exists', 
          details: 'A profile with this email already exists' 
        }, { status: 409 })
      }
      
      if (error.code === '23502') {
        return NextResponse.json({ 
          error: 'Missing required data', 
          details: error.message 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create profile', 
        details: error.message 
      }, { status: 500 })
    }

    // Also create commission settings using service role
    const { error: commissionError } = await serviceClient
      .from('commission_settings')
      .insert({
        user_id: validatedData.user_id,
        default_percentage: 2.5
      })

    if (commissionError && commissionError.code !== '23505') {
      console.warn('Commission settings creation failed:', commissionError)
      // Don't fail the request if commission settings fail, just log it
    }

    // Initialize user preferences
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: validatedData.user_id,
          preferences: {
            theme: 'system',
            language: 'en',
            timezone: 'America/New_York',
            emailNotifications: {
              newDeals: true,
              taskReminders: true,
              systemUpdates: true,
              marketingEmails: false,
              weeklyDigest: true
            }
          }
        }, { onConflict: 'user_id' })
    } catch (prefError) {
      console.warn('User preferences initialization failed:', prefError)
    }

    return NextResponse.json({
      message: 'Profile created successfully',
      profile: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }, { status: 400 })
    }
    
    console.error('Error in POST /api/user/profile:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message || 'Unknown error occurred' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // Construct full name safely
    const fullName = `${validatedData.firstName} ${validatedData.lastName}`.trim()

    // Check for email conflicts with other users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .neq('id', user.id)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'Email already in use', 
        details: 'Another user is already using this email address' 
      }, { status: 409 })
    }

    // Update user profile
    const { data: profile, error } = await supabase
      .from('users')
      .update({
        name: fullName,
        email: validatedData.email,
        phone: validatedData.phone,
        license_number: validatedData.licenseNumber || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      
      // Handle specific database errors
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'Duplicate data', 
          details: 'This email or license number is already in use' 
        }, { status: 409 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to update profile',
        details: error.message
      }, { status: 500 })
    }

    // Parse name for response
    const { firstName, lastName } = parseFullName(profile.name)

    return NextResponse.json({
      id: profile.id,
      firstName,
      lastName,
      email: profile.email,
      phone: profile.phone || '',
      licenseNumber: profile.license_number || '',
      message: 'Profile updated successfully'
    })
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
    
    console.error('Error in PUT /api/user/profile:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}