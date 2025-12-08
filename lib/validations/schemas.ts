import { z } from 'zod'

// Base schemas
export const idSchema = z.string().uuid('Invalid ID format')
export const emailSchema = z.string().email('Invalid email format')
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format').optional().or(z.literal(''))
export const urlSchema = z.string().url('Invalid URL format').optional().or(z.literal(''))

// Client schemas
export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: emailSchema.optional().or(z.literal('')),
  phone: phoneSchema,
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  company: z.string().max(100, 'Company name too long').optional().or(z.literal('')),
  status: z.enum(['Buyer', 'Seller', 'In Contract']).default('Buyer')
})

export const updateClientSchema = createClientSchema.partial().extend({
  id: idSchema
})

export const clientQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().max(100).optional(),
  status: z.enum(['Buyer', 'Seller', 'In Contract']).optional()
})

// Deal schemas
export const createDealSchema = z.object({
  client_id: idSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  value: z.coerce.number().min(0, 'Value must be positive').optional(),
  status: z.enum(['Lead', 'In Progress', 'Under Contract', 'Closed', 'Lost']).default('Lead'),
  probability: z.coerce.number().min(0).max(100, 'Probability must be 0-100').optional(),
  expected_close_date: z.string().datetime().optional().or(z.literal('')),
  commission: z.coerce.number().min(0, 'Commission must be positive').optional(),
  property_address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  property_type: z.string().max(50, 'Property type too long').optional().or(z.literal('')),
  property_bedrooms: z.coerce.number().min(0).max(50).optional(),
  property_bathrooms: z.coerce.number().min(0).max(50).optional(),
  property_sqft: z.coerce.number().min(0).max(1000000).optional()
})

export const updateDealSchema = createDealSchema.partial().extend({
  id: idSchema
})

export const dealQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().max(100).optional(),
  status: z.enum(['Lead', 'In Progress', 'Under Contract', 'Closed', 'Lost']).optional(),
  client_id: idSchema.optional()
})

// Task schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional().or(z.literal('')),
  due_date: z.string().datetime('Invalid date format'),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
  type: z.enum(['Call', 'Email', 'Meeting', 'Document', 'Follow-up', 'Other']).default('Other'),
  client_id: idSchema.optional(),
  deal_id: idSchema.optional()
})

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: idSchema
})

export const taskQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().max(100).optional(),
  status: z.enum(['Pending', 'In Progress', 'Completed']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  client_id: idSchema.optional(),
  deal_id: idSchema.optional()
})

// Note schemas
export const createNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000, 'Note too long'),
  type: z.enum(['note', 'call', 'meeting', 'email']).default('note'),
  client_id: idSchema.optional(),
  deal_id: idSchema.optional(),
  task_id: idSchema.optional()
})

export const updateNoteSchema = createNoteSchema.partial().extend({
  id: idSchema
})

// Commission settings schema
export const commissionSettingsSchema = z.object({
  default_percentage: z.coerce.number().min(0).max(100, 'Percentage must be 0-100')
})

// Export types for TypeScript
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type ClientQueryInput = z.infer<typeof clientQuerySchema>

export type CreateDealInput = z.infer<typeof createDealSchema>
export type UpdateDealInput = z.infer<typeof updateDealSchema>
export type DealQueryInput = z.infer<typeof dealQuerySchema>

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type TaskQueryInput = z.infer<typeof taskQuerySchema>

export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>

export type CommissionSettingsInput = z.infer<typeof commissionSettingsSchema>