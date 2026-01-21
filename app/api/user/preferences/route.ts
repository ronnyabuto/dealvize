import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/session'
import { UserPreferences, defaultUserPreferences } from '@/lib/user/preferences'

// GET /api/user/preferences - Get user preferences
export async function GET(request: NextRequest) {
  try {
    const sessionValidation = await validateSession(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const userId = sessionValidation.sessionInfo?.userId
    const url = new URL(request.url)
    const requestedUserId = url.searchParams.get('userId')

    // Users can only access their own preferences unless they're admin
    if (requestedUserId && requestedUserId !== userId && (sessionValidation.sessionInfo as any)?.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access to user preferences'
      }, { status: 403 })
    }

    const targetUserId = requestedUserId || userId

    // In a real application, fetch from database
    const preferences = await getUserPreferences(targetUserId!)
    
    return NextResponse.json({
      success: true,
      preferences,
      userId: targetUserId,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Get preferences error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get user preferences',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

// PUT /api/user/preferences - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    const sessionValidation = await validateSession(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const userId = sessionValidation.sessionInfo?.userId
    const { preferences, userId: requestedUserId } = await request.json()

    // Users can only update their own preferences unless they're admin
    if (requestedUserId && requestedUserId !== userId && (sessionValidation.sessionInfo as any)?.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access to user preferences'
      }, { status: 403 })
    }

    const targetUserId = requestedUserId || userId

    // Validate preferences structure
    const validatedPreferences = validatePreferences(preferences)
    
    // Save preferences
    await saveUserPreferences(targetUserId!, validatedPreferences)

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: validatedPreferences,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Update preferences error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user preferences',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

// POST /api/user/preferences/reset - Reset preferences to defaults
export async function POST(request: NextRequest) {
  try {
    const sessionValidation = await validateSession(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const userId = sessionValidation.sessionInfo?.userId
    const { section } = await request.json()

    let resetPreferences: Partial<UserPreferences>

    if (section) {
      // Reset specific section
      resetPreferences = {
        [section]: defaultUserPreferences[section as keyof UserPreferences]
      }
    } else {
      // Reset all preferences
      resetPreferences = defaultUserPreferences
    }

    await saveUserPreferences(userId!, resetPreferences)

    return NextResponse.json({
      success: true,
      message: section ? `${section} preferences reset to defaults` : 'All preferences reset to defaults',
      preferences: resetPreferences,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Reset preferences error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to reset preferences',
      timestamp: Date.now()
    }, { status: 500 })
  }
}

// Helper functions

async function getUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Fetch user preferences from database
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Database error fetching preferences:', error)
      return defaultUserPreferences
    }

    // If no preferences found, return defaults
    if (!data || !data.preferences) {
      return defaultUserPreferences
    }

    // Merge stored preferences with defaults to ensure all properties exist
    return { ...defaultUserPreferences, ...data.preferences }

  } catch (error) {
    console.error('Failed to get user preferences from database:', error)
    return defaultUserPreferences
  }
}

async function saveUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Get current preferences to merge with new ones
    const { data: currentData } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .single()

    const currentPreferences = currentData?.preferences || {}
    const mergedPreferences = { ...currentPreferences, ...preferences }

    // Upsert preferences to database
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        preferences: mergedPreferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Database error saving preferences:', error)
      throw new Error(`Failed to save preferences: ${error.message}`)
    }

    console.log(`Successfully saved preferences for user ${userId}:`, {
      preferencesKeys: Object.keys(preferences),
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Failed to save user preferences to database:', error)
    throw new Error('Database save failed')
  }
}

function validatePreferences(preferences: any): Partial<UserPreferences> {
  const validated: Partial<UserPreferences> = {}

  // Theme validation
  if (preferences.theme && ['light', 'dark', 'system'].includes(preferences.theme)) {
    validated.theme = preferences.theme
  }

  // Language validation
  if (preferences.language && typeof preferences.language === 'string') {
    validated.language = preferences.language
  }

  // Timezone validation
  if (preferences.timezone && typeof preferences.timezone === 'string') {
    validated.timezone = preferences.timezone
  }

  // Date format validation
  if (preferences.dateFormat && ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(preferences.dateFormat)) {
    validated.dateFormat = preferences.dateFormat
  }

  // Time format validation
  if (preferences.timeFormat && ['12h', '24h'].includes(preferences.timeFormat)) {
    validated.timeFormat = preferences.timeFormat
  }

  // Dashboard preferences
  if (preferences.dashboardLayout && ['grid', 'list'].includes(preferences.dashboardLayout)) {
    validated.dashboardLayout = preferences.dashboardLayout
  }

  if (preferences.defaultDashboardView && ['deals', 'clients', 'tasks', 'analytics'].includes(preferences.defaultDashboardView)) {
    validated.defaultDashboardView = preferences.defaultDashboardView
  }

  if (typeof preferences.showWelcomeMessage === 'boolean') {
    validated.showWelcomeMessage = preferences.showWelcomeMessage
  }

  if (typeof preferences.compactMode === 'boolean') {
    validated.compactMode = preferences.compactMode
  }

  // Email notifications
  if (preferences.emailNotifications && typeof preferences.emailNotifications === 'object') {
    validated.emailNotifications = {} as any
    const emailNotifs = preferences.emailNotifications
    
    if (typeof emailNotifs.newDeals === 'boolean') {
      validated.emailNotifications!.newDeals = emailNotifs.newDeals
    }
    if (typeof emailNotifs.taskReminders === 'boolean') {
      validated.emailNotifications!.taskReminders = emailNotifs.taskReminders
    }
    if (typeof emailNotifs.systemUpdates === 'boolean') {
      validated.emailNotifications!.systemUpdates = emailNotifs.systemUpdates
    }
    if (typeof emailNotifs.marketingEmails === 'boolean') {
      validated.emailNotifications!.marketingEmails = emailNotifs.marketingEmails
    }
    if (typeof emailNotifs.weeklyDigest === 'boolean') {
      validated.emailNotifications!.weeklyDigest = emailNotifs.weeklyDigest
    }
  }

  // In-app notifications
  if (preferences.inAppNotifications && typeof preferences.inAppNotifications === 'object') {
    validated.inAppNotifications = {} as any
    const inAppNotifs = preferences.inAppNotifications

    if (typeof inAppNotifs.newMessages === 'boolean') {
      validated.inAppNotifications!.newMessages = inAppNotifs.newMessages
    }
    if (typeof inAppNotifs.taskDeadlines === 'boolean') {
      validated.inAppNotifications!.taskDeadlines = inAppNotifs.taskDeadlines
    }
    if (typeof inAppNotifs.dealUpdates === 'boolean') {
      validated.inAppNotifications!.dealUpdates = inAppNotifs.dealUpdates
    }
    if (typeof inAppNotifs.systemAlerts === 'boolean') {
      validated.inAppNotifications!.systemAlerts = inAppNotifs.systemAlerts
    }
  }

  // Currency validation
  if (preferences.defaultCurrency && typeof preferences.defaultCurrency === 'string') {
    validated.defaultCurrency = preferences.defaultCurrency
  }

  // Commission settings
  if (typeof preferences.defaultCommissionRate === 'number' && preferences.defaultCommissionRate >= 0) {
    validated.defaultCommissionRate = preferences.defaultCommissionRate
  }

  if (preferences.commissionStructure && ['flat', 'tiered', 'progressive'].includes(preferences.commissionStructure)) {
    validated.commissionStructure = preferences.commissionStructure
  }

  // Privacy preferences
  if (typeof preferences.analyticsEnabled === 'boolean') {
    validated.analyticsEnabled = preferences.analyticsEnabled
  }

  if (typeof preferences.dataSharingEnabled === 'boolean') {
    validated.dataSharingEnabled = preferences.dataSharingEnabled
  }

  if (preferences.profileVisibility && ['public', 'team', 'private'].includes(preferences.profileVisibility)) {
    validated.profileVisibility = preferences.profileVisibility
  }

  // Advanced preferences
  if (typeof preferences.autoSave === 'boolean') {
    validated.autoSave = preferences.autoSave
  }

  if (typeof preferences.autoSaveInterval === 'number' && preferences.autoSaveInterval > 0) {
    validated.autoSaveInterval = preferences.autoSaveInterval
  }

  if (typeof preferences.confirmDeletions === 'boolean') {
    validated.confirmDeletions = preferences.confirmDeletions
  }

  if (typeof preferences.showAdvancedFeatures === 'boolean') {
    validated.showAdvancedFeatures = preferences.showAdvancedFeatures
  }

  if (typeof preferences.betaFeatures === 'boolean') {
    validated.betaFeatures = preferences.betaFeatures
  }

  return validated
}