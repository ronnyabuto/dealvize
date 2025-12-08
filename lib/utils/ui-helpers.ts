// Shared UI utility functions to reduce code duplication

import { Crown, Star, Award, Target, ArrowUp, ArrowDown, Equal } from 'lucide-react'

// Status color utilities
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-red-500'
    case 'in_progress': return 'bg-yellow-500'
    case 'resolved': 
    case 'confirmed':
    case 'completed': return 'bg-green-500'
    default: return 'bg-gray-500'
  }
}

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200'
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'low': return 'text-green-600 bg-green-50 border-green-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

// Trend utilities
export const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return ArrowUp
    case 'down': return ArrowDown
    default: return Equal
  }
}

export const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodTrend: boolean = true) => {
  if (trend === 'stable') return 'text-gray-500'
  if (trend === 'up') return isGoodTrend ? 'text-green-600' : 'text-red-600'
  return isGoodTrend ? 'text-red-600' : 'text-green-600'
}

// Tier utilities for affiliate system
export const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'platinum': return Crown
    case 'gold': return Star
    case 'silver': return Award
    default: return Target
  }
}

export const getTierColor = (tier: string) => {
  switch (tier) {
    case 'platinum': return 'text-purple-600 bg-purple-100 border-purple-300'
    case 'gold': return 'text-yellow-600 bg-yellow-100 border-yellow-300'
    case 'silver': return 'text-gray-600 bg-gray-100 border-gray-300'
    default: return 'text-amber-600 bg-amber-100 border-amber-300'
  }
}

// Confidence level colors
export const getConfidenceColor = (confidence: string) => {
  switch (confidence) {
    case 'high': return 'bg-green-100 text-green-800 border-green-300'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'low': return 'bg-red-100 text-red-800 border-red-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}