/**
 * Commission Settings Validation Schemas
 * Zod validation for commission rates, broker splits, and related settings
 */

import { z } from 'zod'

// Commission structure types
export const CommissionStructureEnum = z.enum(['flat', 'tiered', 'progressive'], {
  errorMap: () => ({ message: 'Commission structure must be flat, tiered, or progressive' })
})

// Custom rates schema for tiered/progressive structures
export const CustomRatesSchema = z.record(
  z.string().min(1, 'Rate name is required'),
  z.number()
    .min(0, 'Rate must be 0% or greater')
    .max(100, 'Rate cannot exceed 100%')
).optional()

// Main commission settings schema
export const CommissionSettingsSchema = z.object({
  defaultCommissionRate: z.number()
    .min(0, 'Commission rate must be 0% or greater')
    .max(100, 'Commission rate cannot exceed 100%')
    .multipleOf(0.01, 'Commission rate must be to 2 decimal places'),
  
  brokerSplitPercentage: z.number()
    .min(0, 'Broker split must be 0% or greater')
    .max(100, 'Broker split cannot exceed 100%')
    .multipleOf(0.01, 'Broker split must be to 2 decimal places'),
  
  commissionStructure: CommissionStructureEnum,
  
  customRates: CustomRatesSchema,
  
  currency: z.string()
    .length(3, 'Currency must be 3-letter ISO code')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase ISO code (e.g., USD)')
    .default('USD'),
  
  effectiveDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  
  notes: z.string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .or(z.literal(''))
})

// Schema for updating commission settings (all fields optional except validation requirements)
export const UpdateCommissionSettingsSchema = CommissionSettingsSchema.partial()

// Schema for commission calculation requests
export const CommissionCalculationSchema = z.object({
  commissionAmount: z.number()
    .positive('Commission amount must be positive')
    .multipleOf(0.01, 'Commission amount must be to 2 decimal places'),
  
  userId: z.string().uuid('Invalid user ID'),
  
  tenantId: z.string().uuid('Invalid tenant ID').optional(),
  
  dealValue: z.number()
    .positive('Deal value must be positive')
    .multipleOf(0.01, 'Deal value must be to 2 decimal places')
    .optional()
})

// Response schema for commission calculations
export const CommissionSplitSchema = z.object({
  agentAmount: z.number(),
  brokerAmount: z.number(),
  splitPercentage: z.number(),
  totalCommission: z.number(),
  effectiveRate: z.number().optional()
})

// Tiered commission rates schema
export const TieredRatesSchema = z.array(z.object({
  threshold: z.number().min(0, 'Threshold must be 0 or greater'),
  rate: z.number()
    .min(0, 'Rate must be 0% or greater')
    .max(100, 'Rate cannot exceed 100%'),
  label: z.string().min(1, 'Rate label is required')
})).refine(
  (rates) => {
    // Ensure thresholds are in ascending order
    for (let i = 1; i < rates.length; i++) {
      if (rates[i].threshold <= rates[i - 1].threshold) {
        return false
      }
    }
    return true
  },
  { message: 'Tiered rates must have ascending thresholds' }
)

// Progressive commission rates schema  
export const ProgressiveRatesSchema = z.array(z.object({
  minAmount: z.number().min(0, 'Minimum amount must be 0 or greater'),
  maxAmount: z.number().positive('Maximum amount must be positive').optional(),
  rate: z.number()
    .min(0, 'Rate must be 0% or greater')
    .max(100, 'Rate cannot exceed 100%'),
  label: z.string().min(1, 'Rate label is required')
})).refine(
  (rates) => {
    // Validate that ranges don't overlap and are in order
    for (let i = 0; i < rates.length; i++) {
      const current = rates[i]
      if (current.maxAmount && current.maxAmount <= current.minAmount) {
        return false
      }
      if (i > 0) {
        const previous = rates[i - 1]
        if (previous.maxAmount && current.minAmount < previous.maxAmount) {
          return false
        }
      }
    }
    return true
  },
  { message: 'Progressive rates cannot have overlapping ranges' }
)

// Type exports
export type CommissionSettings = z.infer<typeof CommissionSettingsSchema>
export type UpdateCommissionSettings = z.infer<typeof UpdateCommissionSettingsSchema>
export type CommissionCalculation = z.infer<typeof CommissionCalculationSchema>
export type CommissionSplit = z.infer<typeof CommissionSplitSchema>
export type TieredRates = z.infer<typeof TieredRatesSchema>
export type ProgressiveRates = z.infer<typeof ProgressiveRatesSchema>
export type CommissionStructure = z.infer<typeof CommissionStructureEnum>

// Validation helper functions
export const validateCommissionRate = (rate: number): boolean => {
  return rate >= 0 && rate <= 100
}

export const validateBrokerSplit = (split: number): boolean => {
  return split >= 0 && split <= 100
}

export const validateCurrency = (currency: string): boolean => {
  return /^[A-Z]{3}$/.test(currency)
}

// Default commission settings
export const DEFAULT_COMMISSION_SETTINGS: CommissionSettings = {
  defaultCommissionRate: 3.00,
  brokerSplitPercentage: 50.00,
  commissionStructure: 'flat',
  customRates: {},
  currency: 'USD'
}

// Common currency options
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' }
] as const

// Commission structure options for UI
export const COMMISSION_STRUCTURE_OPTIONS = [
  {
    value: 'flat' as const,
    label: 'Flat Rate',
    description: 'Single commission rate for all deals'
  },
  {
    value: 'tiered' as const,
    label: 'Tiered',
    description: 'Different rates based on deal value tiers'
  },
  {
    value: 'progressive' as const,
    label: 'Progressive',
    description: 'Increasing rates for higher deal values'
  }
] as const