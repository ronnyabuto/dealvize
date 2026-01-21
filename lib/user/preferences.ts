// User preferences and settings management
export interface UserPreferences {
  // Display preferences
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  timeFormat: '12h' | '24h'
  
  // Dashboard preferences
  dashboardLayout: 'grid' | 'list'
  defaultDashboardView: 'deals' | 'clients' | 'tasks' | 'analytics'
  showWelcomeMessage: boolean
  compactMode: boolean
  
  // Notification preferences
  emailNotifications: {
    newDeals: boolean
    taskReminders: boolean
    systemUpdates: boolean
    marketingEmails: boolean
    weeklyDigest: boolean
  }
  
  inAppNotifications: {
    newMessages: boolean
    taskDeadlines: boolean
    dealUpdates: boolean
    systemAlerts: boolean
  }
  
  pushNotifications: {
    enabled: boolean
    urgentOnly: boolean
    quietHours: {
      enabled: boolean
      startTime: string
      endTime: string
    }
  }
  
  // Business preferences
  defaultCurrency: string
  businessHours: {
    monday: { start: string; end: string; enabled: boolean }
    tuesday: { start: string; end: string; enabled: boolean }
    wednesday: { start: string; end: string; enabled: boolean }
    thursday: { start: string; end: string; enabled: boolean }
    friday: { start: string; end: string; enabled: boolean }
    saturday: { start: string; end: string; enabled: boolean }
    sunday: { start: string; end: string; enabled: boolean }
  }
  
  // Commission settings
  defaultCommissionRate: number
  commissionStructure: 'flat' | 'tiered' | 'progressive'
  
  // Privacy preferences
  analyticsEnabled: boolean
  dataSharingEnabled: boolean
  profileVisibility: 'public' | 'team' | 'private'
  
  // Advanced preferences
  autoSave: boolean
  autoSaveInterval: number // minutes
  confirmDeletions: boolean
  showAdvancedFeatures: boolean
  betaFeatures: boolean
}

export const defaultUserPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  
  dashboardLayout: 'grid',
  defaultDashboardView: 'deals',
  showWelcomeMessage: true,
  compactMode: false,
  
  emailNotifications: {
    newDeals: true,
    taskReminders: true,
    systemUpdates: true,
    marketingEmails: false,
    weeklyDigest: true,
  },
  
  inAppNotifications: {
    newMessages: true,
    taskDeadlines: true,
    dealUpdates: true,
    systemAlerts: true,
  },
  
  pushNotifications: {
    enabled: false,
    urgentOnly: false,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
    },
  },
  
  defaultCurrency: 'USD',
  businessHours: {
    monday: { start: '09:00', end: '17:00', enabled: true },
    tuesday: { start: '09:00', end: '17:00', enabled: true },
    wednesday: { start: '09:00', end: '17:00', enabled: true },
    thursday: { start: '09:00', end: '17:00', enabled: true },
    friday: { start: '09:00', end: '17:00', enabled: true },
    saturday: { start: '09:00', end: '17:00', enabled: false },
    sunday: { start: '09:00', end: '17:00', enabled: false },
  },
  
  defaultCommissionRate: 3.0, // 3%
  commissionStructure: 'flat',
  
  analyticsEnabled: true,
  dataSharingEnabled: false,
  profileVisibility: 'team',
  
  autoSave: true,
  autoSaveInterval: 5,
  confirmDeletions: true,
  showAdvancedFeatures: false,
  betaFeatures: false,
}

export class UserPreferencesManager {
  private userId: string
  private preferences: UserPreferences

  constructor(userId: string, preferences?: Partial<UserPreferences>) {
    this.userId = userId
    this.preferences = { ...defaultUserPreferences, ...preferences }
  }

  // Get all preferences
  getPreferences(): UserPreferences {
    return { ...this.preferences }
  }

  // Get specific preference
  getPreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
    return this.preferences[key]
  }

  // Update preferences
  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates }
    await this.savePreferences()
  }

  // Update specific preference
  async updatePreference<K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ): Promise<void> {
    this.preferences[key] = value
    await this.savePreferences()
  }

  // Reset to defaults
  async resetPreferences(): Promise<void> {
    this.preferences = { ...defaultUserPreferences }
    await this.savePreferences()
  }

  // Reset specific section
  async resetPreferenceSection(section: keyof UserPreferences): Promise<void> {
    (this.preferences as any)[section] = defaultUserPreferences[section]
    await this.savePreferences()
  }

  // Save preferences to database/storage
  private async savePreferences(): Promise<void> {
    try {
      // In a real implementation, save to database
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          preferences: this.preferences,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      // Also store in localStorage for quick access
      localStorage.setItem(
        `user-preferences-${this.userId}`,
        JSON.stringify(this.preferences)
      )

    } catch (error) {
      console.error('Failed to save user preferences:', error)
      throw error
    }
  }

  // Load preferences from storage
  static async loadPreferences(userId: string): Promise<UserPreferencesManager> {
    try {
      // Try to load from localStorage first for quick access
      const stored = localStorage.getItem(`user-preferences-${userId}`)
      if (stored) {
        const preferences = JSON.parse(stored)
        return new UserPreferencesManager(userId, preferences)
      }

      // Load from API
      const response = await fetch(`/api/user/preferences?userId=${userId}`)
      if (response.ok) {
        const result = await response.json()
        return new UserPreferencesManager(userId, result.preferences)
      }

      // Return defaults if not found
      return new UserPreferencesManager(userId)

    } catch (error) {
      console.error('Failed to load user preferences:', error)
      return new UserPreferencesManager(userId)
    }
  }

  // Export preferences
  exportPreferences(): string {
    return JSON.stringify(this.preferences, null, 2)
  }

  // Import preferences
  async importPreferences(preferencesJson: string): Promise<void> {
    try {
      const imported = JSON.parse(preferencesJson) as Partial<UserPreferences>
      
      // Validate the imported preferences
      const validatedPreferences = this.validatePreferences(imported)
      
      await this.updatePreferences(validatedPreferences)
    } catch (error) {
      throw new Error('Invalid preferences format')
    }
  }

  // Validate preferences structure
  private validatePreferences(preferences: any): Partial<UserPreferences> {
    const validated: Partial<UserPreferences> = {}

    // Basic type checking and validation
    if (preferences.theme && ['light', 'dark', 'system'].includes(preferences.theme)) {
      validated.theme = preferences.theme
    }

    if (preferences.language && typeof preferences.language === 'string') {
      validated.language = preferences.language
    }

    if (preferences.timezone && typeof preferences.timezone === 'string') {
      validated.timezone = preferences.timezone
    }

    // Add more validation as needed for other preferences
    // For brevity, only showing a few examples

    return validated
  }

  // Check if user is in quiet hours
  isInQuietHours(): boolean {
    if (!this.preferences.pushNotifications.quietHours.enabled) {
      return false
    }

    const now = new Date()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    
    const startTime = parseInt(this.preferences.pushNotifications.quietHours.startTime.replace(':', ''))
    const endTime = parseInt(this.preferences.pushNotifications.quietHours.endTime.replace(':', ''))

    if (startTime > endTime) {
      // Quiet hours cross midnight
      return currentTime >= startTime || currentTime <= endTime
    } else {
      // Quiet hours within same day
      return currentTime >= startTime && currentTime <= endTime
    }
  }

  // Check if current time is within business hours
  isBusinessHours(): boolean {
    const now = new Date()
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()] as keyof UserPreferences['businessHours']
    
    const businessDay = this.preferences.businessHours[dayOfWeek]
    
    if (!businessDay.enabled) {
      return false
    }

    const currentTime = now.getHours() * 100 + now.getMinutes()
    const startTime = parseInt(businessDay.start.replace(':', ''))
    const endTime = parseInt(businessDay.end.replace(':', ''))

    return currentTime >= startTime && currentTime <= endTime
  }

  // Get formatted date based on user preference
  formatDate(date: Date): string {
    const { dateFormat } = this.preferences

    switch (dateFormat) {
      case 'DD/MM/YYYY':
        return date.toLocaleDateString('en-GB')
      case 'YYYY-MM-DD':
        return date.toISOString().split('T')[0]
      case 'MM/DD/YYYY':
      default:
        return date.toLocaleDateString('en-US')
    }
  }

  // Get formatted time based on user preference
  formatTime(date: Date): string {
    const { timeFormat } = this.preferences
    
    return timeFormat === '24h' 
      ? date.toLocaleTimeString('en-GB', { hour12: false })
      : date.toLocaleTimeString('en-US', { hour12: true })
  }
}