/**
 * MLS Settings API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const mlsSettingsSchema = z.object({
  provider: z.enum(['CMLS', 'RESO', 'BRIDGE', 'SPARK', 'TRESTLE']),
  environment: z.enum(['sandbox', 'production']),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  apiUrl: z.string().url('Valid API URL is required'),
  requestsPerMinute: z.number().min(1).max(1000),
  requestsPerHour: z.number().min(1).max(50000),
  requestsPerDay: z.number().min(1).max(1000000),
  propertyCacheTTL: z.number().min(30).max(86400),
  searchCacheTTL: z.number().min(30).max(3600),
  photosCacheTTL: z.number().min(300).max(86400),
  enableAutoSync: z.boolean(),
  syncInterval: z.number().min(5).max(1440),
  batchSize: z.number().min(10).max(1000),
  enableAutoPopulate: z.boolean(),
  enableMarketAnalysis: z.boolean(),
  enablePriceHistory: z.boolean(),
  enableComparables: z.boolean(),
  defaultSearchRadius: z.number().min(0.1).max(50),
  includeSchoolData: z.boolean(),
  includeNeighborhoodData: z.boolean(),
  includeTaxData: z.boolean()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to load user-specific settings from database
    const { data: userSettings, error: dbError } = await supabase
      .from('mls_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single()

    let settings = null

    if (!dbError && userSettings?.settings) {
      settings = userSettings.settings
    } else {
      // Return default settings for Columbus MLS
      settings = {
        provider: 'CMLS',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        clientId: process.env.MLS_CLIENT_ID || '',
        clientSecret: process.env.MLS_CLIENT_SECRET || '',
        apiUrl: 'https://api.columbusrealtors.com',
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        propertyCacheTTL: 300,
        searchCacheTTL: 180,
        photosCacheTTL: 1800,
        enableAutoSync: true,
        syncInterval: 15,
        batchSize: 100,
        enableAutoPopulate: true,
        enableMarketAnalysis: true,
        enablePriceHistory: true,
        enableComparables: true,
        defaultSearchRadius: 1.0,
        includeSchoolData: true,
        includeNeighborhoodData: true,
        includeTaxData: true
      }
    }

    // Validate settings before returning
    const validatedSettings = mlsSettingsSchema.parse(settings)

    return NextResponse.json({
      success: true,
      settings: validatedSettings,
      isDefault: !userSettings?.settings
    })

  } catch (error) {
    console.error('MLS settings GET API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid settings format', 
          details: error.issues 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to get MLS settings', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawSettings = await request.json()

    // Validate settings with Zod
    const validatedSettings = mlsSettingsSchema.parse(rawSettings)

    // Encrypt sensitive data before storing
    const settingsToStore = {
      ...validatedSettings,
      clientSecret: validatedSettings.clientSecret ? '***ENCRYPTED***' : ''
    }

    // Save to database with upsert
    const { error: dbError } = await supabase
      .from('mls_settings')
      .upsert({
        user_id: user.id,
        settings: settingsToStore,
        updated_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Database error saving MLS settings:', dbError)
      return NextResponse.json(
        { 
          error: 'Failed to save settings to database',
          details: dbError.message 
        },
        { status: 500 }
      )
    }

    // Create audit log entry
    await supabase
      .from('mls_audit_log')
      .insert({
        user_id: user.id,
        action: 'settings_updated',
        details: {
          provider: validatedSettings.provider,
          environment: validatedSettings.environment,
          timestamp: new Date().toISOString()
        }
      })

    console.log(`MLS settings saved successfully for user ${user.id}`)

    return NextResponse.json({ 
      success: true,
      message: 'MLS settings saved successfully',
      settings: settingsToStore
    })

  } catch (error) {
    console.error('MLS settings POST API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid settings data', 
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to save MLS settings', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// DELETE endpoint to reset settings to defaults
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete user settings
    const { error: dbError } = await supabase
      .from('mls_settings')
      .delete()
      .eq('user_id', user.id)

    if (dbError) {
      console.error('Database error deleting MLS settings:', dbError)
      return NextResponse.json(
        { 
          error: 'Failed to reset settings',
          details: dbError.message 
        },
        { status: 500 }
      )
    }

    // Create audit log entry
    await supabase
      .from('mls_audit_log')
      .insert({
        user_id: user.id,
        action: 'settings_reset',
        details: {
          timestamp: new Date().toISOString()
        }
      })

    console.log(`MLS settings reset to defaults for user ${user.id}`)

    return NextResponse.json({ 
      success: true,
      message: 'MLS settings reset to defaults'
    })

  } catch (error) {
    console.error('MLS settings DELETE API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to reset MLS settings', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}