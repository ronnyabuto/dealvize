import { z } from "zod"

// Client validation schema
export const clientSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Name can only contain letters, spaces, hyphens, apostrophes, and periods"),
  
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number")
    .transform((val) => val.replace(/[^\d+]/g, '')),
  
  address: z.string()
    .min(1, "Address is required")
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be less than 500 characters"),
  
  company: z.string()
    .optional()
    .transform((val) => val?.trim() || ""),
  
  status: z.enum(["Buyer", "Seller", "In Contract"], {
    required_error: "Please select a status"
  }),
  
  dealValue: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true
      const num = parseFloat(val.replace(/[^\d.]/g, ''))
      return !isNaN(num) && num >= 0
    }, "Deal value must be a valid positive number")
    .transform((val) => val?.replace(/[^\d.]/g, '') || "0")
})

// Deal validation schema
export const dealSchema = z.object({
  title: z.string()
    .min(1, "Deal title is required")
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters"),
  
  clientId: z.string()
    .min(1, "Client selection is required"),
  
  value: z.string()
    .min(1, "Deal value is required")
    .refine((val) => {
      const num = parseFloat(val.replace(/[^\d.]/g, ''))
      return !isNaN(num) && num > 0
    }, "Deal value must be a positive number")
    .transform((val) => val.replace(/[^\d.]/g, '')),
  
  status: z.enum(["Lead", "In Progress", "Under Contract", "Closed", "Lost"], {
    required_error: "Please select a status"
  }),
  
  probability: z.number()
    .min(0, "Probability must be at least 0%")
    .max(100, "Probability cannot exceed 100%"),
  
  expectedCloseDate: z.string()
    .min(1, "Expected close date is required")
    .refine((val) => {
      const date = new Date(val)
      return date instanceof Date && !isNaN(date.getTime())
    }, "Please enter a valid date"),
  
  commissionPercentage: z.number()
    .min(0, "Commission percentage must be at least 0%")
    .max(50, "Commission percentage cannot exceed 50%")
    .optional(),
  
  property: z.object({
    address: z.string()
      .min(1, "Property address is required")
      .min(5, "Address must be at least 5 characters")
      .max(500, "Address must be less than 500 characters"),
    
    type: z.string()
      .min(1, "Property type is required"),
    
    bedrooms: z.number()
      .min(0, "Bedrooms must be 0 or more")
      .max(20, "Bedrooms cannot exceed 20")
      .optional(),
    
    bathrooms: z.number()
      .min(0, "Bathrooms must be 0 or more")
      .max(20, "Bathrooms cannot exceed 20")
      .optional(),
    
    sqft: z.number()
      .min(0, "Square footage must be 0 or more")
      .max(100000, "Square footage cannot exceed 100,000")
      .optional()
  })
})

// Task validation schema
export const taskSchema = z.object({
  title: z.string()
    .min(1, "Task title is required")
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters"),
  
  description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  
  dueDate: z.string()
    .min(1, "Due date is required")
    .refine((val) => {
      const date = new Date(val)
      return date instanceof Date && !isNaN(date.getTime())
    }, "Please enter a valid date"),
  
  priority: z.enum(["Low", "Medium", "High"], {
    required_error: "Please select a priority"
  }),
  
  type: z.enum(["Call", "Email", "Meeting", "Document", "Follow-up", "Other"], {
    required_error: "Please select a task type"
  }),
  
  clientId: z.string().optional(),
  dealId: z.string().optional()
})

// Settings validation schemas
export const userProfileSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "First name can only contain letters, spaces, hyphens, apostrophes, and periods"),
  
  lastName: z.string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters")
    .regex(/^[a-zA-Z\s\-'\.]+$/, "Last name can only contain letters, spaces, hyphens, apostrophes, and periods"),
  
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"),
  
  licenseNumber: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true
      return val.length >= 5 && val.length <= 20
    }, "License number must be between 5 and 20 characters")
})

export const userPreferencesSchema = z.object({
  timezone: z.string().min(1, "Please select a timezone"),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
  timeFormat: z.enum(["12h", "24h"]),
  language: z.string().min(1, "Please select a language"),
  currency: z.string().min(1, "Please select a currency"),
  theme: z.enum(["light", "dark", "system"])
})

export const commissionSettingsSchema = z.object({
  defaultCommission: z.number()
    .min(0, "Commission rate must be at least 0%")
    .max(50, "Commission rate cannot exceed 50%"),
  
  brokerSplit: z.number()
    .min(0, "Broker split must be at least 0%")
    .max(100, "Broker split cannot exceed 100%")
})

// Type exports for form data
export type ClientFormData = z.infer<typeof clientSchema>
export type DealFormData = z.infer<typeof dealSchema>
export type TaskFormData = z.infer<typeof taskSchema>
export type UserProfileFormData = z.infer<typeof userProfileSchema>
export type UserPreferencesFormData = z.infer<typeof userPreferencesSchema>
export type CommissionSettingsFormData = z.infer<typeof commissionSettingsSchema>