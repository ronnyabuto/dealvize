// Testing Mode Overrides - Senior Engineer Approach
// Clean way to bypass restrictions during testing phase

import { featureFlags } from '@/lib/config/feature-flags'

// Override subscription status for testing
export function getEffectiveSubscriptionStatus(actualStatus?: string): 'active' | 'trialing' | 'canceled' | 'incomplete' {
  if (featureFlags.enableFreeTesting) {
    return 'active' // Everyone has active subscription during testing
  }
  return (actualStatus as any) || 'canceled'
}

// Override plan type for testing  
export function getEffectivePlan(actualPlan?: string): 'free' | 'pro' | 'enterprise' {
  if (featureFlags.enableFreeTesting) {
    return 'enterprise' // Everyone gets enterprise features during testing
  }
  return (actualPlan as any) || 'free'
}

// Override usage limits for testing
export function getEffectiveUsageLimits(actualLimits?: any) {
  if (featureFlags.enableFreeTesting) {
    return {
      deals: Infinity,
      clients: Infinity,
      tasks: Infinity,
      storage: Infinity,
      apiCalls: Infinity,
      teamMembers: Infinity,
    }
  }
  return actualLimits || {
    deals: 10,
    clients: 25,
    tasks: 50,
    storage: 100, // MB
    apiCalls: 1000,
    teamMembers: 1,
  }
}

// Check if feature should be available
export function isFeatureEnabled(feature: string, userPlan?: string): boolean {
  if (featureFlags.enableFreeTesting) {
    return true // All features enabled during testing
  }
  
  // Production feature gating logic
  const enterpriseFeatures = ['advanced-analytics', 'custom-integrations', 'white-label', 'api-access']
  const proFeatures = ['automation', 'advanced-reports', 'team-collaboration', 'priority-support']
  
  if (enterpriseFeatures.includes(feature)) {
    return userPlan === 'enterprise'
  }
  
  if (proFeatures.includes(feature)) {
    return userPlan === 'pro' || userPlan === 'enterprise'
  }
  
  return true // Basic features available to all
}

// Mock user data for testing
export function getTestingUserData(actualUser?: any) {
  if (featureFlags.enableFreeTesting && actualUser) {
    return {
      ...actualUser,
      subscription: {
        status: 'active',
        plan: 'enterprise',
        trial_end: null,
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      }
    }
  }
  return actualUser
}