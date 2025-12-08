// Feature Flags - Senior Engineer Approach
// Environment-driven configuration for easy testing/production toggles

export const featureFlags = {
  // Testing Mode: Give all users full access without payment
  enableFreeTesting: 
    process.env.NEXT_PUBLIC_ENABLE_FREE_TESTING === 'true' || 
    process.env.ENABLE_FREE_TESTING === 'true',
  
  // Future flags can be added here
  enableBetaFeatures: process.env.ENABLE_BETA_FEATURES === 'true',
  enableAdvancedAnalytics: process.env.ENABLE_ADVANCED_ANALYTICS === 'true',
} as const

// Helper function to check if user should have full access
export function hasFullAccess(userPlan?: string): boolean {
  // During testing phase, everyone gets full access
  if (featureFlags.enableFreeTesting) {
    return true
  }
  
  // Production logic: check actual plan
  return userPlan === 'pro' || userPlan === 'enterprise'
}

// Helper function to bypass payment requirements
export function requiresPayment(): boolean {
  return !featureFlags.enableFreeTesting
}